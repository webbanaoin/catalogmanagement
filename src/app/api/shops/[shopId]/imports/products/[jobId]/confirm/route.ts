import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { toSlug } from "@/server/catalog/slug";
import { generateProductCode } from "@/server/catalog/product-code";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { enforceRateLimit } from "@/server/security/rate-limit";
import {
  productFingerprint,
  storedProductImportPreviewSchema,
  type StoredImportProduct,
} from "@/server/import/product-import";
import { requireSubscriptionFeature } from "@/server/subscriptions/access";

function nextSlug(baseName: string, usedSlugs: Set<string>): string {
  const base = toSlug(baseName);
  let candidate = base;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}

function inputJsonObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Prisma.JsonValue>;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ shopId: string; jobId: string }> },
) {
  try {
    const { shopId, jobId } = await context.params;

    const { user } = await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    enforceRateLimit(
      `imports:confirm:${shopId}:${user.id}`,
      20,
      15 * 60 * 1000,
    );

    const subscriptionAccess = await requireSubscriptionFeature(
      shopId,
      "excelImportEnabled",
    );

    const job = await prisma.importJob.findFirst({
      where: { id: jobId, shopId },
      select: {
        id: true,
        status: true,
        previewData: true,
        errorSummary: true,
        totalRows: true,
      },
    });

    if (!job) {
      throw new AppError({
        code: "IMPORT_JOB_NOT_FOUND",
        message: "Import job was not found in this shop",
        status: 404,
      });
    }

    if (job.status !== "PREVIEW_READY") {
      throw new AppError({
        code: "IMPORT_NOT_READY",
        message: "This import cannot be confirmed; validate the workbook again",
        status: 409,
      });
    }

    const parsedPreview = storedProductImportPreviewSchema.safeParse(job.previewData);
    if (!parsedPreview.success || parsedPreview.data.products.length === 0) {
      throw new AppError({
        code: "IMPORT_PREVIEW_INVALID",
        message: "Stored import preview is missing or invalid",
        status: 409,
      });
    }

    const products = parsedPreview.data.products;
    const categoryIds = [
      ...new Set(
        products
          .map((product) => product.categoryId)
          .filter((categoryId): categoryId is string => Boolean(categoryId)),
      ),
    ];

    const [activeCategories, existingProducts, slugRows] = await Promise.all([
      categoryIds.length
        ? prisma.shopCategory.findMany({
            where: { shopId, id: { in: categoryIds }, status: "ACTIVE" },
            select: { id: true },
          })
        : Promise.resolve([]),
      prisma.product.findMany({
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
      prisma.product.findMany({
        where: { shopId },
        select: { slug: true },
      }),
    ]);

    const activeCategoryIds = new Set(activeCategories.map((category) => category.id));
    const productLimit = subscriptionAccess.subscription.plan.productLimit;
    const remainingProductSlots = Math.max(0, productLimit - existingProducts.length);
    const usedSlugs = new Set(slugRows.map((row) => row.slug));
    const usedSkus = new Set(
      existingProducts
        .map((product) => product.sku?.trim().toLowerCase())
        .filter((sku): sku is string => Boolean(sku)),
    );
    const existingFingerprints = new Set(
      existingProducts.map((product) =>
        productFingerprint({
          name: product.name,
          categoryId: product.categoryId,
          catalogGroup: product.catalogGroup,
          priceType: product.priceType,
          price: product.price == null ? null : product.price.toString(),
          discountPrice:
            product.discountPrice == null ? null : product.discountPrice.toString(),
        }),
      ),
    );

    const importable: Array<StoredImportProduct & { resolvedSku: string }> = [];
    const skipped: Array<{
      rowNumber: number;
      reason: string;
      message: string;
    }> = [];
    const pendingFingerprints = new Set<string>();

    for (const product of products) {
      if (product.categoryId && !activeCategoryIds.has(product.categoryId)) {
        skipped.push({
          rowNumber: product.rowNumber,
          reason: "CATEGORY_CHANGED",
          message: "Category is no longer active; row was skipped",
        });
        continue;
      }

      if (product.sku) {
        const normalizedSku = product.sku.trim().toLowerCase();
        if (usedSkus.has(normalizedSku)) {
          skipped.push({
            rowNumber: product.rowNumber,
            reason: "SKU_CONFLICT",
            message: `Product code ${product.sku} already exists; row was skipped`,
          });
          continue;
        }
        if (importable.length >= remainingProductSlots) {
          skipped.push({
            rowNumber: product.rowNumber,
            reason: "PRODUCT_LIMIT_REACHED",
            message: `Plan product limit of ${productLimit} reached; row was skipped`,
          });
          continue;
        }

        usedSkus.add(normalizedSku);
        importable.push({ ...product, resolvedSku: product.sku });
        continue;
      }

      const fingerprint = productFingerprint(product);
      if (existingFingerprints.has(fingerprint) || pendingFingerprints.has(fingerprint)) {
        skipped.push({
          rowNumber: product.rowNumber,
          reason: "DUPLICATE_PRODUCT",
          message: "A very similar product already exists; row was skipped",
        });
        continue;
      }

      if (importable.length >= remainingProductSlots) {
        skipped.push({
          rowNumber: product.rowNumber,
          reason: "PRODUCT_LIMIT_REACHED",
          message: `Plan product limit of ${productLimit} reached; row was skipped`,
        });
        continue;
      }

      pendingFingerprints.add(fingerprint);
      importable.push({
        ...product,
        resolvedSku: generateProductCode(usedSkus),
      });
    }

    try {
      const imported = await prisma.$transaction(async (tx) => {
        const created: Array<{
          id: string;
          name: string;
          slug: string;
          sku: string | null;
        }> = [];

        for (const product of importable) {
          const row = await tx.product.create({
            data: {
              shopId,
              categoryId: product.categoryId,
              catalogGroup: product.catalogGroup ?? null,
              name: product.name,
              slug: nextSlug(product.name, usedSlugs),
              sku: product.resolvedSku,
              description: product.description,
              price: product.price,
              discountPrice: product.discountPrice,
              priceType: product.priceType,
              availabilityStatus: product.availabilityStatus,
              showPrice: product.showPrice,
              isVisible: product.isVisible,
              isFeatured: product.isFeatured,
              isNewArrival: product.isNewArrival,
              isOffer: product.isOffer,
              ...(product.attributes.length > 0
                ? {
                    attributes: {
                      create: product.attributes.map((attribute) => ({
                        attributeName: attribute.attributeName,
                        attributeValue: attribute.attributeValue,
                        displayOrder: attribute.displayOrder,
                      })),
                    },
                  }
                : {}),
            },
            select: {
              id: true,
              name: true,
              slug: true,
              sku: true,
            },
          });
          created.push(row);
        }

        const previousSummary = inputJsonObject(job.errorSummary);
        const nextSummary: Prisma.InputJsonObject = {
          ...previousSummary,
          ...(skipped.length > 0 ? { skippedDuringConfirm: skipped } : {}),
        };

        await tx.importJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            successfulRows: created.length,
            failedRows: Math.max(0, job.totalRows - created.length),
            completedAt: new Date(),
            ...(Object.keys(nextSummary).length > 0
              ? { errorSummary: nextSummary }
              : {}),
          },
        });

        return created;
      });

      return NextResponse.json({
        data: {
          jobId: job.id,
          status: "COMPLETED",
          importedCount: imported.length,
          skippedCount: Math.max(0, job.totalRows - imported.length),
          skipped,
          products: imported,
        },
      });
    } catch (error) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({
          code: "IMPORT_CONFLICT",
          message:
            "A product code conflict occurred while importing. Validate the workbook again and retry.",
          status: 409,
        });
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
