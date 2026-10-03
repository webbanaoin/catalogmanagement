import "server-only";

import type { PaymentStatus, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";

export type SubscriptionFeature =
  | "analyticsEnabled"
  | "excelImportEnabled"
  | "customBrandingEnabled";

type SubscriptionRecord = Awaited<ReturnType<typeof loadSubscription>>;

async function loadSubscription(shopId: string) {
  return prisma.subscription.findUnique({
    where: { shopId },
    include: { plan: true },
  });
}

export function effectiveSubscriptionStatus(
  subscription: {
    status: SubscriptionStatus;
    endDate: Date;
    graceEndsAt: Date | null;
  },
  now = new Date(),
): SubscriptionStatus {
  if (subscription.status === "CANCELLED" || subscription.status === "EXPIRED") {
    return subscription.status;
  }

  if (now.getTime() <= subscription.endDate.getTime()) {
    return subscription.status === "TRIAL" ? "TRIAL" : "ACTIVE";
  }

  if (
    subscription.graceEndsAt &&
    now.getTime() <= subscription.graceEndsAt.getTime()
  ) {
    return "GRACE";
  }

  return "EXPIRED";
}

export async function getShopSubscriptionAccess(shopId: string) {
  const subscription = await loadSubscription(shopId);
  if (!subscription) return null;

  return {
    subscription,
    effectiveStatus: effectiveSubscriptionStatus(subscription),
  };
}

export async function requireUsableSubscription(shopId: string) {
  const access = await getShopSubscriptionAccess(shopId);

  if (!access) {
    throw new AppError({
      code: "SUBSCRIPTION_REQUIRED",
      message: "An active shop subscription is required for this action",
      status: 403,
    });
  }

  if (
    access.effectiveStatus === "EXPIRED" ||
    access.effectiveStatus === "CANCELLED"
  ) {
    throw new AppError({
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "This shop subscription is not active. Existing catalogue data is preserved, but this action is unavailable until the subscription is extended or reactivated.",
      status: 403,
    });
  }

  return access;
}

export async function requireSubscriptionFeature(
  shopId: string,
  feature: SubscriptionFeature,
) {
  const access = await requireUsableSubscription(shopId);

  if (!access.subscription.plan[feature]) {
    throw new AppError({
      code: "FEATURE_NOT_INCLUDED",
      message: "This feature is not included in the shop's current plan",
      status: 403,
    });
  }

  return access;
}

export async function getProductCapacity(shopId: string) {
  const access = await requireUsableSubscription(shopId);
  const currentProducts = await prisma.product.count({
    where: { shopId, deletedAt: null },
  });
  const limit = access.subscription.plan.productLimit;

  return {
    access,
    currentProducts,
    limit,
    remaining: Math.max(0, limit - currentProducts),
  };
}

export async function requireProductCapacity(
  shopId: string,
  additionalProducts = 1,
) {
  const capacity = await getProductCapacity(shopId);

  if (additionalProducts < 0) {
    throw new Error("additionalProducts cannot be negative");
  }

  if (capacity.currentProducts + additionalProducts > capacity.limit) {
    throw new AppError({
      code: "PRODUCT_LIMIT_REACHED",
      message: `This plan allows up to ${capacity.limit} active products. Delete products or change the subscription plan before adding more.`,
      status: 409,
    });
  }

  return capacity;
}

export async function getImageCapacity(shopId: string, productId: string) {
  const access = await requireUsableSubscription(shopId);
  const product = await prisma.product.findFirst({
    where: { id: productId, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new AppError({
      code: "PRODUCT_NOT_FOUND",
      message: "Product was not found in this shop",
      status: 404,
    });
  }

  const currentImages = await prisma.productImage.count({ where: { productId } });
  const limit = access.subscription.plan.imageLimitPerProduct;

  return {
    access,
    currentImages,
    limit,
    remaining: Math.max(0, limit - currentImages),
  };
}

export async function requireImageCapacity(
  shopId: string,
  productId: string,
  additionalImages = 1,
) {
  const capacity = await getImageCapacity(shopId, productId);

  if (additionalImages < 0) {
    throw new Error("additionalImages cannot be negative");
  }

  if (capacity.currentImages + additionalImages > capacity.limit) {
    throw new AppError({
      code: "IMAGE_LIMIT_REACHED",
      message: `This plan allows up to ${capacity.limit} images per product.`,
      status: 409,
    });
  }

  return capacity;
}

export function subscriptionResponse(
  access: NonNullable<Awaited<ReturnType<typeof getShopSubscriptionAccess>>>,
  usage?: {
    products?: number;
    imagesForProduct?: number;
  },
) {
  const { subscription, effectiveStatus } = access;
  const plan = subscription.plan;

  return {
    id: subscription.id,
    status: effectiveStatus,
    storedStatus: subscription.status,
    paymentStatus: subscription.paymentStatus as PaymentStatus,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    graceEndsAt: subscription.graceEndsAt,
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice.toString(),
      annualPrice: plan.annualPrice.toString(),
      productLimit: plan.productLimit,
      imageLimitPerProduct: plan.imageLimitPerProduct,
      analyticsEnabled: plan.analyticsEnabled,
      excelImportEnabled: plan.excelImportEnabled,
      customBrandingEnabled: plan.customBrandingEnabled,
      trialDays: plan.trialDays,
      graceDays: plan.graceDays,
      status: plan.status,
    },
    usage: usage ?? {},
  };
}

export type ShopSubscriptionRecord = NonNullable<SubscriptionRecord>;
