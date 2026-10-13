import type { BillingCycle, PaymentMethod, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import {
  getShopSubscriptionAccess,
  subscriptionResponse,
} from "@/server/subscriptions/access";
import { recordVerifiedShopPayment } from "@/server/payments/record-payment";
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

function parseOptionalDate(
  value: string | null | undefined,
  field: string,
): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError({
      code: "INVALID_PAYMENT_DATE",
      message: `${field} must be a valid date`,
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
  billingCycle: BillingCycle;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
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
    billingCycle: record.billingCycle,
    periodStartDate: record.periodStartDate,
    periodEndDate: record.periodEndDate,
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
      billingCycle: url.searchParams.get("billingCycle") ?? undefined,
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
      ...(query.billingCycle ? { billingCycle: query.billingCycle } : {}),
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
    const methodGroupsQuery = prisma.paymentRecord.groupBy({
      by: ["method"],
      where,
      orderBy: { method: "asc" },
      _count: { _all: true },
      _sum: { amount: true },
    });

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
            billingCycle: true,
            periodStartDate: true,
            periodEndDate: true,
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
        methodGroupsQuery,
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
    const receivedAt =
      parseOptionalDate(input.receivedAt, "receivedAt") ?? new Date();
    const requestedPeriodStart = parseOptionalDate(
      input.periodStartDate,
      "periodStartDate",
    );
    const requestedPeriodEnd = parseOptionalDate(
      input.periodEndDate,
      "periodEndDate",
    );

    if (
      requestedPeriodStart &&
      requestedPeriodEnd &&
      requestedPeriodStart > requestedPeriodEnd
    ) {
      throw new AppError({
        code: "INVALID_BILLING_PERIOD",
        message: "Billing period end must be on or after billing period start",
        status: 400,
      });
    }

    const transactionResult = await recordVerifiedShopPayment({
      actorUserId: admin.id,
      shopId: input.shopId,
      amount: input.amount,
      method: input.method,
      billingCycle: input.billingCycle,
      receivedAt,
      periodStartDate: requestedPeriodStart ?? null,
      periodEndDate: requestedPeriodEnd ?? null,
      reference: input.reference?.trim() || null,
      comment: input.comment?.trim() || null,
      extendDays: input.extendDays,
      activateSubscription: input.activateSubscription,
    });

    const access = await getShopSubscriptionAccess(input.shopId);
    if (!access) {
      throw new AppError({
        code: "SUBSCRIPTION_UPDATE_FAILED",
        message: "Subscription could not be loaded after payment recording",
        status: 500,
      });
    }

    return NextResponse.json(
      {
        data: paymentItem(transactionResult.payment),
        subscription: subscriptionResponse(access),
        referralCommission:
          transactionResult.referralCommission &&
          "commissionAmount" in transactionResult.referralCommission
            ? {
                id: transactionResult.referralCommission.id,
                amount:
                  transactionResult.referralCommission.commissionAmount.toString(),
                status: transactionResult.referralCommission.status,
              }
            : null,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
