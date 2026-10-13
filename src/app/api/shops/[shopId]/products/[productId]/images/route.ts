import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { readJsonBody } from "@/server/http/json-body";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { productImageSchema } from "@/validation/catalog";
import { withProductImageUrls } from "@/server/media/media-response";
import { S3StorageService } from "@/services/storage/s3-storage";
import { requireImageCapacity } from "@/server/subscriptions/access";

export async function POST(
  r: Request,
  c: { params: Promise<{ shopId: string; productId: string }> },
) {
  try {
    const { shopId, productId } = await c.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireProductInShop(shopId, productId);

    const input = productImageSchema.parse(await readJsonBody(r));
    await requireImageCapacity(shopId, productId);
    const productStoragePrefix = `shops/${shopId}/products/${productId}/`;

    if (!input.storageKey.startsWith(productStoragePrefix)) {
      throw new AppError({
        code: "INVALID_STORAGE_KEY",
        message: "Image storage key does not belong to this product",
        status: 400,
      });
    }

    if (input.thumbnailKey && !input.thumbnailKey.startsWith(productStoragePrefix)) {
      throw new AppError({
        code: "INVALID_STORAGE_KEY",
        message: "Thumbnail storage key does not belong to this product",
        status: 400,
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const [existingCount, lastImage] = await Promise.all([
        tx.productImage.count({ where: { productId } }),
        tx.productImage.findFirst({
          where: { productId },
          orderBy: [{ displayOrder: "desc" }, { createdAt: "desc" }],
          select: { displayOrder: true },
        }),
      ]);
      const shouldBePrimary = input.isPrimary || existingCount === 0;
      const displayOrder =
        existingCount === 0
          ? 0
          : Math.max(input.displayOrder, (lastImage?.displayOrder ?? -1) + 1);

      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.create({
        data: { ...input, displayOrder, isPrimary: shouldBePrimary, productId },
      });
    });

    const responseData = await withProductImageUrls(data, new S3StorageService());
    return NextResponse.json({ data: responseData }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
