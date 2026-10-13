import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { AppError } from "@/server/http/app-error";
import { businessCategoryCoverStoragePrefix } from "@/server/media/storefront-default-branding";
import { S3StorageService } from "@/services/storage/s3-storage";
import { businessCategoryCoverConfirmSchema } from "@/validation/media";

async function mediaUrl(storageKey: string | null) {
  if (!storageKey) return null;
  try {
    return await new S3StorageService().getMediaUrl(storageKey);
  } catch {
    return null;
  }
}

async function category(categoryId: string) {
  const row = await prisma.businessCategory.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      defaultCoverStorageKey: true,
    },
  });
  if (!row) {
    throw new AppError({
      code: "BUSINESS_CATEGORY_NOT_FOUND",
      message: "Business category not found",
      status: 404,
    });
  }
  return row;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const row = await category(categoryId);
    return NextResponse.json({
      data: {
        businessCategory: {
          id: row.id,
          name: row.name,
          slug: row.slug,
        },
        defaultCoverStorageKey: row.defaultCoverStorageKey,
        defaultCoverUrl: await mediaUrl(row.defaultCoverStorageKey),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const row = await category(categoryId);
    const input = businessCategoryCoverConfirmSchema.parse(
      await readJsonBody(request),
    );

    if (!input.storageKey.startsWith(businessCategoryCoverStoragePrefix(row.id))) {
      throw new AppError({
        code: "INVALID_BUSINESS_COVER_KEY",
        message: "Uploaded cover does not belong to this business category",
        status: 400,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.businessCategory.update({
        where: { id: row.id },
        data: { defaultCoverStorageKey: input.storageKey },
        select: {
          id: true,
          name: true,
          slug: true,
          defaultCoverStorageKey: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_CATEGORY_DEFAULT_COVER_UPDATED",
          entityType: "BusinessCategory",
          entityId: row.id,
          metadata: {
            businessCategoryName: row.name,
            previousStorageKey: row.defaultCoverStorageKey,
            storageKey: input.storageKey,
          },
        },
      });

      return saved;
    });

    if (
      row.defaultCoverStorageKey &&
      row.defaultCoverStorageKey !== input.storageKey
    ) {
      try {
        await new S3StorageService().deleteObject(row.defaultCoverStorageKey);
      } catch {
        // Current DB state remains authoritative.
      }
    }

    return NextResponse.json({
      data: {
        businessCategory: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
        },
        defaultCoverStorageKey: updated.defaultCoverStorageKey,
        defaultCoverUrl: await mediaUrl(updated.defaultCoverStorageKey),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const row = await category(categoryId);

    await prisma.$transaction(async (tx) => {
      await tx.businessCategory.update({
        where: { id: row.id },
        data: { defaultCoverStorageKey: null },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_CATEGORY_DEFAULT_COVER_REMOVED",
          entityType: "BusinessCategory",
          entityId: row.id,
          metadata: {
            businessCategoryName: row.name,
            previousStorageKey: row.defaultCoverStorageKey,
          },
        },
      });
    });

    if (row.defaultCoverStorageKey) {
      try {
        await new S3StorageService().deleteObject(row.defaultCoverStorageKey);
      } catch {
        // DB removal remains authoritative.
      }
    }

    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
