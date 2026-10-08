import { z } from "zod";

export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const productImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
});


export const SHOP_BRANDING_IMAGE_MIME_TYPES = PRODUCT_IMAGE_MIME_TYPES;
export const SHOP_BRANDING_IMAGE_MAX_BYTES = PRODUCT_IMAGE_MAX_BYTES;

export const shopBrandingUploadSchema = z.object({
  kind: z.enum(["logo", "cover"]),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(SHOP_BRANDING_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(SHOP_BRANDING_IMAGE_MAX_BYTES),
});

export const shopBrandingConfirmSchema = z.object({
  kind: z.enum(["logo", "cover"]),
  storageKey: z.string().trim().min(1).max(512),
});

export const shopBrandingRemoveSchema = z.object({
  kind: z.enum(["logo", "cover"]),
});


export const GLOBAL_CATEGORY_MEDIA_MIME_TYPES = PRODUCT_IMAGE_MIME_TYPES;
export const GLOBAL_CATEGORY_MEDIA_MAX_BYTES = PRODUCT_IMAGE_MAX_BYTES;

export const globalCategoryMediaUploadSchema = z.object({
  categorySlug: z.string().trim().min(1).max(160),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(GLOBAL_CATEGORY_MEDIA_MIME_TYPES),
  fileSize: z.number().int().positive().max(GLOBAL_CATEGORY_MEDIA_MAX_BYTES),
});

export const globalCategoryMediaConfirmSchema = z.object({
  categorySlug: z.string().trim().min(1).max(160),
  storageKey: z.string().trim().min(1).max(512),
});

export const globalCategoryMediaRemoveSchema = z.object({
  categorySlug: z.string().trim().min(1).max(160),
});


export const storefrontDefaultBrandingUploadSchema = z.object({
  kind: z.enum(["logo", "cover"]),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
});

export const storefrontDefaultBrandingConfirmSchema = z.object({
  kind: z.enum(["logo", "cover"]),
  storageKey: z.string().trim().min(1).max(512),
});

export const storefrontDefaultBrandingRemoveSchema = z.object({
  kind: z.enum(["logo", "cover"]),
});

export const businessCategoryCoverUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
});

export const businessCategoryCoverConfirmSchema = z.object({
  storageKey: z.string().trim().min(1).max(512),
});
