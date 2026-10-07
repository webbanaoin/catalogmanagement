import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminShopBusinessCategorySchema } from "@/validation/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const input = adminShopBusinessCategorySchema.parse(
      await readJsonBody(request),
    );

    const [shop, businessCategory] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          businessCategoryId: true,
          requestedBusinessType: true,
        },
      }),
      prisma.businessCategory.findFirst({
        where: {
          id: input.businessCategoryId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      }),
    ]);

    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    if (!businessCategory) {
      throw new AppError({
        code: "BUSINESS_CATEGORY_NOT_FOUND",
        message: "Select an active business type",
        status: 400,
        fields: {
          businessCategoryId: ["Select an active business type"],
        },
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({
        where: { id: shop.id },
        data: {
          businessCategoryId: businessCategory.id,
          requestedBusinessType: null,
        },
        select: {
          id: true,
          businessCategoryId: true,
          requestedBusinessType: true,
          businessCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      await ensureDefaultShopCategories(tx, {
        shopId: shop.id,
        businessCategory,
        actorUserId: admin.id,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          shopId: shop.id,
          action: shop.requestedBusinessType
            ? "BUSINESS_TYPE_REQUEST_ACCEPTED"
            : "SHOP_BUSINESS_CATEGORY_ASSIGNED",
          entityType: "Shop",
          entityId: shop.id,
          metadata: {
            previousBusinessCategoryId: shop.businessCategoryId,
            requestedBusinessType: shop.requestedBusinessType,
            businessCategoryId: businessCategory.id,
            businessCategoryName: businessCategory.name,
            businessCategorySlug: businessCategory.slug,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
