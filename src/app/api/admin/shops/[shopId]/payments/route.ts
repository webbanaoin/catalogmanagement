import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { datePlusDays } from "@/server/subscriptions/trial";
import { adminPaymentCreateSchema } from "@/validation/payments";

function subscriptionPaymentStatus(
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "WAIVED",
) {
  if (status === "PAID") return "PAID" as const;
  if (status === "WAIVED") return "WAIVED" as const;
  return "PENDING" as const;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });
    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    const items = await prisma.paymentRecord.findMany({
      where: { shopId },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        plan: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        amount: item.amount.toString(),
      })),
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
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const input = adminPaymentCreateSchema.parse(await readJsonBody(request));

    const paymentDate = new Date(input.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new AppError({
        code: "INVALID_PAYMENT_DATE",
        message: "Enter a valid payment date",
        status: 400,
      });
    }

    if (
      input.extendDays !== undefined &&
      input.status !== "PAID" &&
      input.status !== "WAIVED"
    ) {
      throw new AppError({
        code: "PAYMENT_EXTENSION_NOT_ALLOWED",
        message: "Subscription can be extended only for a paid or waived entry",
        status: 400,
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscription: {
          include: { plan: true },
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

    if (!shop.subscription) {
      throw new AppError({
        code: "SUBSCRIPTION_REQUIRED",
        message:
          "Assign or approve a subscription before recording a shop payment",
        status: 409,
      });
    }

    const subscription = shop.subscription;
    const now = new Date();
    const baseEndDate =
      subscription.endDate.getTime() > now.getTime()
        ? subscription.endDate
        : now;
    const nextEndDate =
      input.extendDays !== undefined
        ? datePlusDays(baseEndDate, input.extendDays)
        : subscription.endDate;
    const nextGraceEndsAt =
      input.extendDays !== undefined && subscription.plan.graceDays > 0
        ? datePlusDays(nextEndDate, subscription.plan.graceDays)
        : subscription.graceEndsAt;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.create({
        data: {
          shopId,
          subscriptionId: subscription.id,
          planId: subscription.planId,
          receivedByUserId: admin.id,
          amount: input.amount,
          status: input.status,
          method: input.method,
          paymentDate,
          referenceId: input.referenceId,
          gatewayOrderId: input.gatewayOrderId,
          gatewayPaymentId: input.gatewayPaymentId,
          notes: input.notes,
        },
        include: {
          plan: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, email: true } },
        },
      });

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          paymentStatus: subscriptionPaymentStatus(input.status),
          ...(input.extendDays !== undefined
            ? {
                endDate: nextEndDate,
                graceEndsAt: nextGraceEndsAt,
                status: "ACTIVE",
              }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          shopId,
          action: "PAYMENT_RECORDED",
          entityType: "PaymentRecord",
          entityId: payment.id,
          metadata: {
            amount: input.amount,
            paymentStatus: input.status,
            paymentMethod: input.method,
            referenceId: input.referenceId ?? null,
            planId: subscription.planId,
            extendDays: input.extendDays ?? null,
            previousSubscriptionPaymentStatus: subscription.paymentStatus,
            subscriptionPaymentStatus: updatedSubscription.paymentStatus,
            previousEndDate: subscription.endDate.toISOString(),
            endDate: updatedSubscription.endDate.toISOString(),
          },
        },
      });

      return {
        payment: {
          ...payment,
          amount: payment.amount.toString(),
        },
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          paymentStatus: updatedSubscription.paymentStatus,
          endDate: updatedSubscription.endDate,
          graceEndsAt: updatedSubscription.graceEndsAt,
        },
      };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
