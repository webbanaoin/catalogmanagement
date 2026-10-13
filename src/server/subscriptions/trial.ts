import "server-only";

import type { Prisma } from "@prisma/client";

import { AppError } from "@/server/http/app-error";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function ensureDefaultTrialSubscription(
  tx: Prisma.TransactionClient,
  shopId: string,
  now = new Date(),
) {
  const existing = await tx.subscription.findUnique({
    where: { shopId },
    select: { id: true },
  });
  if (existing) return existing;

  const plan = await tx.plan.findFirst({
    where: { isDefaultTrial: true, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  if (!plan) {
    throw new AppError({
      code: "DEFAULT_TRIAL_PLAN_MISSING",
      message:
        "No active default trial plan is configured. Configure one before approving new shops.",
      status: 409,
    });
  }

  if (plan.trialDays <= 0) {
    throw new AppError({
      code: "DEFAULT_TRIAL_PLAN_INVALID",
      message: "The default trial plan must have at least one trial day",
      status: 409,
    });
  }

  const endDate = addDays(now, plan.trialDays);
  const graceEndsAt =
    plan.graceDays > 0 ? addDays(endDate, plan.graceDays) : null;

  return tx.subscription.create({
    data: {
      shopId,
      planId: plan.id,
      startDate: now,
      endDate,
      graceEndsAt,
      status: "TRIAL",
      paymentStatus: "NOT_REQUIRED",
    },
    select: { id: true },
  });
}

export function datePlusDays(date: Date, days: number) {
  return addDays(date, days);
}
