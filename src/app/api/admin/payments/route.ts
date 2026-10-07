import type { PaymentMethod, Prisma } from "@prisma/client";
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
  adminPaymentCreateSchema,
  adminPaymentListQuerySchema,
} from "@/validation/subscriptions";

const paymentMethods: PaymentMethod[] = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
];

function parseOptionalDate(value: string | undefined, field: "from" | "to") {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError({
      code: "INVALID_PAYMENT_DATE",
      message: `${field} must be a valid ISO date`,
      status: 400,
    });
  }
  return parsed;
}

function paymentItem(record: {
  id: string;
  amount: { toString(): string };
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  comment: string | null;
  receivedAt: Date;
  extendDays: number;
  previousEndDate: Date | null;
  newEndDate: Date | null;
  createdAt: Date;
  planNameSnapshot: string;
  shop: { id: string; name: string; slug: string };
  recordedByUser: { id: string; name: string; email: string } | null;
}) {
  return {
    id: record.id,
    amount: record.amount.toString(),
    currency: record.currency,
    method: record.method,
    reference: record.reference,
    comment: record.comment,
    receivedAt: record.receivedAt,
    extendDays: record.extendDays,
    previousEndDate: record.previousEndDate,
    newEndDate: record.newEndDate,
    createdAt: record.createdAt,
    planName: record.planNameSnapshot,
    shop: record.shop,
    recordedBy: record.recordedByUser,
  };
}

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const query = adminPaymentListQuerySchema.parse({
      shopId: url.searchParams.get("shopId") ?? undefined,
      method: url.searchParams.get("method") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const from = parseOptionalDate(query.from, "from");
    const to = parseOptionalDate(query.to, "to");
    if (from && to && from > to) {
      throw new AppError({
        code: "INVALID_PAYMENT_DATE_RANGE",
        message: "from must be earlier than or equal to to",
        status: 400,
      });
    }

    const where: Prisma.PaymentRecordWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(from || to
        ? {
            receivedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [records, total, amountAggregate, methodGroups] =
      await prisma.$transaction([
        prisma.paymentRecord.findMany({
          where,
          orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
          skip,
          take: query.pageSize,
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            reference: true,
            comment: true,
            receivedAt: true,
            extendDays: true,
            previousEndDate: true,
            newEndDate: true,
            createdAt: true,
            planNameSnapshot: true,
            shop: { select: { id: true, name: true, slug: true } },
            recordedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.paymentRecord.count({ where }),
        prisma.paymentRecord.aggregate({
          where,
          _sum: { amount: true },
        }),
        prisma.paymentRecord.groupBy({
          by: ["method"],
          where,
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

    const byMethod = Object.fromEntries(
      paymentMethods.map((method) => [
        method,
        { count: 0, amount: "0" },
      ]),
    ) as Record<PaymentMethod, { count: number; amount: string }>;

    for (const group of methodGroups) {
      byMethod[group.method] = {
        count: group._count._all,
        amount: group._sum.amount?.toString() ?? "0",
      };
    }

    return NextResponse.json({
      items: records.map(paymentItem),
      summary: {
        count: total,
        amount: amountAggregate._sum.amount?.toString() ?? "0",
        currency: "INR",
        byMethod,
      },
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminPaymentCreateSchema.parse(await readJsonBody(request));
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

    if (Number.isNaN(receivedAt.getTime())) {
      throw new AppError({
        code: "INVALID_PAYMENT_DATE",
        message: "receivedAt must be a valid date",
        status: 400,
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: input.shopId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
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

    if (!["APPROVED", "ACTIVE", "SUSPENDED"].includes(shop.status)) {
      throw new AppError({
        code: "SHOP_NOT_ELIGIBLE_FOR_PAYMENT",
        message:
          "Payments can be recorded only for approved, active or suspended shops",
        status: 409,
      });
    }

    const current = shop.subscription;
    if (!current) {
      throw new AppError({
        code: "SUBSCRIPTION_REQUIRED",
        message:
          "Assign a subscription before recording a payment for this shop",
        status: 409,
      });
    }

    const now = new Date();
    const effectiveStatus = effectiveSubscriptionStatus(current, now);
    if (
      input.activateSubscription &&
      (effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") &&
      input.extendDays <= 0
    ) {
      throw new AppError({
        code: "SUBSCRIPTION_EXTENSION_REQUIRED",
        message:
          "Renewal days are required when activating an expired or cancelled subscription",
        status: 400,
      });
    }

    const previousEndDate = current.endDate;
    const baseEndDate =
      current.endDate.getTime() > now.getTime() ? current.endDate : now;
    const newEndDate =
      input.extendDays > 0
        ? datePlusDays(baseEndDate, input.extendDays)
        : current.endDate;
    const graceEndsAt =
      input.extendDays > 0
        ? current.plan.graceDays > 0
          ? datePlusDays(newEndDate, current.plan.graceDays)
          : null
        : current.graceEndsAt;

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentRecord.create({
        data: {
          shopId: shop.id,
          subscriptionId: current.id,
          planId: current.planId,
          recordedByUserId: admin.id,
          planNameSnapshot: current.plan.name,
          amount: input.amount,
          currency: "INR",
          method: input.method,
          reference: input.reference?.trim() || null,
          comment: input.comment?.trim() || null,
          receivedAt,
          extendDays: input.extendDays,
          previousEndDate,
          newEndDate,
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          reference: true,
          comment: true,
          receivedAt: true,
          extendDays: true,
          previousEndDate: true,
          newEndDate: true,
          createdAt: true,
          planNameSnapshot: true,
          shop: { select: { id: true, name: true, slug: true } },
          recordedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.subscription.update({
        where: { id: current.id },
        data: {
          paymentStatus: "PAID",
          ...(input.activateSubscription ? { status: "ACTIVE" } : {}),
          ...(input.extendDays > 0 ? { endDate: newEndDate, graceEndsAt } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          shopId: shop.id,
          action: "PAYMENT_RECORDED",
          entityType: "PaymentRecord",
          entityId: created.id,
          metadata: {
            amount: input.amount,
            currency: "INR",
            method: input.method,
            reference: input.reference?.trim() || null,
            receivedAt: receivedAt.toISOString(),
            planId: current.planId,
            planName: current.plan.name,
            previousSubscriptionStatus: current.status,
            previousPaymentStatus: current.paymentStatus,
            activateSubscription: input.activateSubscription,
            extendDays: input.extendDays,
            previousEndDate: previousEndDate.toISOString(),
            newEndDate: newEndDate.toISOString(),
          },
        },
      });

      return created;
    });

    const access = await getShopSubscriptionAccess(shop.id);
    if (!access) {
      throw new AppError({
        code: "SUBSCRIPTION_UPDATE_FAILED",
        message: "Subscription could not be loaded after payment recording",
        status: 500,
      });
    }

    return NextResponse.json(
      {
        data: paymentItem(payment),
        subscription: subscriptionResponse(access),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
