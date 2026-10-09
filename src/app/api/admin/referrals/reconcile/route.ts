import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { createCommissionForPayment } from "@/server/referrals/commission";

export async function POST() {
  try {
    const admin = await requirePlatformAdmin();

    const settings = await prisma.referralProgramSettings.findUnique({
      where: { id: "default" },
      select: {
        isEnabled: true,
        commissionMode: true,
        monthlyCommission: true,
        yearlyCommission: true,
      },
    });

    if (!settings?.isEnabled) {
      return NextResponse.json({
        data: {
          createdCount: 0,
          message: "Referral commission program is disabled.",
        },
      });
    }

    const candidates = await prisma.paymentRecord.findMany({
      where: {
        billingCycle: { in: ["MONTHLY", "YEARLY"] },
        referralCommission: null,
        shop: {
          referralPartnerId: { not: null },
          referralPartner: {
            status: "ACTIVE",
            referralCode: { not: null },
          },
        },
      },
      orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        shopId: true,
        amount: true,
        billingCycle: true,
        planNameSnapshot: true,
        receivedAt: true,
        shop: {
          select: {
            name: true,
            referralAssignedAt: true,
          },
        },
      },
    });

    let createdCount = 0;
    let skippedBeforeAttribution = 0;
    let skippedByRule = 0;
    const created: Array<{
      commissionId: string;
      shopId: string;
      shopName: string;
      paymentRecordId: string;
      amount: string;
    }> = [];

    for (const payment of candidates) {
      if (
        payment.shop.referralAssignedAt &&
        payment.receivedAt < payment.shop.referralAssignedAt
      ) {
        skippedBeforeAttribution += 1;
        continue;
      }

      const result = await prisma.$transaction(async (tx) => {
        const commission = await createCommissionForPayment(tx, {
          paymentRecordId: payment.id,
          shopId: payment.shopId,
          shopName: payment.shop.name,
          paymentAmount: payment.amount,
          billingCycle: payment.billingCycle,
          planName: payment.planNameSnapshot,
          earnedAt: payment.receivedAt,
        });

        if (!commission || !("commissionAmount" in commission)) {
          return null;
        }

        await tx.auditLog.create({
          data: {
            actorUserId: admin.id,
            shopId: payment.shopId,
            action: "REFERRAL_COMMISSION_RECONCILED",
            entityType: "ReferralCommission",
            entityId: commission.id,
            metadata: {
              paymentRecordId: payment.id,
              billingCycle: payment.billingCycle,
              paymentAmount: payment.amount.toString(),
              commissionAmount: commission.commissionAmount.toString(),
              source: "ADMIN_RECONCILIATION",
              commissionMode: settings.commissionMode,
            },
          },
        });

        return commission;
      });

      if (!result || !("commissionAmount" in result)) {
        skippedByRule += 1;
        continue;
      }

      createdCount += 1;
      created.push({
        commissionId: result.id,
        shopId: payment.shopId,
        shopName: payment.shop.name,
        paymentRecordId: payment.id,
        amount: result.commissionAmount.toString(),
      });
    }

    return NextResponse.json({
      data: {
        createdCount,
        skippedBeforeAttribution,
        skippedByRule,
        created,
        message:
          createdCount > 0
            ? `${createdCount} missing referral commission record${createdCount === 1 ? "" : "s"} created.`
            : "No missing eligible referral commissions were found.",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
