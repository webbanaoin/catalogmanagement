import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { assertUniqueCategoryName } from "@/server/catalog/category-name";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { requireCategoryInShop } from "@/server/catalog/guards";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { categoryCreateSchema } from "@/validation/catalog";

async function uniqueSlug(shopId: string, name: string) {
  const base = toSlug(name);
  let slug = base;
  let suffix = 2;

  while (
    await prisma.shopCategory.findUnique({
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
    const { user } = await requireShopAccess(shopId);

    await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: {
          businessCategory: {
            select: { name: true, slug: true },
          },
        },
      });

      if (shop?.businessCategory) {
        await ensureDefaultShopCategories(tx, {
          shopId,
          businessCategory: shop.businessCategory,
          actorUserId: user.id,
        });
      }
    });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") || 50)),
    );
    const status = url.searchParams.get("status");

    const where: Prisma.ShopCategoryWhereInput = {
      shopId,
      ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.shopCategory.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.shopCategory.count({ where }),
    ]);

    return NextResponse.json({
      items,
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
    const input = categoryCreateSchema.parse(await readJsonBody(request));

    if (input.parentId) {
      await requireCategoryInShop(shopId, input.parentId);
    }

    await assertUniqueCategoryName(prisma, {
      shopId,
      name: input.name,
    });

    const data = await prisma.shopCategory.create({
      data: {
        ...input,
        shopId,
        slug: await uniqueSlug(shopId, input.name),
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
