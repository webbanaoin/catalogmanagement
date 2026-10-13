import { z } from "zod";

export const publicAnalyticsEventSchema = z
  .object({
    eventType: z.enum([
      "CATALOG_VISIT",
      "PRODUCT_VIEW",
      "WHATSAPP",
      "CALL",
      "DIRECTIONS",
      "SHARE",
      "PWA_INSTALL",
    ]),
    sessionId: z.string().trim().min(8).max(128).optional(),
    productSlug: z.string().trim().min(1).max(191).optional(),
    source: z.string().trim().min(1).max(80).optional(),
    deviceType: z
      .enum(["MOBILE", "TABLET", "DESKTOP", "OTHER", "UNKNOWN"])
      .default("UNKNOWN"),
  })
  .superRefine((value, ctx) => {
    if (value.eventType === "PRODUCT_VIEW" && !value.productSlug) {
      ctx.addIssue({
        code: "custom",
        path: ["productSlug"],
        message: "productSlug is required for product views",
      });
    }
  });
