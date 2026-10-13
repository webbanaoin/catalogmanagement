import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { createShopBrandingStorageKey } from "@/server/media/shop-branding";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { S3StorageService } from "@/services/storage/s3-storage";
import { shopBrandingUploadSchema } from "@/validation/media";

export async function POST(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    const { user } = await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    enforceRateLimit(
      `shop-branding:upload-url:${shopId}:${user.id}`,
      30,
      15 * 60 * 1000,
    );

    const input = shopBrandingUploadSchema.parse(await readJsonBody(request));
    const key = createShopBrandingStorageKey(shopId, input.kind, input.mimeType);

    let storage: S3StorageService;
    try {
      storage = new S3StorageService();
    } catch {
      throw new AppError({
        code: "STORAGE_NOT_CONFIGURED",
        message:
          "Image storage is not configured. Check AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and optional storage URL settings.",
        status: 503,
      });
    }

    let upload;
    try {
      upload = await storage.createUploadUrl({
        key,
        contentType: input.mimeType,
        contentLength: input.fileSize,
      });
    } catch {
      throw new AppError({
        code: "STORAGE_UNAVAILABLE",
        message:
          "Image storage could not create an upload URL. Check the storage endpoint, bucket, region and credentials.",
        status: 502,
      });
    }

    return NextResponse.json({ data: upload });
  } catch (error) {
    return errorResponse(error);
  }
}
