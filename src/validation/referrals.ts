import { z } from "zod";

import { isValidIndianMobile } from "@/lib/validation";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const password = z
  .string()
  .min(10, "Password must contain at least 10 characters")
  .max(128, "Password must contain at most 128 characters");

const money = z.coerce.number().finite().min(0).max(10000000);

export const partnerRegisterSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    mobile: z
      .string()
      .trim()
      .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number"),
    password,
    confirmPassword: z.string().min(1).max(128),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    marketingArea: z.string().trim().max(255).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const partnerLoginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const adminReferralSettingsSchema = z.object({
  isEnabled: z.boolean(),
  commissionMode: z.enum([
    "FIRST_PAID_SUBSCRIPTION",
    "EVERY_ELIGIBLE_PAYMENT",
  ]),
  monthlyCommission: money,
  yearlyCommission: money,
});

export const adminReferralPartnerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED"]),
  note: z.string().trim().max(1000).optional().nullable(),
  regenerateCode: z.boolean().optional().default(false),
});

export const adminShopReferralSchema = z.object({
  referralPartnerId: z.string().trim().min(1).nullable(),
});

export const adminReferralCommissionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("PAY"),
    payoutMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "OTHER"]),
    paidAt: z.string().trim().min(1).max(64).optional(),
    reference: z.string().trim().max(191).optional().nullable(),
    comment: z.string().trim().max(2000).optional().nullable(),
  }),
  z.object({
    action: z.literal("CANCEL"),
    comment: z.string().trim().min(2).max(2000),
  }),
]);

export const adminReferralPartnerListQuerySchema = z.object({
  status: z
    .enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminReferralCommissionListQuerySchema = z.object({
  status: z.enum(["EARNED", "PAID", "CANCELLED"]).optional(),
  partnerId: z.string().trim().min(1).optional(),
  shopId: z.string().trim().min(1).optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const referralCodeInputSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .transform((value) => value.toUpperCase());
