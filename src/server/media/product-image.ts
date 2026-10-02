import "server-only";

import { randomUUID } from "node:crypto";

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function createProductImageStorageKey(
  shopId: string,
  productId: string,
  mimeType: string,
): string {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error("Unsupported product image MIME type");
  }

  return `shops/${shopId}/products/${productId}/${randomUUID()}.${extension}`;
}
