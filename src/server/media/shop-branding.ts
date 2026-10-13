import "server-only";

import { randomUUID } from "node:crypto";

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ShopBrandingKind = "logo" | "cover";

export function createShopBrandingStorageKey(
  shopId: string,
  kind: ShopBrandingKind,
  mimeType: string,
): string {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new Error("Unsupported shop branding image MIME type");
  }

  return `shops/${shopId}/branding/${kind}/${randomUUID()}.${extension}`;
}

export function shopBrandingStoragePrefix(
  shopId: string,
  kind: ShopBrandingKind,
): string {
  return `shops/${shopId}/branding/${kind}/`;
}
