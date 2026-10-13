import "server-only";

import { randomUUID } from "node:crypto";

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function createGlobalCategoryMediaStorageKey(
  businessCategoryId: string,
  categorySlug: string,
  mimeType: string,
): string {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error("Unsupported category media image MIME type");
  }

  return `business-categories/${businessCategoryId}/categories/${categorySlug}/${randomUUID()}.${extension}`;
}

export function globalCategoryMediaStoragePrefix(
  businessCategoryId: string,
  categorySlug: string,
): string {
  return `business-categories/${businessCategoryId}/categories/${categorySlug}/`;
}
