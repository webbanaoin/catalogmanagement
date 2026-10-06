import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireCategoryInShop } from "@/server/catalog/guards";
import { generateProductCode } from "@/server/catalog/product-code";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { withProductImagesUrls } from "@/server/media/media-response";
import { requireProductCapacity } from "@/server/subscriptions/access";
import { S3StorageService } from "@/services/storage/s3-storage";
import { productCreateSchema } from "@/validation/catalog";

async function uniqueSlug(shopId: string, name: string) {
  const base = toSlug(name);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.product.findUnique({
      where: { shopId_slug: { shopId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }

  return slug;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") || 24)),
    );
    const q = (url.searchParams.get("q") || "").trim();
    const categoryId = url.searchParams.get("categoryId");
    const catalogGroup = (url.searchParams.get("catalogGroup") || "").trim();
    const availability = url.searchParams.get("availability");
    const visibility = url.searchParams.get("visibility");
    const featured = url.searchParams.get("featured");
    const newArrival = url.searchParams.get("newArrival");
    const offer = url.searchParams.get("offer");
    const deleted = url.searchParams.get("deleted") === "true";

    const where: Prisma.ProductWhereInput = {
      shopId,
      deletedAt: deleted ? { not: null } : null,
      ...(categoryId ? { categoryId } : {}),
      ...(catalogGroup ? { catalogGroup } : {}),
      ...(availability === "IN_STOCK" ||
      availability === "OUT_OF_STOCK" ||
      availability === "ON_REQUEST"
        ? { availabilityStatus: availability }
        : {}),
      ...(visibility === "visible"
        ? { isVisible: true }
        : visibility === "hidden"
          ? { isVisible: false }
          : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(newArrival === "true" ? { isNewArrival: true } : {}),
      ...(offer === "true" ? { isOffer: true } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { sku: { contains: q } }],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          attributes: { orderBy: { displayOrder: "asc" } },
          images: { where: { isPrimary: true }, take: 1 },
          _count: { select: { images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    const hasPrimaryImages = items.some((item) => item.images.length > 0);
    const storage = hasPrimaryImages ? new S3StorageService() : null;

    const itemsWithMedia = await Promise.all(
      items.map(async (item) => {
        const { _count, ...product } = item;
        return {
          ...product,
          imageCount: _count.images,
          images:
            storage && item.images.length > 0
              ? await withProductImagesUrls(item.images, storage)
              : item.images,
        };
      }),
    );

    return NextResponse.json({
      items: itemsWithMedia,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

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

    const input = productCreateSchema.parse(await readJsonBody(request));
    await requireProductCapacity(shopId);

    if (input.categoryId) {
      await requireCategoryInShop(shopId, input.categoryId);
    }

    if (input.sku) {
      const duplicate = await prisma.product.findFirst({
        where: { shopId, sku: input.sku },
      });
      if (duplicate) {
        throw new AppError({
          code: "SKU_CONFLICT",
          message: "Product code already exists in this shop",
          status: 409,
        });
      }
    }

    const { attributes, ...product } = input;
    const existingCodes = await prisma.product.findMany({
      where: { shopId, sku: { not: null } },
      select: { sku: true },
    });
    const usedCodes = new Set(
      existingCodes
        .map((row) => row.sku?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );
    const sku = input.sku?.trim() || generateProductCode(usedCodes);

    const data = await prisma.product.create({
      data: {
        ...product,
        shopId,
        slug: await uniqueSlug(shopId, input.name),
        sku,
        attributes: { create: attributes },
      },
      include: { attributes: true, images: true },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
