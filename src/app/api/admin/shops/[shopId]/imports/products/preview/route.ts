import { NextResponse } from "next/server";

import { getCatalogPreset } from "@/lib/catalog-presets";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import {
  getAdminOnboardingCapacity,
  requireAdminOnboardingShop,
} from "@/server/admin/shop-onboarding";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { previewProductImport } from "@/server/import/product-import";
import {
  parseFirstWorksheet,
  PRODUCT_IMPORT_MAX_FILE_BYTES,
} from "@/server/import/xlsx";
import { enforceRateLimit } from "@/server/security/rate-limit";

const EXCEL_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/zip",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const shop = await requireAdminOnboardingShop(shopId);

    enforceRateLimit(
      `admin:imports:preview:${shopId}:${admin.id}`,
      20,
      15 * 60 * 1000,
    );

    const capacity = await getAdminOnboardingCapacity(shopId);
    if (capacity.remaining <= 0) {
      throw new AppError({
        code: "PRODUCT_LIMIT_REACHED",
        message: `The onboarding plan allows up to ${capacity.limit} active products. Change the shop plan or remove products before importing more.`,
        status: 409,
      });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AppError({
        code: "INVALID_FORM_DATA",
        message: "Upload a valid multipart form with an Excel file",
        status: 400,
      });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError({
        code: "FILE_REQUIRED",
        message: "Excel file is required",
        status: 400,
      });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new AppError({
        code: "INVALID_FILE_TYPE",
        message: "Only .xlsx Excel files are supported",
        status: 400,
      });
    }

    if (file.type && !EXCEL_MIME_TYPES.has(file.type)) {
      throw new AppError({
        code: "INVALID_FILE_TYPE",
        message: "Uploaded file is not a supported Excel workbook",
        status: 400,
      });
    }

    if (file.size <= 0 || file.size > PRODUCT_IMPORT_MAX_FILE_BYTES) {
      throw new AppError({
        code: "INVALID_FILE_SIZE",
        message: "Excel file must be larger than 0 bytes and no more than 5 MiB",
        status: 400,
      });
    }

    const { categories, existingProducts } = await prisma.$transaction(
      async (tx) => {
        if (shop.businessCategory) {
          await ensureDefaultShopCategories(tx, {
            shopId,
            businessCategory: shop.businessCategory,
            actorUserId: admin.id,
          });
        }

        const [categories, existingProducts] = await Promise.all([
          tx.shopCategory.findMany({
            where: { shopId, status: "ACTIVE" },
            select: { id: true, name: true, slug: true },
          }),
          tx.product.findMany({
            where: { shopId, deletedAt: null },
            select: {
              id: true,
              name: true,
              sku: true,
              categoryId: true,
              catalogGroup: true,
              price: true,
              discountPrice: true,
              priceType: true,
            },
          }),
        ]);

        return { categories, existingProducts };
      },
    );

    const workbookRows = parseFirstWorksheet(
      Buffer.from(await file.arrayBuffer()),
    );

    const preview = previewProductImport({
      rows: workbookRows,
      categories,
      catalogPreset: getCatalogPreset(shop.businessCategory),
      existingProducts: existingProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        catalogGroup: product.catalogGroup,
        price: product.price == null ? null : product.price.toString(),
        discountPrice:
          product.discountPrice == null
            ? null
            : product.discountPrice.toString(),
        priceType: product.priceType,
      })),
    });

    const status =
      preview.successfulRows > 0 ? "PREVIEW_READY" : "VALIDATION_FAILED";

    const job = await prisma.importJob.create({
      data: {
        shopId,
        fileName: file.name.slice(0, 255),
        totalRows: preview.totalRows,
        successfulRows: preview.successfulRows,
        failedRows: preview.failedRows,
        status,
        previewData: {
          version: 4,
          products: preview.products,
        },
        ...(preview.failedRows > 0
          ? {
              errorSummary: {
                errors: preview.errors,
                duplicateRows: preview.duplicateRows,
                invalidRows: preview.invalidRows,
              },
            }
          : {}),
      },
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        successfulRows: true,
        failedRows: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        shopId,
        action: "ADMIN_PRODUCT_IMPORT_PREVIEWED",
        entityType: "ImportJob",
        entityId: job.id,
        metadata: {
          fileName: job.fileName,
          totalRows: job.totalRows,
          readyRows: preview.successfulRows,
          duplicateRows: preview.duplicateRows,
          invalidRows: preview.invalidRows,
        },
      },
    });

    return NextResponse.json({
      data: {
        job,
        rows: preview.rows,
        errors: preview.errors,
        summary: {
          readyRows: preview.successfulRows,
          duplicateRows: preview.duplicateRows,
          invalidRows: preview.invalidRows,
          remainingProductSlots: capacity.remaining,
          readyWithinPlan: Math.min(
            preview.successfulRows,
            capacity.remaining,
          ),
          onboardingPlanName: capacity.plan.name,
          productLimit: capacity.limit,
          capacitySource: capacity.capacitySource,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
