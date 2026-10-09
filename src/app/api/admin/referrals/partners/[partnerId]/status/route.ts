import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { createUniqueReferralCode } from "@/server/referrals/referral-code";
import { adminReferralPartnerStatusSchema } from "@/validation/referrals";

const allowed: Record<
  "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED",
  Array<"ACTIVE" | "SUSPENDED" | "REJECTED">
> = {
  PENDING: ["ACTIVE", "REJECTED"],
  ACTIVE: ["SUSPENDED", "REJECTED"],
  SUSPENDED: ["ACTIVE", "REJECTED"],
  REJECTED: ["ACTIVE"],
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ partnerId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminReferralPartnerStatusSchema.parse(
      await readJsonBody(request),
    );
    const { partnerId } = await context.params;

    const current = await prisma.referralPartner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        status: true,
        referralCode: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!current) {
      throw new AppError({
        code: "REFERRAL_PARTNER_NOT_FOUND",
        message: "Marketing partner not found",
        status: 404,
      });
    }

    if (current.status !== input.status && !allowed[current.status].includes(input.status)) {
      throw new AppError({
        code: "INVALID_PARTNER_STATUS_TRANSITION",
        message: `Cannot change partner status from ${current.status} to ${input.status}`,
        status: 409,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const referralCode =
        input.status === "ACTIVE"
          ? current.referralCode ??
            (await createUniqueReferralCode(tx, current.user.name))
          : current.referralCode;

      const saved = await tx.referralPartner.update({
        where: { id: current.id },
        data: {
          status: input.status,
          referralCode,
          ...(input.status === "ACTIVE" && current.status !== "ACTIVE"
            ? { approvedAt: new Date() }
            : {}),
        },
        select: {
          id: true,
          referralCode: true,
          status: true,
          approvedAt: true,
          updatedAt: true,
          user: {
            select: { name: true, email: true, mobile: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "REFERRAL_PARTNER_STATUS_CHANGED",
          entityType: "ReferralPartner",
          entityId: current.id,
          metadata: {
            previousStatus: current.status,
            nextStatus: input.status,
            referralCode,
            note: input.note?.trim() || null,
          },
        },
      });

      return saved;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
