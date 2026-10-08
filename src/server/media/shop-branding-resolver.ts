import "server-only";

import { prisma } from "@/server/database/prisma";
import { S3StorageService } from "@/services/storage/s3-storage";

export type ShopBrandingSource =
  | "SHOP"
  | "BUSINESS_DEFAULT"
  | "PLATFORM_DEFAULT"
  | "NONE";

let storageService: S3StorageService | null | undefined;

function storage(): S3StorageService | null {
  if (storageService !== undefined) return storageService;
  try {
    storageService = new S3StorageService();
  } catch {
    storageService = null;
  }
  return storageService;
}

async function mediaUrl(storageKey: string | null | undefined) {
  if (!storageKey) return null;
  try {
    return (await storage()?.getMediaUrl(storageKey)) ?? null;
  } catch {
    return null;
  }
}

export async function getPlatformBrandingRecord() {
  return prisma.platformBranding.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function resolveShopBranding(input: {
  logoStorageKey: string | null;
  coverStorageKey: string | null;
  businessCategoryDefaultCoverStorageKey?: string | null;
}) {
  const platform = await getPlatformBrandingRecord();

  const effectiveLogoKey =
    input.logoStorageKey ?? platform.defaultLogoStorageKey ?? null;
  const logoSource: ShopBrandingSource = input.logoStorageKey
    ? "SHOP"
    : platform.defaultLogoStorageKey
      ? "PLATFORM_DEFAULT"
      : "NONE";

  const effectiveCoverKey =
    input.coverStorageKey ??
    input.businessCategoryDefaultCoverStorageKey ??
    platform.defaultCoverStorageKey ??
    null;
  const coverSource: ShopBrandingSource = input.coverStorageKey
    ? "SHOP"
    : input.businessCategoryDefaultCoverStorageKey
      ? "BUSINESS_DEFAULT"
      : platform.defaultCoverStorageKey
        ? "PLATFORM_DEFAULT"
        : "NONE";

  const [logoUrl, coverUrl, customLogoUrl, customCoverUrl] = await Promise.all([
    mediaUrl(effectiveLogoKey),
    mediaUrl(effectiveCoverKey),
    mediaUrl(input.logoStorageKey),
    mediaUrl(input.coverStorageKey),
  ]);

  return {
    logoUrl,
    coverUrl,
    customLogoUrl,
    customCoverUrl,
    logoSource,
    coverSource,
    effectiveLogoStorageKey: effectiveLogoKey,
    effectiveCoverStorageKey: effectiveCoverKey,
  };
}
