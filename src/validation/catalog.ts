import { z } from "zod";
import { isValidIndianMobile, isValidIndianPhone, isValidIndianPincode } from "@/lib/validation";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_MIME_TYPES } from "@/validation/media";

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalValidated = (max:number, validator:(v:string)=>boolean, message:string) =>
  z.string().trim().max(max).refine(v => !v || validator(v), message).optional().nullable();
const httpUrl = z.union([z.literal(""), z.string().trim().url().refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must use http or https")]).optional().nullable();
const money = z.coerce.number().min(0).max(9999999999.99).optional().nullable();

export const shopProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  businessCategoryId: z.string().min(1).optional().nullable(),
  tagline: optionalTrimmed(255), description: optionalTrimmed(10000),
  phone: optionalValidated(30,isValidIndianPhone,"Enter a valid Indian phone number"),
  whatsapp: optionalValidated(30,isValidIndianMobile,"Enter a valid 10-digit Indian WhatsApp number"),
  email: z.string().trim().email().max(191).optional().nullable().or(z.literal("")),
  address: optionalTrimmed(500), city: optionalTrimmed(120), state: optionalTrimmed(120),
  pincode: optionalValidated(20,isValidIndianPincode,"Enter a valid 6-digit Indian PIN"),
  googleMapsUrl: httpUrl, instagramUrl: httpUrl, facebookUrl: httpUrl,
  showProductPrices: z.boolean().optional(),
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
const productFields = {
  name: z.string().trim().min(1).max(180), categoryId: z.string().min(1).optional().nullable(),
  sku: optionalTrimmed(100), description: optionalTrimmed(20000), price: money, discountPrice: money,
  priceType: z.enum(["FIXED","STARTING_FROM","ASK_PRICE"]),
  availabilityStatus: z.enum(["IN_STOCK","OUT_OF_STOCK","ON_REQUEST"]),
  isFeatured: z.boolean(), isNewArrival: z.boolean(), isOffer: z.boolean(), isVisible: z.boolean(),
  showPrice: z.boolean().optional().nullable(),
  attributes: z.array(attributeSchema).max(50),
};
function productRules(v:{priceType?:string;price?:number|null;discountPrice?:number|null},ctx:z.RefinementCtx){
  if (v.price == null && v.discountPrice != null) ctx.addIssue({code:"custom",path:["discountPrice"],message:"Discount price requires a base price"});
  if (v.price != null && v.discountPrice != null && v.discountPrice > v.price) ctx.addIssue({code:"custom",path:["discountPrice"],message:"Discount price cannot exceed price"});
}
export const productCreateSchema = z.object({
  ...productFields,
  priceType: productFields.priceType.default("FIXED"), availabilityStatus: productFields.availabilityStatus.default("IN_STOCK"),
  isFeatured: productFields.isFeatured.default(false), isNewArrival: productFields.isNewArrival.default(false),
  isOffer: productFields.isOffer.default(false), isVisible: productFields.isVisible.default(true),
  attributes: productFields.attributes.default([]),
}).superRefine(productRules);
export const productUpdateSchema = z.object(productFields).partial().superRefine(productRules);

export const productImageSchema = z.object({
  storageKey: z.string().trim().min(1).max(512), thumbnailKey: optionalTrimmed(512),
  displayOrder: z.number().int().min(0).default(0), isPrimary: z.boolean().default(false),
  fileSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES), mimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
});


export const productImageUpdateSchema = z.object({
  displayOrder: z.number().int().min(0).max(100000).optional(),
  isPrimary: z.boolean().optional(),
}).refine((value) => value.displayOrder !== undefined || value.isPrimary !== undefined, {
  message: "At least one image field must be provided",
});


export const productDuplicateSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  sku: optionalTrimmed(100),
});
