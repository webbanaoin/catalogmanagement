import "server-only";

import type { PaymentStatus, SubscriptionStatus, Prisma } from "@prisma/client";

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

  if (subscription.status === "GRACE") {
    return subscription.graceEndsAt &&
      now.getTime() <= subscription.graceEndsAt.getTime()
      ? "GRACE"
      : "EXPIRED";
  }

  if (now.getTime() <= subscription.endDate.getTime()) {
    return subscription.status;
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

async function countProductImages(
  db: Prisma.TransactionClient | typeof prisma,
  shopId: string,
  productId: string,
) {
  const [currentImages, shopImages] = await Promise.all([
    db.productImage.count({ where: { productId } }),
    // Stored images count, including those on soft-deleted products, until
    // their metadata and R2 objects are explicitly removed.
    db.productImage.count({ where: { product: { is: { shopId } } } }),
  ]);
  return { currentImages, shopImages };
}

function assertImageCapacity(
  capacity: {
    currentImages: number;
    shopImages: number;
    limit: number;
    totalImageLimit: number;
  },
  additionalImages: number,
) {
  if (!Number.isInteger(additionalImages) || additionalImages < 0) {
    throw new Error("additionalImages must be a non-negative integer");
  }
  if (capacity.currentImages + additionalImages > capacity.limit) {
    throw new AppError({
      code: "IMAGE_LIMIT_REACHED",
      message: `This shop allows up to ${capacity.limit} images per product.`,
      status: 409,
    });
  }
  if (capacity.shopImages + additionalImages > capacity.totalImageLimit) {
    throw new AppError({
      code: "SHOP_IMAGE_LIMIT_REACHED",
      message: `This shop allows up to ${capacity.totalImageLimit} total product images. Delete existing images or ask the administrator to change the plan.`,
      status: 409,
    });
  }
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

  const [counts, shop] = await Promise.all([
    countProductImages(prisma, shopId, productId),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { imageLimitPerProductOverride: true },
    }),
  ]);
  const limit = shop?.imageLimitPerProductOverride ?? access.subscription.plan.imageLimitPerProduct;
  const totalImageLimit = access.subscription.plan.totalImageLimit;
  return {
    access,
    ...counts,
    limit,
    totalImageLimit,
    remaining: Math.max(0, limit - counts.currentImages),
    shopRemaining: Math.max(0, totalImageLimit - counts.shopImages),
  };
}

export async function requireImageCapacity(
  shopId: string,
  productId: string,
  additionalImages = 1,
) {
  const capacity = await getImageCapacity(shopId, productId);
  assertImageCapacity(capacity, additionalImages);
  return capacity;
}

// This check MUST run in the same transaction as productImage.create.
// A shop row lock serializes concurrent attachments across different products.
export async function requireImageCapacityInTransaction(
  tx: Prisma.TransactionClient,
  shopId: string,
  productId: string,
  additionalImages = 1,
) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM shops WHERE id = ${shopId} FOR UPDATE
  `;
  if (locked.length !== 1) {
    throw new AppError({ code: "SHOP_NOT_FOUND", message: "Shop not found", status: 404 });
  }
  const subscription = await tx.subscription.findUnique({
    where: { shopId },
    include: { plan: true },
  });
  if (!subscription) {
    throw new AppError({
      code: "SUBSCRIPTION_REQUIRED",
      message: "An active shop subscription is required for this action",
      status: 403,
    });
  }
  const effectiveStatus = effectiveSubscriptionStatus(subscription);
  if (effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") {
    throw new AppError({
      code: "SUBSCRIPTION_EXPIRED",
      message: "This shop subscription is not active.",
      status: 403,
    });
  }
  const product = await tx.product.findFirst({
    where: { id: productId, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new AppError({ code: "PRODUCT_NOT_FOUND", message: "Product was not found in this shop", status: 404 });
  }
  const [counts, shop] = await Promise.all([
    countProductImages(tx, shopId, productId),
    tx.shop.findUnique({
      where: { id: shopId },
      select: { imageLimitPerProductOverride: true },
    }),
  ]);
  const capacity = {
    ...counts,
    limit: shop?.imageLimitPerProductOverride ?? subscription.plan.imageLimitPerProduct,
    totalImageLimit: subscription.plan.totalImageLimit,
  };
  assertImageCapacity(capacity, additionalImages);
  return capacity;
}

export function subscriptionResponse(
  access: NonNullable<Awaited<ReturnType<typeof getShopSubscriptionAccess>>>,
  usage?: {
    products?: number;
    imagesForProduct?: number;
    totalImages?: number;
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
      quarterlyPrice: plan.quarterlyPrice.toString(),
      halfYearlyPrice: plan.halfYearlyPrice.toString(),
      annualPrice: plan.annualPrice.toString(),
      regularMonthlyPrice: plan.regularMonthlyPrice?.toString() ?? null,
      regularQuarterlyPrice: plan.regularQuarterlyPrice?.toString() ?? null,
      regularHalfYearlyPrice: plan.regularHalfYearlyPrice?.toString() ?? null,
      regularAnnualPrice: plan.regularAnnualPrice?.toString() ?? null,
      offerEnabled: plan.offerEnabled,
      offerStartsAt: plan.offerStartsAt?.toISOString() ?? null,
      offerEndsAt: plan.offerEndsAt?.toISOString() ?? null,
      productLimit: plan.productLimit,
      imageLimitPerProduct: plan.imageLimitPerProduct,
      totalImageLimit: plan.totalImageLimit,
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
