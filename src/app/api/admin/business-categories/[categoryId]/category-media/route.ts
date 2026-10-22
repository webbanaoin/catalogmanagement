import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { listBusinessCategoryDefaults } from "@/server/catalog/business-category-defaults";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { globalCategoryMediaStoragePrefix } from "@/server/media/global-category-media";
import { S3StorageService } from "@/services/storage/s3-storage";
import {
  globalCategoryMediaConfirmSchema,
  globalCategoryMediaRemoveSchema,
} from "@/validation/media";

async function businessCategory(categoryId: string) {
  const category = await prisma.businessCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });
  if (!category) {
    throw new AppError({
      code: "BUSINESS_CATEGORY_NOT_FOUND",
      message: "Business category not found",
      status: 404,
    });
  }
  return category;
}

async function presetCategory(
  category: { id: string; name: string; slug: string },
  categorySlug: string,
) {
  const definitions = await prisma.$transaction((tx) =>
    listBusinessCategoryDefaults(tx, category),
  );
  const normalized = toSlug(categorySlug);
  const match = definitions.find((item) =>
    item.slug === normalized && item.status === "ACTIVE",
  );
  if (!match) {
    throw new AppError({
      code: "DEFAULT_CATEGORY_NOT_FOUND",
      message: "This subcategory is not active for this business type",
      status: 404,
    });
  }
  return { name: match.name, slug: match.slug, displayOrder: match.displayOrder };
}

async function mediaUrl(storageKey: string | null) {
  if (!storageKey) return null;
  try {
    return await new S3StorageService().getMediaUrl(storageKey);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const category = await businessCategory(categoryId);
    const definitions = await prisma.$transaction((tx) =>
      listBusinessCategoryDefaults(tx, category),
    );
    const active = definitions.filter((item) => item.status === "ACTIVE");
    const rows = await prisma.businessCategoryMedia.findMany({
      where: { businessCategoryId: category.id },
    });
    const bySlug = new Map(rows.map((row) => [row.categorySlug, row]));

    const items = await Promise.all(
      active.map(async (definition) => {
        const row = bySlug.get(definition.slug) ?? null;
        return {
          categoryName: definition.name,
          categorySlug: definition.slug,
          displayOrder: definition.displayOrder,
          imageStorageKey: row?.imageStorageKey ?? null,
          visibleAsProductDefault: row?.visibleAsProductDefault ?? false,
          imageUrl: await mediaUrl(row?.imageStorageKey ?? null),
          updatedAt: row?.updatedAt ?? null,
        };
      }),
    );

    return NextResponse.json({
      businessCategory: category,
      presetKey: active.length ? category.slug : null,
      items,
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
    const category = await businessCategory(categoryId);
    const input = globalCategoryMediaConfirmSchema.parse(
      await readJsonBody(request),
    );
    const preset = await presetCategory(category, input.categorySlug);
    const prefix = globalCategoryMediaStoragePrefix(
      category.id,
      preset.slug,
    );

    if (!input.storageKey.startsWith(prefix)) {
      throw new AppError({
        code: "INVALID_CATEGORY_MEDIA_KEY",
        message: "Uploaded image does not belong to this business category",
        status: 400,
      });
    }

    const previous = await prisma.businessCategoryMedia.findUnique({
      where: {
        businessCategoryId_categorySlug: {
          businessCategoryId: category.id,
          categorySlug: preset.slug,
        },
      },
    });

    const data = await prisma.$transaction(async (tx) => {
      const saved = await tx.businessCategoryMedia.upsert({
        where: {
          businessCategoryId_categorySlug: {
            businessCategoryId: category.id,
            categorySlug: preset.slug,
          },
        },
        create: {
          businessCategoryId: category.id,
          categorySlug: preset.slug,
          categoryName: preset.name,
          imageStorageKey: input.storageKey,
        },
        update: {
          categoryName: preset.name,
          imageStorageKey: input.storageKey,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: previous
            ? "GLOBAL_CATEGORY_IMAGE_REPLACED"
            : "GLOBAL_CATEGORY_IMAGE_CREATED",
          entityType: "BusinessCategoryMedia",
          entityId: saved.id,
          metadata: {
            businessCategoryId: category.id,
            businessCategoryName: category.name,
            categorySlug: preset.slug,
            categoryName: preset.name,
            previousStorageKey: previous?.imageStorageKey ?? null,
            storageKey: input.storageKey,
          },
        },
      });

      return saved;
    });

    if (
      previous?.imageStorageKey &&
      previous.imageStorageKey !== input.storageKey
    ) {
      try {
        await new S3StorageService().deleteObject(previous.imageStorageKey);
      } catch {
        // The current DB row is authoritative. Old object cleanup is best-effort.
      }
    }

    return NextResponse.json({
      data: {
        categoryName: data.categoryName,
        categorySlug: data.categorySlug,
        displayOrder: preset.displayOrder,
        imageStorageKey: data.imageStorageKey,
        visibleAsProductDefault: data.visibleAsProductDefault,
        imageUrl: await mediaUrl(data.imageStorageKey),
        updatedAt: data.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// Enable only after an image is uploaded. This is independent of the
// category cover shown in the category gallery; actual product photos win.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const category = await businessCategory(categoryId);
    const input = z.object({
      categorySlug: z.string().trim().min(1).max(160),
      visibleAsProductDefault: z.boolean(),
    }).parse(await readJsonBody(request));
    const preset = await presetCategory(category, input.categorySlug);
    const row = await prisma.businessCategoryMedia.findUnique({
      where: {
        businessCategoryId_categorySlug: {
          businessCategoryId: category.id,
          categorySlug: preset.slug,
        },
      },
    });
    if (!row) {
      throw new AppError({
        code: "CATEGORY_IMAGE_REQUIRED",
        message: "Upload a category image before enabling Visible as Default.",
        status: 409,
      });
    }
    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.businessCategoryMedia.update({
        where: { id: row.id },
        data: { visibleAsProductDefault: input.visibleAsProductDefault },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "CATEGORY_PRODUCT_DEFAULT_VISIBILITY_CHANGED",
          entityType: "BusinessCategoryMedia",
          entityId: row.id,
          metadata: {
            businessCategoryId: category.id,
            categorySlug: preset.slug,
            visibleAsProductDefault: input.visibleAsProductDefault,
          },
        },
      });
      return updated;
    });
    return NextResponse.json({
      data: {
        categoryName: data.categoryName,
        categorySlug: data.categorySlug,
        displayOrder: preset.displayOrder,
        imageStorageKey: data.imageStorageKey,
        visibleAsProductDefault: data.visibleAsProductDefault,
        imageUrl: await mediaUrl(data.imageStorageKey),
        updatedAt: data.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const category = await businessCategory(categoryId);
    const input = globalCategoryMediaRemoveSchema.parse(
      await readJsonBody(request),
    );
    const preset = await presetCategory(category, input.categorySlug);

    const existing = await prisma.businessCategoryMedia.findUnique({
      where: {
        businessCategoryId_categorySlug: {
          businessCategoryId: category.id,
          categorySlug: preset.slug,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ data: { removed: false } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessCategoryMedia.delete({
        where: { id: existing.id },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "GLOBAL_CATEGORY_IMAGE_REMOVED",
          entityType: "BusinessCategoryMedia",
          entityId: existing.id,
          metadata: {
            businessCategoryId: category.id,
            businessCategoryName: category.name,
            categorySlug: preset.slug,
            categoryName: preset.name,
            storageKey: existing.imageStorageKey,
          },
        },
      });
    });

    try {
      await new S3StorageService().deleteObject(existing.imageStorageKey);
    } catch {
      // DB removal succeeds even if object cleanup is temporarily unavailable.
    }

    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
