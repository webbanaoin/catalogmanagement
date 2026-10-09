import "server-only";

import { randomInt } from "node:crypto";

import type { Prisma } from "@prisma/client";

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function isShortReferralCode(value: string | null | undefined): boolean {
  return Boolean(value && /^WB-\d{5,6}$/.test(value));
}

export async function createUniqueReferralCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = `WB-${randomInt(10000, 100000)}`;
    const existing = await tx.referralPartner.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `WB-${randomInt(100000, 1000000)}`;
    const existing = await tx.referralPartner.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Unable to generate a unique referral code");
}
