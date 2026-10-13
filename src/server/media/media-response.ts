import "server-only";

import type { ProductImage } from "@prisma/client";

import type { StorageService } from "@/services/storage/types";

export async function withProductImageUrls<T extends ProductImage>(
  image: T,
  storage: StorageService,
) {
  const [url, thumbnailUrl] = await Promise.all([
    storage.getMediaUrl(image.storageKey),
    image.thumbnailKey ? storage.getMediaUrl(image.thumbnailKey) : Promise.resolve(null),
  ]);

  return { ...image, url, thumbnailUrl };
}

export async function withProductImagesUrls<T extends ProductImage>(
  images: T[],
  storage: StorageService,
) {
  return Promise.all(images.map((image) => withProductImageUrls(image, storage)));
}
