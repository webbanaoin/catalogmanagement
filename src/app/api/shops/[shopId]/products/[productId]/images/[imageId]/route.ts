import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { S3StorageService } from "@/services/storage/s3-storage";
import { readJsonBody } from "@/server/http/json-body";
import { withProductImageUrls } from "@/server/media/media-response";
import { productImageUpdateSchema } from "@/validation/catalog";


export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string; productId: string; imageId: string }> },
) {
  try {
    const { shopId, productId, imageId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireProductInShop(shopId, productId);

    const existing = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!existing) {
      throw new AppError({
        code: "PRODUCT_IMAGE_NOT_FOUND",
        message: "Product image metadata not found",
        status: 404,
      });
    }

    const input = productImageUpdateSchema.parse(await readJsonBody(request));
    const data = await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId, id: { not: imageId } },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.update({
        where: { id: imageId },
        data: input,
      });
    });

    const responseData = await withProductImageUrls(data, new S3StorageService());
    return NextResponse.json({ data: responseData });
  } catch (error) {
    return errorResponse(error);
  }
}

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
