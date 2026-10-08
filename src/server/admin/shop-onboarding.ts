import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";

export async function requireAdminOnboardingShop(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      requestedBusinessType: true,
      businessCategoryId: true,
      showProductPrices: true,
      businessCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
      subscription: {
        select: {
          id: true,
          plan: {
            select: {
              id: true,
              name: true,
              productLimit: true,
              excelImportEnabled: true,
            },
          },
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

  if (!["PENDING", "APPROVED", "ACTIVE"].includes(shop.status)) {
    throw new AppError({
      code: "SHOP_NOT_AVAILABLE_FOR_ONBOARDING",
      message: "Only pending, approved or active shops can be onboarded",
      status: 409,
    });
  }

  if (shop.requestedBusinessType && !shop.businessCategoryId) {
    throw new AppError({
      code: "BUSINESS_TYPE_REQUEST_PENDING",
      message:
        "Assign a supported business type before downloading or importing the shop catalogue",
      status: 409,
    });
  }

  return shop;
}

export async function getAdminOnboardingCapacity(
  shopId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const shop = await tx.shop.findUnique({
    where: { id: shopId },
    select: {
      subscription: {
        select: {
          plan: {
            select: {
              id: true,
              name: true,
              productLimit: true,
            },
          },
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

  let capacitySource: "SUBSCRIPTION" | "DEFAULT_TRIAL" = shop.subscription
    ? "SUBSCRIPTION"
    : "DEFAULT_TRIAL";
  let plan = shop.subscription?.plan ?? null;

  if (!plan) {
    plan = await tx.plan.findFirst({
      where: {
        isDefaultTrial: true,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        productLimit: true,
      },
    });
  }

  if (!plan) {
    throw new AppError({
      code: "DEFAULT_TRIAL_PLAN_REQUIRED",
      message:
        "Configure an active default trial plan before onboarding products for a shop without a subscription",
      status: 409,
    });
  }

  const currentProducts = await tx.product.count({
    where: { shopId, deletedAt: null },
  });

  return {
    plan,
    capacitySource,
    currentProducts,
    limit: plan.productLimit,
    remaining: Math.max(0, plan.productLimit - currentProducts),
  };
}
