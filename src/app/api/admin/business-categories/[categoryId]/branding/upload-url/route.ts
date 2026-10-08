import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { AppError } from "@/server/http/app-error";
import { createBusinessCategoryCoverStorageKey } from "@/server/media/storefront-default-branding";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { S3StorageService } from "@/services/storage/s3-storage";
import { businessCategoryCoverUploadSchema } from "@/validation/media";

export async function POST(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const input = businessCategoryCoverUploadSchema.parse(
      await readJsonBody(request),
    );

    const category = await prisma.businessCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new AppError({
        code: "BUSINESS_CATEGORY_NOT_FOUND",
        message: "Business category not found",
        status: 404,
      });
    }

    enforceRateLimit(
      `business-category-cover:upload:${category.id}:${admin.id}`,
      30,
      15 * 60 * 1000,
    );

    const key = createBusinessCategoryCoverStorageKey(
      category.id,
      input.mimeType,
    );

    let storage: S3StorageService;
    try {
      storage = new S3StorageService();
    } catch {
      throw new AppError({
        code: "STORAGE_NOT_CONFIGURED",
        message: "Image storage is not configured for business covers",
        status: 503,
      });
    }

    try {
      const upload = await storage.createUploadUrl({
        key,
        contentType: input.mimeType,
        contentLength: input.fileSize,
      });
      return NextResponse.json({ data: upload });
    } catch {
      throw new AppError({
        code: "STORAGE_UNAVAILABLE",
        message: "Image storage could not create a cover upload URL",
        status: 502,
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
