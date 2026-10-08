import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { shopBrandingStoragePrefix } from "@/server/media/shop-branding";
import { resolveShopBranding } from "@/server/media/shop-branding-resolver";
import { S3StorageService } from "@/services/storage/s3-storage";
import {
  shopBrandingConfirmSchema,
  shopBrandingRemoveSchema,
} from "@/validation/media";

async function storageService(): Promise<S3StorageService> {
  try {
    return new S3StorageService();
  } catch {
    throw new AppError({
      code: "STORAGE_NOT_CONFIGURED",
      message:
        "Image storage is not configured. Check AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and optional storage URL settings.",
      status: 503,
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    const input = shopBrandingConfirmSchema.parse(await readJsonBody(request));
    const expectedPrefix = shopBrandingStoragePrefix(shopId, input.kind);

    if (!input.storageKey.startsWith(expectedPrefix)) {
      throw new AppError({
        code: "INVALID_STORAGE_KEY",
        message: "Branding image storage key does not belong to this shop",
        status: 400,
      });
    }

    const existing = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        logoStorageKey: true,
        coverStorageKey: true,
        businessCategory: {
          select: { defaultCoverStorageKey: true },
        },
      },
    });
    if (!existing) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    const previousKey =
      input.kind === "logo" ? existing.logoStorageKey : existing.coverStorageKey;

    await prisma.shop.update({
      where: { id: shopId },
      data:
        input.kind === "logo"
          ? { logoStorageKey: input.storageKey }
          : { coverStorageKey: input.storageKey },
    });

    const storage = await storageService();

    if (previousKey && previousKey !== input.storageKey) {
      try {
        await storage.deleteObject(previousKey);
      } catch {
        // The new branding image is already committed. Orphan cleanup can be retried later.
      }
    }

    const branding = await resolveShopBranding({
      logoStorageKey:
        input.kind === "logo" ? input.storageKey : existing.logoStorageKey,
      coverStorageKey:
        input.kind === "cover" ? input.storageKey : existing.coverStorageKey,
      businessCategoryDefaultCoverStorageKey:
        existing.businessCategory?.defaultCoverStorageKey ?? null,
    });

    return NextResponse.json({
      data: {
        kind: input.kind,
        storageKey: input.storageKey,
        url: input.kind === "logo" ? branding.logoUrl : branding.coverUrl,
        source: "SHOP",
        effectiveLogoUrl: branding.logoUrl,
        effectiveCoverUrl: branding.coverUrl,
        logoSource: branding.logoSource,
        coverSource: branding.coverSource,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    const input = shopBrandingRemoveSchema.parse(await readJsonBody(request));
    const existing = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        logoStorageKey: true,
        coverStorageKey: true,
        businessCategory: {
          select: { defaultCoverStorageKey: true },
        },
      },
    });
    if (!existing) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    const previousKey =
      input.kind === "logo" ? existing.logoStorageKey : existing.coverStorageKey;

    await prisma.shop.update({
      where: { id: shopId },
      data:
        input.kind === "logo"
          ? { logoStorageKey: null }
          : { coverStorageKey: null },
    });

    if (previousKey) {
      try {
        const storage = await storageService();
        await storage.deleteObject(previousKey);
      } catch {
        // DB removal is authoritative even when object cleanup is temporarily unavailable.
      }
    }

    const branding = await resolveShopBranding({
      logoStorageKey:
        input.kind === "logo" ? null : existing.logoStorageKey,
      coverStorageKey:
        input.kind === "cover" ? null : existing.coverStorageKey,
      businessCategoryDefaultCoverStorageKey:
        existing.businessCategory?.defaultCoverStorageKey ?? null,
    });

    return NextResponse.json({
      data: {
        kind: input.kind,
        removed: true,
        effectiveLogoUrl: branding.logoUrl,
        effectiveCoverUrl: branding.coverUrl,
        logoSource: branding.logoSource,
        coverSource: branding.coverSource,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
