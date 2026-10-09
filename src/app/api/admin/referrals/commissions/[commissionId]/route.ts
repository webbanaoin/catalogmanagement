import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminReferralCommissionActionSchema } from "@/validation/referrals";

function optionalDate(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError({
      code: "INVALID_PAYOUT_DATE",
      message: "Payout date must be valid",
      status: 400,
    });
  }
  return parsed;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ commissionId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminReferralCommissionActionSchema.parse(
      await readJsonBody(request),
    );
    const { commissionId } = await context.params;

    const current = await prisma.referralCommission.findUnique({
      where: { id: commissionId },
      select: {
        id: true,
        status: true,
        referralPartnerId: true,
        shopId: true,
        commissionAmount: true,
        partnerNameSnapshot: true,
        shopNameSnapshot: true,
      },
    });
    if (!current) {
      throw new AppError({
        code: "REFERRAL_COMMISSION_NOT_FOUND",
        message: "Referral commission record not found",
        status: 404,
      });
    }
    if (current.status !== "EARNED") {
      throw new AppError({
        code: "REFERRAL_COMMISSION_ALREADY_SETTLED",
        message: "Only pending earned commission can be paid or cancelled",
        status: 409,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved =
        input.action === "PAY"
          ? await tx.referralCommission.update({
              where: { id: current.id },
              data: {
                status: "PAID",
                paidAt: optionalDate(input.paidAt),
                payoutMethod: input.payoutMethod,
                payoutReference: input.reference?.trim() || null,
                payoutComment: input.comment?.trim() || null,
                paidByUserId: admin.id,
              },
            })
          : await tx.referralCommission.update({
              where: { id: current.id },
              data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelComment: input.comment.trim(),
              },
            });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          shopId: current.shopId,
          action:
            input.action === "PAY"
              ? "REFERRAL_COMMISSION_PAID"
              : "REFERRAL_COMMISSION_CANCELLED",
          entityType: "ReferralCommission",
          entityId: current.id,
          metadata: {
            referralPartnerId: current.referralPartnerId,
            partnerName: current.partnerNameSnapshot,
            shopName: current.shopNameSnapshot,
            commissionAmount: current.commissionAmount.toString(),
            ...(input.action === "PAY"
              ? {
                  payoutMethod: input.payoutMethod,
                  payoutReference: input.reference?.trim() || null,
                  payoutComment: input.comment?.trim() || null,
                  paidAt: saved.paidAt?.toISOString() ?? null,
                }
              : { cancelComment: input.comment.trim() }),
          },
        },
      });

      return saved;
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        paidAt: updated.paidAt,
        payoutMethod: updated.payoutMethod,
        payoutReference: updated.payoutReference,
        payoutComment: updated.payoutComment,
        cancelledAt: updated.cancelledAt,
        cancelComment: updated.cancelComment,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
