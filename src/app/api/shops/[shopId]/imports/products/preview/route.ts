import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { previewProductImport } from "@/server/import/product-import";
import {
  parseFirstWorksheet,
  PRODUCT_IMPORT_MAX_FILE_BYTES,
} from "@/server/import/xlsx";

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
    const { shopId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

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

    const [categories, existingProducts] = await Promise.all([
      prisma.shopCategory.findMany({
        where: { shopId, status: "ACTIVE" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.product.findMany({
        where: { shopId, deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          categoryId: true,
          price: true,
          discountPrice: true,
          priceType: true,
        },
      }),
    ]);

    const workbookRows = parseFirstWorksheet(Buffer.from(await file.arrayBuffer()));

    const preview = previewProductImport({
      rows: workbookRows,
      categories,
      existingProducts: existingProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        price: product.price == null ? null : product.price.toString(),
        discountPrice: product.discountPrice == null ? null : product.discountPrice.toString(),
        priceType: product.priceType,
      })),
    });

    const status = preview.successfulRows > 0 ? "PREVIEW_READY" : "VALIDATION_FAILED";

    const job = await prisma.importJob.create({
      data: {
        shopId,
        fileName: file.name.slice(0, 255),
        totalRows: preview.totalRows,
        successfulRows: preview.successfulRows,
        failedRows: preview.failedRows,
        status,
        previewData: {
          version: 2,
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

    return NextResponse.json({
      data: {
        job,
        rows: preview.rows,
        errors: preview.errors,
        summary: {
          readyRows: preview.successfulRows,
          duplicateRows: preview.duplicateRows,
          invalidRows: preview.invalidRows,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
