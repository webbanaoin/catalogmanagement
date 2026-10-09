import "server-only";

import type { BillingCycle, Prisma } from "@prisma/client";

import {
  PAID_BILLING_CYCLES,
  SUBSCRIPTION_CYCLE_CONFIG,
  isPaidBillingCycle,
} from "@/lib/subscription-cycles";

function commissionForCycle(
  billingCycle: BillingCycle,
  settings: {
    monthlyCommission: Prisma.Decimal;
    quarterlyCommission: Prisma.Decimal;
    halfYearlyCommission: Prisma.Decimal;
    yearlyCommission: Prisma.Decimal;
  },
): Prisma.Decimal | null {
  if (!isPaidBillingCycle(billingCycle)) return null;
  return settings[SUBSCRIPTION_CYCLE_CONFIG[billingCycle].commissionKey];
}

export async function createCommissionForPayment(
  tx: Prisma.TransactionClient,
  input: {
    paymentRecordId: string;
    shopId: string;
    shopName: string;
    paymentAmount: Prisma.Decimal | number | string;
    billingCycle: BillingCycle;
    planName: string;
    earnedAt: Date;
  },
) {
  const shop = await tx.shop.findUnique({
    where: { id: input.shopId },
    select: {
      referralAssignedAt: true,
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

  const partner = shop?.referralPartner;
  if (!partner || partner.status !== "ACTIVE" || !partner.referralCode) {
    return null;
  }

  const settings = await tx.referralProgramSettings.findUnique({
    where: { id: "default" },
    select: {
      isEnabled: true,
      commissionMode: true,
      monthlyCommission: true,
      quarterlyCommission: true,
      halfYearlyCommission: true,
      yearlyCommission: true,
    },
  });
  if (!settings?.isEnabled) return null;

  const commissionAmount = commissionForCycle(input.billingCycle, settings);
  if (!commissionAmount || commissionAmount.lte(0)) return null;

  if (settings.commissionMode === "FIRST_PAID_SUBSCRIPTION") {
    const previousPayments = await tx.paymentRecord.count({
      where: {
        shopId: input.shopId,
        id: { not: input.paymentRecordId },
        billingCycle: { in: [...PAID_BILLING_CYCLES] },
        ...(shop?.referralAssignedAt
          ? { receivedAt: { gte: shop.referralAssignedAt } }
          : {}),
      },
    });
    if (previousPayments > 0) return null;
  }

  const existing = await tx.referralCommission.findUnique({
    where: { paymentRecordId: input.paymentRecordId },
    select: { id: true },
  });
  if (existing) return null;

  return tx.referralCommission.create({
    data: {
      paymentRecordId: input.paymentRecordId,
      referralPartnerId: partner.id,
      shopId: input.shopId,
      billingCycle: input.billingCycle,
      commissionAmount,
      currency: "INR",
      paymentAmountSnapshot: input.paymentAmount,
      planNameSnapshot: input.planName,
      partnerNameSnapshot: partner.user.name,
      partnerCodeSnapshot: partner.referralCode,
      shopNameSnapshot: input.shopName,
      earnedAt: input.earnedAt,
      status: "EARNED",
    },
    select: {
      id: true,
      commissionAmount: true,
      status: true,
    },
  });
}
