import { z } from "zod";

export const adminShopStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "ACTIVE"]),
});

export const adminShopListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED"]).default("PENDING"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
