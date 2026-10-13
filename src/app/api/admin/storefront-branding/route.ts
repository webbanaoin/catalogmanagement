import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { AppError } from "@/server/http/app-error";
import { platformBrandingStoragePrefix } from "@/server/media/storefront-default-branding";
import { S3StorageService } from "@/services/storage/s3-storage";
import {
  storefrontDefaultBrandingConfirmSchema,
  storefrontDefaultBrandingRemoveSchema,
} from "@/validation/media";

const PLATFORM_BRANDING_ID = "default";

async function mediaUrl(storageKey: string | null) {
  if (!storageKey) return null;
  try {
    return await new S3StorageService().getMediaUrl(storageKey);
  } catch {
    return null;
  }
}

async function getOrCreateBranding() {
  return prisma.platformBranding.upsert({
    where: { id: PLATFORM_BRANDING_ID },
    create: { id: PLATFORM_BRANDING_ID },
    update: {},
  });
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const row = await getOrCreateBranding();

    return NextResponse.json({
      data: {
        defaultLogoStorageKey: row.defaultLogoStorageKey,
        defaultLogoUrl: await mediaUrl(row.defaultLogoStorageKey),
        defaultCoverStorageKey: row.defaultCoverStorageKey,
        defaultCoverUrl: await mediaUrl(row.defaultCoverStorageKey),
        updatedAt: row.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = storefrontDefaultBrandingConfirmSchema.parse(
      await readJsonBody(request),
    );
    const expectedPrefix = platformBrandingStoragePrefix(input.kind);

    if (!input.storageKey.startsWith(expectedPrefix)) {
      throw new AppError({
        code: "INVALID_PLATFORM_BRANDING_KEY",
        message: "Uploaded image does not belong to platform branding",
        status: 400,
      });
    }

    const current = await getOrCreateBranding();
    const previousKey =
      input.kind === "logo"
        ? current.defaultLogoStorageKey
        : current.defaultCoverStorageKey;

    const updated = await prisma.$transaction(async (tx) => {
      const branding = await tx.platformBranding.update({
        where: { id: PLATFORM_BRANDING_ID },
        data:
          input.kind === "logo"
            ? { defaultLogoStorageKey: input.storageKey }
            : { defaultCoverStorageKey: input.storageKey },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action:
            input.kind === "logo"
              ? "PLATFORM_DEFAULT_LOGO_UPDATED"
              : "PLATFORM_DEFAULT_COVER_UPDATED",
          entityType: "PlatformBranding",
          entityId: PLATFORM_BRANDING_ID,
          metadata: {
            kind: input.kind,
            previousStorageKey: previousKey,
            storageKey: input.storageKey,
          },
        },
      });

      return branding;
    });

    if (previousKey && previousKey !== input.storageKey) {
      try {
        await new S3StorageService().deleteObject(previousKey);
      } catch {
        // DB state is authoritative; stale object cleanup is best effort.
      }
    }

    const key =
      input.kind === "logo"
        ? updated.defaultLogoStorageKey
        : updated.defaultCoverStorageKey;

    return NextResponse.json({
      data: {
        kind: input.kind,
        storageKey: key,
        url: await mediaUrl(key),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = storefrontDefaultBrandingRemoveSchema.parse(
      await readJsonBody(request),
    );
    const current = await getOrCreateBranding();
    const previousKey =
      input.kind === "logo"
        ? current.defaultLogoStorageKey
        : current.defaultCoverStorageKey;

    await prisma.$transaction(async (tx) => {
      await tx.platformBranding.update({
        where: { id: PLATFORM_BRANDING_ID },
        data:
          input.kind === "logo"
            ? { defaultLogoStorageKey: null }
            : { defaultCoverStorageKey: null },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action:
            input.kind === "logo"
              ? "PLATFORM_DEFAULT_LOGO_REMOVED"
              : "PLATFORM_DEFAULT_COVER_REMOVED",
          entityType: "PlatformBranding",
          entityId: PLATFORM_BRANDING_ID,
          metadata: { kind: input.kind, previousStorageKey: previousKey },
        },
      });
    });

    if (previousKey) {
      try {
        await new S3StorageService().deleteObject(previousKey);
      } catch {
        // DB removal is authoritative.
      }
    }

    return NextResponse.json({
      data: { kind: input.kind, removed: true },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
