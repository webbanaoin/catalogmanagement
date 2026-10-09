import "server-only";

import type { BillingCycle, PaymentMethod } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { createCommissionForPayment } from "@/server/referrals/commission";
import {
  effectiveSubscriptionStatus,
} from "@/server/subscriptions/access";
import { datePlusDays } from "@/server/subscriptions/trial";

export interface VerifiedPaymentInput {
  actorUserId: string;
  shopId: string;
  amount: number | string;
  method: PaymentMethod;
  billingCycle: BillingCycle;
  receivedAt: Date;
  periodStartDate?: Date | null;
  periodEndDate?: Date | null;
  reference?: string | null;
  comment?: string | null;
  extendDays: number;
  activateSubscription: boolean;
  paymentSubmissionId?: string | null;
  reviewComment?: string | null;
}

export async function recordVerifiedShopPayment(input: VerifiedPaymentInput) {
  return prisma.$transaction(async (tx) => {
    if (input.paymentSubmissionId) {
      const submission = await tx.paymentSubmission.findUnique({
        where: { id: input.paymentSubmissionId },
        select: {
          id: true,
          shopId: true,
          status: true,
          paymentRecordId: true,
        },
      });

      if (!submission) {
        throw new AppError({
          code: "PAYMENT_SUBMISSION_NOT_FOUND",
          message: "Merchant payment submission not found",
          status: 404,
        });
      }

      if (submission.shopId !== input.shopId) {
        throw new AppError({
          code: "PAYMENT_SUBMISSION_SHOP_MISMATCH",
          message: "Payment submission does not belong to this shop",
          status: 409,
        });
      }

      if (submission.status !== "PENDING" || submission.paymentRecordId) {
        throw new AppError({
          code: "PAYMENT_SUBMISSION_ALREADY_REVIEWED",
          message: "This merchant payment submission has already been reviewed",
          status: 409,
        });
      }

      const claimed = await tx.paymentSubmission.updateMany({
        where: {
          id: submission.id,
          status: "PENDING",
          paymentRecordId: null,
        },
        data: {
          status: "APPROVED",
          reviewedByUserId: input.actorUserId,
          reviewedAt: new Date(),
          reviewComment: input.reviewComment?.trim() || null,
        },
      });

      if (claimed.count !== 1) {
        throw new AppError({
          code: "PAYMENT_SUBMISSION_ALREADY_REVIEWED",
          message: "This merchant payment submission has already been reviewed",
          status: 409,
        });
      }
    }

    const shop = await tx.shop.findUnique({
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
    const periodStartDate =
      input.periodStartDate ??
      (input.extendDays > 0 ? baseEndDate : null);
    const periodEndDate =
      input.periodEndDate ??
      (input.extendDays > 0 ? newEndDate : null);
    const graceEndsAt =
      input.extendDays > 0
        ? current.plan.graceDays > 0
          ? datePlusDays(newEndDate, current.plan.graceDays)
          : null
        : current.graceEndsAt;

    const created = await tx.paymentRecord.create({
      data: {
        shopId: shop.id,
        subscriptionId: current.id,
        planId: current.planId,
        recordedByUserId: input.actorUserId,
        planNameSnapshot: current.plan.name,
        amount: input.amount,
        currency: "INR",
        method: input.method,
        billingCycle: input.billingCycle,
        periodStartDate,
        periodEndDate,
        reference: input.reference?.trim() || null,
        comment: input.comment?.trim() || null,
        receivedAt: input.receivedAt,
        extendDays: input.extendDays,
        previousEndDate,
        newEndDate,
      },
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
    });

    await tx.subscription.update({
      where: { id: current.id },
      data: {
        paymentStatus: "PAID",
        ...(input.activateSubscription ? { status: "ACTIVE" } : {}),
        ...(input.extendDays > 0 ? { endDate: newEndDate, graceEndsAt } : {}),
      },
    });

    const referralCommission = await createCommissionForPayment(tx, {
      paymentRecordId: created.id,
      shopId: shop.id,
      shopName: shop.name,
      paymentAmount: created.amount,
      billingCycle: created.billingCycle,
      planName: created.planNameSnapshot,
      earnedAt: created.receivedAt,
    });

    if (referralCommission && "commissionAmount" in referralCommission) {
      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          shopId: shop.id,
          action: "REFERRAL_COMMISSION_EARNED",
          entityType: "ReferralCommission",
          entityId: referralCommission.id,
          metadata: {
            paymentRecordId: created.id,
            billingCycle: created.billingCycle,
            paymentAmount: created.amount.toString(),
            commissionAmount: referralCommission.commissionAmount.toString(),
            paymentSubmissionId: input.paymentSubmissionId ?? null,
          },
        },
      });
    }

    if (input.paymentSubmissionId) {
      await tx.paymentSubmission.update({
        where: { id: input.paymentSubmissionId },
        data: { paymentRecordId: created.id },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          shopId: shop.id,
          action: "MERCHANT_PAYMENT_SUBMISSION_APPROVED",
          entityType: "PaymentSubmission",
          entityId: input.paymentSubmissionId,
          metadata: {
            paymentRecordId: created.id,
            amount: created.amount.toString(),
            billingCycle: created.billingCycle,
            method: created.method,
            receivedAt: created.receivedAt.toISOString(),
            reviewComment: input.reviewComment?.trim() || null,
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        shopId: shop.id,
        action: "PAYMENT_RECORDED",
        entityType: "PaymentRecord",
        entityId: created.id,
        metadata: {
          amount: created.amount.toString(),
          currency: "INR",
          method: created.method,
          billingCycle: created.billingCycle,
          periodStartDate: periodStartDate?.toISOString() ?? null,
          periodEndDate: periodEndDate?.toISOString() ?? null,
          reference: created.reference,
          receivedAt: created.receivedAt.toISOString(),
          planId: current.planId,
          planName: current.plan.name,
          previousSubscriptionStatus: current.status,
          previousPaymentStatus: current.paymentStatus,
          activateSubscription: input.activateSubscription,
          extendDays: input.extendDays,
          previousEndDate: previousEndDate.toISOString(),
          newEndDate: newEndDate.toISOString(),
          referralCommissionId: referralCommission?.id ?? null,
          paymentSubmissionId: input.paymentSubmissionId ?? null,
          source: input.paymentSubmissionId
            ? "MERCHANT_SUBMISSION_APPROVED"
            : "ADMIN_DIRECT",
        },
      },
    });

    return { payment: created, referralCommission };
  });
}
