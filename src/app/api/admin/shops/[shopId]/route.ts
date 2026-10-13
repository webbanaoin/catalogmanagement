import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import {
  getShopSubscriptionAccess,
  subscriptionResponse,
} from "@/server/subscriptions/access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        googleMapsUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        status: true,
        requestedBusinessType: true,
        createdAt: true,
        updatedAt: true,
        businessCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        shopUsers: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            categories: true,
            products: true,
            importJobs: true,
          },
        },
      },
    });

    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    const [subscriptionAccess, activeProducts, visibleProducts] =
      await Promise.all([
        getShopSubscriptionAccess(shopId),
        prisma.product.count({
          where: { shopId, deletedAt: null },
        }),
        prisma.product.count({
          where: { shopId, deletedAt: null, isVisible: true },
        }),
      ]);

    const { shopUsers, _count, ...profile } = shop;

    return NextResponse.json({
      data: {
        ...profile,
        members: shopUsers.map(({ user, ...membership }) => ({
          ...membership,
          user,
        })),
        counts: {
          categories: _count.categories,
          productsIncludingDeleted: _count.products,
          activeProducts,
          visibleProducts,
          importJobs: _count.importJobs,
        },
        subscription: subscriptionAccess
          ? subscriptionResponse(subscriptionAccess, {
              products: activeProducts,
            })
          : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
