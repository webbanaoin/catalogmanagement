import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import {
  effectiveSubscriptionStatus,
  getShopSubscriptionAccess,
  subscriptionResponse,
} from "@/server/subscriptions/access";
import { datePlusDays } from "@/server/subscriptions/trial";
import {
  adminSubscriptionAssignSchema,
  adminSubscriptionUpdateSchema,
} from "@/validation/subscriptions";

async function requireShop(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, status: true },
  });
  if (!shop) {
    throw new AppError({
      code: "SHOP_NOT_FOUND",
      message: "Shop not found",
      status: 404,
    });
  }
  return shop;
}

async function requireAssignablePlan(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new AppError({
      code: "PLAN_NOT_FOUND",
      message: "Plan not found",
      status: 404,
    });
  }
  if (plan.status !== "ACTIVE") {
    throw new AppError({
      code: "PLAN_INACTIVE",
      message: "Inactive plans cannot be assigned to shops",
      status: 409,
    });
  }
  return plan;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;
    await requireShop(shopId);

    const [access, products] = await Promise.all([
      getShopSubscriptionAccess(shopId),
      prisma.product.count({ where: { shopId, deletedAt: null } }),
    ]);

    return NextResponse.json({
      data: access ? subscriptionResponse(access, { products }) : null,
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
    await requirePlatformAdmin();
    const { shopId } = await context.params;
    await requireShop(shopId);

    const existing = await prisma.subscription.findUnique({
      where: { shopId },
      select: { id: true },
    });
    if (existing) {
      throw new AppError({
        code: "SUBSCRIPTION_ALREADY_EXISTS",
        message: "This shop already has a subscription; use PATCH to change or extend it",
        status: 409,
      });
    }

    const input = adminSubscriptionAssignSchema.parse(await readJsonBody(request));
    const plan = await requireAssignablePlan(input.planId);
    const durationDays =
      input.durationDays ?? (input.status === "TRIAL" ? plan.trialDays : 0);

    if (durationDays <= 0) {
      throw new AppError({
        code: "SUBSCRIPTION_DURATION_REQUIRED",
        message: "A positive subscription duration is required",
        status: 400,
      });
    }

    const now = new Date();
    const endDate = datePlusDays(now, durationDays);
    const graceDays = input.graceDays ?? plan.graceDays;
    const graceEndsAt = graceDays > 0 ? datePlusDays(endDate, graceDays) : null;

    await prisma.subscription.create({
      data: {
        shopId,
        planId: plan.id,
        startDate: now,
        endDate,
        graceEndsAt,
        status: input.status,
        paymentStatus: input.paymentStatus,
      },
    });

    const access = await getShopSubscriptionAccess(shopId);
    if (!access) {
      throw new AppError({
        code: "SUBSCRIPTION_CREATE_FAILED",
        message: "Subscription could not be loaded after creation",
        status: 500,
      });
    }

    return NextResponse.json(
      { data: subscriptionResponse(access) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;
    await requireShop(shopId);

    const input = adminSubscriptionUpdateSchema.parse(await readJsonBody(request));
    const current = await prisma.subscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });
    if (!current) {
      throw new AppError({
        code: "SUBSCRIPTION_NOT_FOUND",
        message: "This shop does not have a subscription",
        status: 404,
      });
    }

    const plan = input.planId
      ? await requireAssignablePlan(input.planId)
      : current.plan;

    const now = new Date();
    const effectiveStatus = effectiveSubscriptionStatus(current, now);

    if (
      input.status === "ACTIVE" &&
      (effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") &&
      input.extendDays === undefined
    ) {
      throw new AppError({
        code: "SUBSCRIPTION_EXTENSION_REQUIRED",
        message: "extendDays is required when reactivating an expired or cancelled subscription",
        status: 400,
      });
    }

    const baseEndDate =
      current.endDate.getTime() > now.getTime() ? current.endDate : now;
    const endDate =
      input.extendDays !== undefined
        ? datePlusDays(baseEndDate, input.extendDays)
        : current.endDate;

    const graceDays = input.graceDays ?? plan.graceDays;
    const graceEndsAt =
      graceDays > 0 ? datePlusDays(endDate, graceDays) : null;

    await prisma.subscription.update({
      where: { shopId },
      data: {
        ...(input.planId ? { planId: plan.id } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
        ...(input.extendDays !== undefined ? { endDate } : {}),
        ...((input.extendDays !== undefined || input.graceDays !== undefined || input.planId)
          ? { graceEndsAt }
          : {}),
      },
    });

    const access = await getShopSubscriptionAccess(shopId);
    if (!access) {
      throw new AppError({
        code: "SUBSCRIPTION_UPDATE_FAILED",
        message: "Subscription could not be loaded after update",
        status: 500,
      });
    }

    return NextResponse.json({ data: subscriptionResponse(access) });
  } catch (error) {
    return errorResponse(error);
  }
}
