import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { S3StorageService } from "@/services/storage/s3-storage";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ shopId: string; productId: string; imageId: string }> },
) {
  try {
    const { shopId, productId, imageId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireProductInShop(shopId, productId);

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new AppError({
        code: "PRODUCT_IMAGE_NOT_FOUND",
        message: "Product image metadata not found",
        status: 404,
      });
    }

    const storage = new S3StorageService();
    await storage.deleteObject(image.storageKey);

    if (image.thumbnailKey && image.thumbnailKey !== image.storageKey) {
      await storage.deleteObject(image.thumbnailKey);
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
