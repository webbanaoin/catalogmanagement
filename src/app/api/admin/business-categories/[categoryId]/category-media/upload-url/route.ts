import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { createGlobalCategoryMediaStorageKey } from "@/server/media/global-category-media";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { S3StorageService } from "@/services/storage/s3-storage";
import { globalCategoryMediaUploadSchema } from "@/validation/media";

export async function POST(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const input = globalCategoryMediaUploadSchema.parse(
      await readJsonBody(request),
    );

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

    const preset = getDefaultCategoryPreset(category);
    const categorySlug = toSlug(input.categorySlug);
    const categoryName = preset?.categories.find(
      (item) => toSlug(item) === categorySlug,
    );
    if (!categoryName) {
      throw new AppError({
        code: "CATEGORY_PRESET_NOT_FOUND",
        message: "This category is not part of the configured preset for this business type",
        status: 404,
      });
    }

    enforceRateLimit(
      `global-category-media:upload:${category.id}:${admin.id}`,
      60,
      15 * 60 * 1000,
    );

    const key = createGlobalCategoryMediaStorageKey(
      category.id,
      categorySlug,
      input.mimeType,
    );

    let storage: S3StorageService;
    try {
      storage = new S3StorageService();
    } catch {
      throw new AppError({
        code: "STORAGE_NOT_CONFIGURED",
        message: "Image storage is not configured for category media",
        status: 503,
      });
    }

    try {
      const upload = await storage.createUploadUrl({
        key,
        contentType: input.mimeType,
        contentLength: input.fileSize,
      });
      return NextResponse.json({
        data: {
          ...upload,
          categoryName,
          categorySlug,
        },
      });
    } catch {
      throw new AppError({
        code: "STORAGE_UNAVAILABLE",
        message: "Image storage could not create a category image upload URL",
        status: 502,
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
