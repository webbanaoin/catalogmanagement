import { z } from "zod";

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().nullable();
const httpUrl = z.string().trim().url().refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must use http or https").optional().nullable();
const money = z.coerce.number().min(0).max(9999999999.99).optional().nullable();

export const shopProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  businessCategoryId: z.string().min(1).optional().nullable(),
  tagline: optionalTrimmed(255), description: optionalTrimmed(10000),
  phone: optionalTrimmed(30), whatsapp: optionalTrimmed(30),
  email: z.string().trim().email().max(191).optional().nullable().or(z.literal("")),
  address: optionalTrimmed(500), city: optionalTrimmed(120), state: optionalTrimmed(120),
  pincode: optionalTrimmed(20), googleMapsUrl: httpUrl, instagramUrl: httpUrl, facebookUrl: httpUrl,
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const shopHoursSchema = z.object({ hours: z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6), isClosed: z.boolean(),
  openTime: time.optional().nullable(), closeTime: time.optional().nullable(),
}).superRefine((v,ctx) => {
  if (!v.isClosed && (!v.openTime || !v.closeTime)) ctx.addIssue({ code: "custom", message: "Open and close times are required when shop is open" });
})).max(7) }).superRefine((v,ctx) => {
  if (new Set(v.hours.map(h=>h.dayOfWeek)).size !== v.hours.length) ctx.addIssue({ code:"custom", message:"Each day may appear only once" });
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120), parentId: z.string().min(1).optional().nullable(),
  imageStorageKey: optionalTrimmed(512), displayOrder: z.number().int().min(0).max(100000).default(0),
  status: z.enum(["ACTIVE","INACTIVE"]).default("ACTIVE"),
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

const attributeSchema = z.object({ attributeName: z.string().trim().min(1).max(120), attributeValue: z.string().trim().min(1).max(500), displayOrder: z.number().int().min(0).default(0) });
export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(180), categoryId: z.string().min(1).optional().nullable(),
  sku: optionalTrimmed(100), description: optionalTrimmed(20000), price: money, discountPrice: money,
  priceType: z.enum(["FIXED","STARTING_FROM","ASK_PRICE"]).default("FIXED"),
  availabilityStatus: z.enum(["IN_STOCK","OUT_OF_STOCK","ON_REQUEST"]).default("IN_STOCK"),
  isFeatured: z.boolean().default(false), isNewArrival: z.boolean().default(false), isOffer: z.boolean().default(false), isVisible: z.boolean().default(true),
  attributes: z.array(attributeSchema).max(50).default([]),
}).superRefine((v,ctx) => {
  if (v.priceType !== "ASK_PRICE" && v.price == null) ctx.addIssue({code:"custom",path:["price"],message:"Price is required for fixed and starting-from pricing"});
  if (v.price != null && v.discountPrice != null && v.discountPrice > v.price) ctx.addIssue({code:"custom",path:["discountPrice"],message:"Discount price cannot exceed price"});
});
export const productUpdateSchema = productCreateSchema.partial();

export const productImageSchema = z.object({
  storageKey: z.string().trim().min(1).max(512), thumbnailKey: optionalTrimmed(512),
  displayOrder: z.number().int().min(0).default(0), isPrimary: z.boolean().default(false),
  fileSize: z.number().int().positive().optional().nullable(), mimeType: optionalTrimmed(100),
});
