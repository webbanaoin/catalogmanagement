import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { AppError } from "@/server/http/app-error";
import { createPlatformBrandingStorageKey } from "@/server/media/storefront-default-branding";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { S3StorageService } from "@/services/storage/s3-storage";
import { storefrontDefaultBrandingUploadSchema } from "@/validation/media";

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = storefrontDefaultBrandingUploadSchema.parse(
      await readJsonBody(request),
    );

    enforceRateLimit(
      `platform-branding:upload:${admin.id}`,
      30,
      15 * 60 * 1000,
    );

    const key = createPlatformBrandingStorageKey(input.kind, input.mimeType);

    let storage: S3StorageService;
    try {
      storage = new S3StorageService();
    } catch {
      throw new AppError({
        code: "STORAGE_NOT_CONFIGURED",
        message: "Image storage is not configured for platform branding",
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
        message: "Image storage could not create a branding upload URL",
        status: 502,
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
