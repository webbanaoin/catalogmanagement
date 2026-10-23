import "server-only";

import { prisma } from "@/server/database/prisma";

/**
 * Marketing attribution is advisory and never changes referral ownership,
 * customer entitlements or commission eligibility.
 * Runs only after a successful registration transaction commits.
 */
export async function recordGrowthConversion(
  sourceShopSlug: string | undefined,
  eventType: "MERCHANT_REGISTERED" | "PARTNER_REGISTERED",
  convertedEntityId: string,
): Promise<void> {
  if (!sourceShopSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceShopSlug) ||
      sourceShopSlug.length > 191) return;

  try {
    const source = await prisma.shop.findFirst({
      where: { slug: sourceShopSlug, status: "ACTIVE" },
      select: { id: true },
    });
    if (!source) return;
    await prisma.storefrontGrowthEvent.create({
      data: {
        sourceShopId: source.id,
        eventType,
        convertedEntityId,
      },
    });
  } catch (error) {
    // Analytics or migration problems must never turn a genuine completed
    // merchant/partner signup into a false registration error.
    console.error("[growth-analytics] Conversion attribution unavailable", {
      type: eventType,
      errorCode: error && typeof error === "object" && "code" in error
        ? String(error.code).slice(0, 20) : "UNKNOWN",
    });
  }
}
