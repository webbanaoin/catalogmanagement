export const PAID_BILLING_CYCLES = [
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
] as const;

export type PaidBillingCycle = (typeof PAID_BILLING_CYCLES)[number];

export interface SubscriptionPriceSource {
  monthlyPrice: string | number;
  quarterlyPrice: string | number;
  halfYearlyPrice: string | number;
  annualPrice: string | number;
}

export interface ReferralCommissionSource {
  monthlyCommission: string | number;
  quarterlyCommission: string | number;
  halfYearlyCommission: string | number;
  yearlyCommission: string | number;
}

export const SUBSCRIPTION_CYCLE_CONFIG: Record<
  PaidBillingCycle,
  {
    label: string;
    shortLabel: string;
    months: number;
    extensionDays: number;
    priceKey:
      | "monthlyPrice"
      | "quarterlyPrice"
      | "halfYearlyPrice"
      | "annualPrice";
    commissionKey:
      | "monthlyCommission"
      | "quarterlyCommission"
      | "halfYearlyCommission"
      | "yearlyCommission";
  }
> = {
  MONTHLY: {
    label: "Monthly",
    shortLabel: "1 month",
    months: 1,
    extensionDays: 30,
    priceKey: "monthlyPrice",
    commissionKey: "monthlyCommission",
  },
  QUARTERLY: {
    label: "Quarterly",
    shortLabel: "3 months",
    months: 3,
    extensionDays: 90,
    priceKey: "quarterlyPrice",
    commissionKey: "quarterlyCommission",
  },
  HALF_YEARLY: {
    label: "Half-Yearly",
    shortLabel: "6 months",
    months: 6,
    extensionDays: 182,
    priceKey: "halfYearlyPrice",
    commissionKey: "halfYearlyCommission",
  },
  YEARLY: {
    label: "Yearly",
    shortLabel: "12 months",
    months: 12,
    extensionDays: 365,
    priceKey: "annualPrice",
    commissionKey: "yearlyCommission",
  },
};

export function isPaidBillingCycle(value: string): value is PaidBillingCycle {
  return PAID_BILLING_CYCLES.includes(value as PaidBillingCycle);
}

export function billingCycleLabel(cycle: PaidBillingCycle) {
  return SUBSCRIPTION_CYCLE_CONFIG[cycle].label;
}

export function billingCycleExtensionDays(cycle: PaidBillingCycle) {
  return SUBSCRIPTION_CYCLE_CONFIG[cycle].extensionDays;
}

export function planPriceForCycle(
  plan: SubscriptionPriceSource,
  cycle: PaidBillingCycle,
) {
  return Number(plan[SUBSCRIPTION_CYCLE_CONFIG[cycle].priceKey] ?? 0);
}

export function commissionForCycle(
  settings: ReferralCommissionSource,
  cycle: PaidBillingCycle,
) {
  return Number(settings[SUBSCRIPTION_CYCLE_CONFIG[cycle].commissionKey] ?? 0);
}

export function effectiveMonthlyPrice(
  plan: SubscriptionPriceSource,
  cycle: PaidBillingCycle,
) {
  const amount = planPriceForCycle(plan, cycle);
  return amount / SUBSCRIPTION_CYCLE_CONFIG[cycle].months;
}

export function savingsAgainstMonthly(
  plan: SubscriptionPriceSource,
  cycle: PaidBillingCycle,
) {
  const monthly = Number(plan.monthlyPrice ?? 0);
  const expected = monthly * SUBSCRIPTION_CYCLE_CONFIG[cycle].months;
  return Math.max(0, expected - planPriceForCycle(plan, cycle));
}
