import "server-only";

import type { ShopStatus } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { effectiveSubscriptionStatus } from "@/server/subscriptions/access";
import { ensureDefaultTrialSubscription } from "@/server/subscriptions/trial";

const ADMIN_IMPORT_STATUSES: ShopStatus[] = ["PENDING", "APPROVED", "ACTIVE"];

export async function getAdminImportShop(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      status: true,
      showProductPrices: true,
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

  if (!shop) {
    throw new AppError({
      code: "SHOP_NOT_FOUND",
      message: "Shop not found",
      status: 404,
    });
  }

  if (!ADMIN_IMPORT_STATUSES.includes(shop.status)) {
    throw new AppError({
      code: "ADMIN_IMPORT_SHOP_UNAVAILABLE",
      message:
        "Admin product onboarding is available for pending, approved or active shops only",
      status: 409,
    });
  }

  if (
    !shop.businessCategory ||
    shop.businessCategory.status !== "ACTIVE"
  ) {
    throw new AppError({
      code: "BUSINESS_TYPE_REQUIRED",
      message:
        shop.requestedBusinessType
          ? `Assign the requested business type "${shop.requestedBusinessType}" before product onboarding`
          : "Assign an active business type before product onboarding",
      status: 409,
    });
  }

  return shop;
}

async function defaultTrialPlan() {
  return prisma.plan.findFirst({
    where: {
      isDefaultTrial: true,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAdminProductCapacity(shopId: string) {
  const shop = await getAdminImportShop(shopId);

  if (shop.status === "APPROVED" || shop.status === "ACTIVE") {
    const existing = await prisma.subscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });

    if (!existing) {
      await prisma.$transaction((tx) => ensureDefaultTrialSubscription(tx, shopId));
    }
  }

  const [currentProducts, subscription] = await Promise.all([
    prisma.product.count({
      where: { shopId, deletedAt: null },
    }),
    prisma.subscription.findUnique({
      where: { shopId },
      include: { plan: true },
    }),
  ]);

  if (subscription) {
    const status = effectiveSubscriptionStatus(subscription);
    if (
      (shop.status === "APPROVED" || shop.status === "ACTIVE") &&
      (status === "EXPIRED" || status === "CANCELLED")
    ) {
      throw new AppError({
        code: "SUBSCRIPTION_EXPIRED",
        message:
          "This shop subscription is expired or cancelled. Extend or reactivate it before importing products.",
        status: 403,
      });
    }

    const limit = subscription.plan.productLimit;
    return {
      shop,
      source: "SUBSCRIPTION" as const,
      planId: subscription.plan.id,
      planName: subscription.plan.name,
      currentProducts,
      limit,
      remaining: Math.max(0, limit - currentProducts),
    };
  }

  const trial = await defaultTrialPlan();
  if (!trial) {
    throw new AppError({
      code: "DEFAULT_TRIAL_PLAN_REQUIRED",
      message:
        "Configure an active default trial plan before onboarding products for pending shops",
      status: 409,
    });
  }

  const limit = trial.productLimit;
  return {
    shop,
    source: "DEFAULT_TRIAL" as const,
    planId: trial.id,
    planName: trial.name,
    currentProducts,
    limit,
    remaining: Math.max(0, limit - currentProducts),
  };
}
