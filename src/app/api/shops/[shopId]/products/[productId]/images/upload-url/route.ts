import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { errorResponse } from "@/server/http/error-response";
import { createProductImageStorageKey } from "@/server/media/product-image";
import { S3StorageService } from "@/services/storage/s3-storage";
import { productImageUploadSchema } from "@/validation/media";

export async function POST(
  request: Request,
  context: { params: Promise<{ shopId: string; productId: string }> },
) {
  try {
    const { shopId, productId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireProductInShop(shopId, productId);

    const input = productImageUploadSchema.parse(await request.json());
    const key = createProductImageStorageKey(shopId, productId, input.mimeType);
    const storage = new S3StorageService();

    const upload = await storage.createUploadUrl({
      key,
      contentType: input.mimeType,
      contentLength: input.fileSize,
    });

    return NextResponse.json({ data: upload });
  } catch (error) {
    return errorResponse(error);
  }
}
