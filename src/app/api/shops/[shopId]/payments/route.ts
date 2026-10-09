import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { merchantPaymentSubmissionSchema } from "@/validation/subscriptions";

function paymentItem(record: {
  id: string;
  amount: { toString(): string };
  currency: string;
  method: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
  billingCycle:
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "HALF_YEARLY"
    | "YEARLY"
    | "CUSTOM";
  reference: string | null;
  comment: string | null;
  receivedAt: Date;
  extendDays: number;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  previousEndDate: Date | null;
  newEndDate: Date | null;
  planNameSnapshot: string;
  createdAt: Date;
  paymentSubmission: {
    id: string;
    recipientType: "WEBBANAO" | "REFERRAL_PARTNER" | "OTHER";
    recipientNameSnapshot: string;
    submittedAt: Date;
  } | null;
}) {
  return {
    id: record.id,
    amount: record.amount.toString(),
    currency: record.currency,
    method: record.method,
    billingCycle: record.billingCycle,
    reference: record.reference,
    comment: record.comment,
    receivedAt: record.receivedAt,
    extendDays: record.extendDays,
    periodStartDate: record.periodStartDate,
    periodEndDate: record.periodEndDate,
    previousEndDate: record.previousEndDate,
    newEndDate: record.newEndDate,
    planName: record.planNameSnapshot,
    createdAt: record.createdAt,
    source: record.paymentSubmission
      ? ("MERCHANT_SUBMISSION_APPROVED" as const)
      : ("ADMIN_RECORDED" as const),
    submittedPayment: record.paymentSubmission
      ? {
          id: record.paymentSubmission.id,
          recipientType: record.paymentSubmission.recipientType,
          recipientName: record.paymentSubmission.recipientNameSnapshot,
          submittedAt: record.paymentSubmission.submittedAt,
        }
      : null,
  };
}

function submissionItem(record: {
  id: string;
  amount: { toString(): string };
  currency: string;
  method: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
  billingCycle:
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "HALF_YEARLY"
    | "YEARLY"
    | "CUSTOM";
  paidAt: Date;
  recipientType: "WEBBANAO" | "REFERRAL_PARTNER" | "OTHER";
  recipientNameSnapshot: string;
  reference: string | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewComment: string | null;
  paymentRecordId: string | null;
}) {
  return {
    id: record.id,
    amount: record.amount.toString(),
    currency: record.currency,
    method: record.method,
    billingCycle: record.billingCycle,
    paidAt: record.paidAt,
    recipientType: record.recipientType,
    recipientName: record.recipientNameSnapshot,
    reference: record.reference,
    comment: record.comment,
    status: record.status,
    submittedAt: record.submittedAt,
    reviewedAt: record.reviewedAt,
    reviewComment: record.reviewComment,
    paymentRecordId: record.paymentRecordId,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    const [shop, payments, submissions] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          referralPartner: {
            select: {
              id: true,
              referralCode: true,
              status: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.paymentRecord.findMany({
        where: { shopId },
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          billingCycle: true,
          reference: true,
          comment: true,
          receivedAt: true,
          extendDays: true,
          periodStartDate: true,
          periodEndDate: true,
          previousEndDate: true,
          newEndDate: true,
          planNameSnapshot: true,
          createdAt: true,
          paymentSubmission: {
            select: {
              id: true,
              recipientType: true,
              recipientNameSnapshot: true,
              submittedAt: true,
            },
          },
        },
      }),
      prisma.paymentSubmission.findMany({
        where: { shopId },
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        take: 100,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          billingCycle: true,
          paidAt: true,
          recipientType: true,
          recipientNameSnapshot: true,
          reference: true,
          comment: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewComment: true,
          paymentRecordId: true,
        },
      }),
    ]);

    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    return NextResponse.json({
      data: {
        shop: { id: shop.id, name: shop.name },
        referralPartner:
          shop.referralPartner?.status === "ACTIVE" &&
          shop.referralPartner.referralCode
            ? {
                id: shop.referralPartner.id,
                name: shop.referralPartner.user.name,
                referralCode: shop.referralPartner.referralCode,
              }
            : null,
        payments: payments.map(paymentItem),
        submissions: submissions.map(submissionItem),
      },
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
    const { shopId } = await context.params;
    const { user } = await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    const input = merchantPaymentSubmissionSchema.parse(
      await readJsonBody(request),
    );

    const paidAt = new Date(input.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      throw new AppError({
        code: "INVALID_PAYMENT_DATE",
        message: "Payment date must be valid",
        status: 400,
      });
    }
    if (paidAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new AppError({
        code: "PAYMENT_DATE_IN_FUTURE",
        message: "Payment date cannot be in the future",
        status: 400,
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        referralPartner: {
          select: {
            id: true,
            referralCode: true,
            status: true,
            user: { select: { name: true } },
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

    let referralPartnerId: string | null = null;
    let recipientNameSnapshot = "Webbanao Digital Showroom";

    if (input.recipientType === "REFERRAL_PARTNER") {
      const partner = shop.referralPartner;
      if (
        !partner ||
        partner.status !== "ACTIVE" ||
        !partner.referralCode
      ) {
        throw new AppError({
          code: "REFERRAL_PARTNER_UNAVAILABLE",
          message:
            "This shop does not currently have an active referral partner. Select Other if you paid another person.",
          status: 400,
        });
      }
      referralPartnerId = partner.id;
      recipientNameSnapshot =
        partner.user.name + " (" + partner.referralCode + ")";
    } else if (input.recipientType === "OTHER") {
      recipientNameSnapshot = input.recipientName?.trim() || "";
    }

    const reference = input.reference?.trim() || null;
    if (reference) {
      const [existingPayment, existingSubmission] = await Promise.all([
        prisma.paymentRecord.findFirst({
          where: { shopId, reference },
          select: { id: true },
        }),
        prisma.paymentSubmission.findFirst({
          where: {
            shopId,
            reference,
            status: { in: ["PENDING", "APPROVED"] },
          },
          select: { id: true },
        }),
      ]);

      if (existingPayment || existingSubmission) {
        throw new AppError({
          code: "DUPLICATE_PAYMENT_REFERENCE",
          message:
            "This payment reference is already present for your shop. Check payment history before submitting again.",
          status: 409,
        });
      }
    }

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentSubmission.create({
        data: {
          shopId,
          submittedByUserId: user.id,
          referralPartnerId,
          amount: input.amount,
          currency: "INR",
          method: input.method,
          billingCycle: input.billingCycle,
          paidAt,
          recipientType: input.recipientType,
          recipientNameSnapshot,
          reference,
          comment: input.comment?.trim() || null,
          status: "PENDING",
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          billingCycle: true,
          paidAt: true,
          recipientType: true,
          recipientNameSnapshot: true,
          reference: true,
          comment: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewComment: true,
          paymentRecordId: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          shopId,
          action: "MERCHANT_PAYMENT_SUBMITTED",
          entityType: "PaymentSubmission",
          entityId: created.id,
          metadata: {
            amount: created.amount.toString(),
            method: created.method,
            billingCycle: created.billingCycle,
            paidAt: created.paidAt.toISOString(),
            recipientType: created.recipientType,
            recipientName: created.recipientNameSnapshot,
            reference: created.reference,
          },
        },
      });

      return created;
    });

    return NextResponse.json(
      { data: submissionItem(submission) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
