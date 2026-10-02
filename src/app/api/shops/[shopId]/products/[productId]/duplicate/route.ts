import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { productDuplicateSchema } from "@/validation/catalog";

async function uniqueSlug(shopId: string, name: string) {
  const base = toSlug(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { shopId_slug: { shopId, slug } }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ shopId: string; productId: string }> },
) {
  try {
    const { shopId, productId } = await context.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireProductInShop(shopId, productId);

    const input = productDuplicateSchema.parse(await readJsonBody(request));
    const source = await prisma.product.findFirst({
      where: { id: productId, shopId, deletedAt: null },
      include: { attributes: { orderBy: { displayOrder: "asc" } } },
    });
    if (!source) {
      throw new AppError({ code: "PRODUCT_NOT_FOUND", message: "Product was not found in this shop", status: 404 });
    }

    const name = input.name ?? `${source.name} Copy`;
    const sku = input.sku?.trim() || null;
    if (sku) {
      const duplicateSku = await prisma.product.findFirst({ where: { shopId, sku } });
      if (duplicateSku) {
        throw new AppError({ code: "SKU_CONFLICT", message: "SKU already exists in this shop", status: 409 });
      }
    }

    const data = await prisma.product.create({
      data: {
        shopId,
        categoryId: source.categoryId,
        name,
        slug: await uniqueSlug(shopId, name),
        sku,
        description: source.description,
        price: source.price,
        discountPrice: source.discountPrice,
        priceType: source.priceType,
        availabilityStatus: source.availabilityStatus,
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isVisible: false,
        attributes: {
          create: source.attributes.map((attribute) => ({
            attributeName: attribute.attributeName,
            attributeValue: attribute.attributeValue,
            displayOrder: attribute.displayOrder,
          })),
        },
      },
      include: { category: true, attributes: true, images: true },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
