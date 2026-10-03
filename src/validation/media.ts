import { z } from "zod";

export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const productImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
});
