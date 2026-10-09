import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { recordVerifiedShopPayment } from "@/server/payments/record-payment";
import {
  getShopSubscriptionAccess,
  subscriptionResponse,
} from "@/server/subscriptions/access";
import { adminPaymentSubmissionReviewSchema } from "@/validation/subscriptions";

function defaultExtensionDays(cycle: "MONTHLY" | "YEARLY") {
  return cycle === "YEARLY" ? 365 : 30;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminPaymentSubmissionReviewSchema.parse(
      await readJsonBody(request),
    );
    const { submissionId } = await context.params;

    const submission = await prisma.paymentSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        shopId: true,
        amount: true,
        method: true,
        billingCycle: true,
        paidAt: true,
        reference: true,
        comment: true,
        status: true,
        paymentRecordId: true,
        recipientType: true,
        recipientNameSnapshot: true,
        shop: { select: { name: true } },
      },
    });

    if (!submission) {
      throw new AppError({
        code: "PAYMENT_SUBMISSION_NOT_FOUND",
        message: "Merchant payment submission not found",
        status: 404,
      });
    }

    if (submission.status !== "PENDING" || submission.paymentRecordId) {
      throw new AppError({
        code: "PAYMENT_SUBMISSION_ALREADY_REVIEWED",
        message: "This merchant payment submission has already been reviewed",
        status: 409,
      });
    }

    if (input.action === "REJECT") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.paymentSubmission.updateMany({
          where: {
            id: submission.id,
            status: "PENDING",
            paymentRecordId: null,
          },
          data: {
            status: "REJECTED",
            reviewedByUserId: admin.id,
            reviewedAt: new Date(),
            reviewComment: input.comment.trim(),
          },
        });

        if (updated.count !== 1) {
          throw new AppError({
            code: "PAYMENT_SUBMISSION_ALREADY_REVIEWED",
            message: "This merchant payment submission has already been reviewed",
            status: 409,
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: admin.id,
            shopId: submission.shopId,
            action: "MERCHANT_PAYMENT_SUBMISSION_REJECTED",
            entityType: "PaymentSubmission",
            entityId: submission.id,
            metadata: {
              amount: submission.amount.toString(),
              billingCycle: submission.billingCycle,
              method: submission.method,
              paidAt: submission.paidAt.toISOString(),
              recipientType: submission.recipientType,
              recipientName: submission.recipientNameSnapshot,
              reason: input.comment.trim(),
            },
          },
        });

        return tx.paymentSubmission.findUnique({
          where: { id: submission.id },
          select: {
            id: true,
            status: true,
            reviewedAt: true,
            reviewComment: true,
            paymentRecordId: true,
          },
        });
      });

      return NextResponse.json({ data: result });
    }

    if (
      submission.billingCycle !== "MONTHLY" &&
      submission.billingCycle !== "YEARLY"
    ) {
      throw new AppError({
        code: "PAYMENT_SUBMISSION_CYCLE_UNSUPPORTED",
        message: "Merchant-submitted payments must be Monthly or Yearly",
        status: 409,
      });
    }

    const extendDays =
      input.extendDays ?? defaultExtensionDays(submission.billingCycle);

    const officialComment = [
      "Approved merchant-submitted payment.",
      "Paid to: " + submission.recipientNameSnapshot + ".",
      submission.comment?.trim()
        ? "Merchant note: " + submission.comment.trim()
        : null,
      input.comment?.trim()
        ? "Admin review: " + input.comment.trim()
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const transactionResult = await recordVerifiedShopPayment({
      actorUserId: admin.id,
      shopId: submission.shopId,
      amount: submission.amount.toString(),
      method: submission.method,
      billingCycle: submission.billingCycle,
      receivedAt: submission.paidAt,
      reference: submission.reference,
      comment: officialComment,
      extendDays,
      activateSubscription: input.activateSubscription,
      paymentSubmissionId: submission.id,
      reviewComment: input.comment?.trim() || null,
    });

    const access = await getShopSubscriptionAccess(submission.shopId);
    if (!access) {
      throw new AppError({
        code: "SUBSCRIPTION_UPDATE_FAILED",
        message: "Subscription could not be loaded after payment approval",
        status: 500,
      });
    }

    return NextResponse.json({
      data: {
        submissionId: submission.id,
        status: "APPROVED" as const,
        paymentRecordId: transactionResult.payment.id,
        paymentAmount: transactionResult.payment.amount.toString(),
        billingCycle: transactionResult.payment.billingCycle,
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
    });
  } catch (error) {
    return errorResponse(error);
  }
}
