import "server-only";

import { randomUUID } from "node:crypto";

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extensionFor(mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) throw new Error("Unsupported storefront branding MIME type");
  return extension;
}

export type PlatformBrandingKind = "logo" | "cover";

export function createPlatformBrandingStorageKey(
  kind: PlatformBrandingKind,
  mimeType: string,
) {
  return `platform/branding/${kind}/${randomUUID()}.${extensionFor(mimeType)}`;
}

export function platformBrandingStoragePrefix(kind: PlatformBrandingKind) {
  return `platform/branding/${kind}/`;
}

export function createBusinessCategoryCoverStorageKey(
  businessCategoryId: string,
  mimeType: string,
) {
  return `business-categories/${businessCategoryId}/cover/${randomUUID()}.${extensionFor(mimeType)}`;
}

export function businessCategoryCoverStoragePrefix(
  businessCategoryId: string,
) {
  return `business-categories/${businessCategoryId}/cover/`;
}
