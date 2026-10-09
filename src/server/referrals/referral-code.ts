import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function nameToken(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10) || "PARTNER"
  );
}

export async function createUniqueReferralCode(
  tx: Prisma.TransactionClient,
  partnerName: string,
): Promise<string> {
  const base = `WEB-${nameToken(partnerName)}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
    const candidate = `${base}-${suffix}`;
    const existing = await tx.referralPartner.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `WEB-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}
