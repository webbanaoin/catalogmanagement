import "server-only";

import { AppError } from "@/server/http/app-error";

type Price = number | { toString(): string } | null | undefined;
export interface OfferPricePairs {
  monthlyPrice: Price;
  quarterlyPrice: Price;
  halfYearlyPrice: Price;
  annualPrice: Price;
  regularMonthlyPrice?: Price;
  regularQuarterlyPrice?: Price;
  regularHalfYearlyPrice?: Price;
  regularAnnualPrice?: Price;
}

export function validateOfferPrices(prices: OfferPricePairs, enabled: boolean) {
  if (!enabled) return;
  const pairs = [
    ["monthly", prices.monthlyPrice, prices.regularMonthlyPrice],
    ["quarterly", prices.quarterlyPrice, prices.regularQuarterlyPrice],
    ["half-yearly", prices.halfYearlyPrice, prices.regularHalfYearlyPrice],
    ["yearly", prices.annualPrice, prices.regularAnnualPrice],
  ] as const;
  for (const [cycle, discounted, regular] of pairs) {
    if (regular === null || regular === undefined || Number(regular) <= Number(discounted) || Number(discounted) <= 0) {
      throw new AppError({
        code: "INVALID_OFFER_PRICES", status: 400,
        message: `To activate the offer, set the ${cycle} regular price higher than the positive offer price.`,
      });
    }
  }
}

export function newOfferWindow(durationDays: number, now = new Date()) {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
    throw new AppError({ code: "INVALID_OFFER_DURATION", message: "Offer duration must be 1–365 days.", status: 400 });
  }
  return {
    offerStartsAt: now,
    offerEndsAt: new Date(now.getTime() + durationDays * 86_400_000),
  };
}
