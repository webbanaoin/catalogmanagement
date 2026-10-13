import { z } from "zod";

export const adminShopStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "ACTIVE"]),
});

export const adminShopListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED"]).default("PENDING"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminShopBusinessCategorySchema = z.object({
  businessCategoryId: z.string().trim().min(1, "Select a business type"),
});

const adminBusinessCategoryBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must contain at least 2 characters")
    .max(120, "Category name must contain at most 120 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug cannot be blank")
    .max(160, "Slug must contain at most 160 characters")
    .optional(),
  icon: z
    .string()
    .trim()
    .max(255, "Icon must contain at most 255 characters")
    .nullable()
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
});

export const adminBusinessCategoryCreateSchema =
  adminBusinessCategoryBaseSchema;

export const adminBusinessCategoryUpdateSchema =
  adminBusinessCategoryBaseSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided",
    });
