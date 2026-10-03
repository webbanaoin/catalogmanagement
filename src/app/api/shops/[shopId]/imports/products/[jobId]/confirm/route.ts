import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { storedProductImportPreviewSchema } from "@/server/import/product-import";

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

export async function POST(
  _request: Request,
  context: { params: Promise<{ shopId: string; jobId: string }> },
) {
  try {
    const { shopId, jobId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    const job = await prisma.importJob.findFirst({
      where: { id: jobId, shopId },
      select: {
        id: true,
        status: true,
        previewData: true,
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
        message: "This import cannot be confirmed; upload and validate the workbook again",
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
    const skus = products
      .map((product) => product.sku)
      .filter((sku): sku is string => Boolean(sku));

    const categoryIds = [
      ...new Set(
        products
          .map((product) => product.categoryId)
          .filter((categoryId): categoryId is string => Boolean(categoryId)),
      ),
    ];

    const [existingSkuRows, activeCategories, slugRows] = await Promise.all([
      skus.length
        ? prisma.product.findMany({
            where: { shopId, sku: { in: skus } },
            select: { sku: true },
          })
        : Promise.resolve([]),
      categoryIds.length
        ? prisma.shopCategory.findMany({
            where: { shopId, id: { in: categoryIds }, status: "ACTIVE" },
            select: { id: true },
          })
        : Promise.resolve([]),
      prisma.product.findMany({
        where: { shopId },
        select: { slug: true },
      }),
    ]);

    if (existingSkuRows.length > 0) {
      throw new AppError({
        code: "IMPORT_CONFLICT",
        message: "One or more SKUs now exist in this shop; create a fresh preview before importing",
        status: 409,
      });
    }

    const activeCategoryIds = new Set(activeCategories.map((category) => category.id));
    const unavailableCategory = categoryIds.find((categoryId) => !activeCategoryIds.has(categoryId));
    if (unavailableCategory) {
      throw new AppError({
        code: "IMPORT_CONFLICT",
        message: "One or more categories changed after preview; create a fresh preview before importing",
        status: 409,
      });
    }

    const usedSlugs = new Set(slugRows.map((row) => row.slug));

    try {
      const imported = await prisma.$transaction(async (tx) => {
        const created: Array<{ id: string; name: string; slug: string; sku: string | null }> = [];

        for (const product of products) {
          const row = await tx.product.create({
            data: {
              shopId,
              categoryId: product.categoryId,
              name: product.name,
              slug: nextSlug(product.name, usedSlugs),
              sku: product.sku,
              description: product.description,
              price: product.price,
              discountPrice: product.discountPrice,
              priceType: product.priceType,
              availabilityStatus: product.availabilityStatus,
              isFeatured: product.isFeatured,
              isNewArrival: product.isNewArrival,
              isOffer: false,
              isVisible: true,
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

        await tx.importJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            successfulRows: created.length,
            failedRows: 0,
            completedAt: new Date(),
          },
        });

        return created;
      });

      return NextResponse.json({
        data: {
          jobId: job.id,
          status: "COMPLETED",
          importedCount: imported.length,
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
          message: "An SKU or product slug conflict occurred; create a fresh preview before importing",
          status: 409,
        });
      }

      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
