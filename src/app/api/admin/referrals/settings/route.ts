import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminReferralSettingsSchema } from "@/validation/referrals";

function response(settings: {
  isEnabled: boolean;
  commissionMode: "FIRST_PAID_SUBSCRIPTION" | "EVERY_ELIGIBLE_PAYMENT";
  monthlyCommission: { toString(): string };
  yearlyCommission: { toString(): string };
  updatedAt: Date;
} | null) {
  return {
    isEnabled: settings?.isEnabled ?? true,
    commissionMode:
      settings?.commissionMode ?? "FIRST_PAID_SUBSCRIPTION",
    monthlyCommission: settings?.monthlyCommission.toString() ?? "0",
    yearlyCommission: settings?.yearlyCommission.toString() ?? "0",
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const settings = await prisma.referralProgramSettings.findUnique({
      where: { id: "default" },
    });
    return NextResponse.json({ data: response(settings) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminReferralSettingsSchema.parse(
      await readJsonBody(request),
    );

    const previous = await prisma.referralProgramSettings.findUnique({
      where: { id: "default" },
    });

    const settings = await prisma.$transaction(async (tx) => {
      const saved = await tx.referralProgramSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          isEnabled: input.isEnabled,
          commissionMode: input.commissionMode,
          monthlyCommission: input.monthlyCommission,
          yearlyCommission: input.yearlyCommission,
        },
        update: {
          isEnabled: input.isEnabled,
          commissionMode: input.commissionMode,
          monthlyCommission: input.monthlyCommission,
          yearlyCommission: input.yearlyCommission,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "REFERRAL_SETTINGS_UPDATED",
          entityType: "ReferralProgramSettings",
          entityId: "default",
          metadata: {
            previous: previous
              ? {
                  isEnabled: previous.isEnabled,
                  commissionMode: previous.commissionMode,
                  monthlyCommission: previous.monthlyCommission.toString(),
                  yearlyCommission: previous.yearlyCommission.toString(),
                }
              : null,
            next: {
              isEnabled: saved.isEnabled,
              commissionMode: saved.commissionMode,
              monthlyCommission: saved.monthlyCommission.toString(),
              yearlyCommission: saved.yearlyCommission.toString(),
            },
          },
        },
      });

      return saved;
    });

    return NextResponse.json({ data: response(settings) });
  } catch (error) {
    return errorResponse(error);
  }
}
