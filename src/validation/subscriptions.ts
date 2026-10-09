import { z } from "zod";

const moneySchema = z.coerce.number().finite().min(0).max(100000000);
const productLimitSchema = z.coerce.number().int().min(1).max(100000);
const imageLimitSchema = z.coerce.number().int().min(1).max(50);
const trialDaysSchema = z.coerce.number().int().min(0).max(365);
const graceDaysSchema = z.coerce.number().int().min(0).max(90);

export const adminPlanCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  monthlyPrice: moneySchema.default(0),
  annualPrice: moneySchema.default(0),
  productLimit: productLimitSchema,
  imageLimitPerProduct: imageLimitSchema,
  analyticsEnabled: z.boolean().default(false),
  excelImportEnabled: z.boolean().default(false),
  customBrandingEnabled: z.boolean().default(false),
  trialDays: trialDaysSchema.default(0),
  graceDays: graceDaysSchema.default(0),
  isDefaultTrial: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const adminPlanUpdateSchema = adminPlanCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one plan field must be provided",
  });

export const adminSubscriptionAssignSchema = z
  .object({
    planId: z.string().trim().min(1),
    status: z.enum(["TRIAL", "ACTIVE"]).default("TRIAL"),
    durationDays: z.coerce.number().int().min(1).max(3660).optional(),
    graceDays: graceDaysSchema.optional(),
    paymentStatus: z
      .enum(["NOT_REQUIRED", "PENDING", "PAID", "WAIVED"])
      .default("NOT_REQUIRED"),
  })
  .superRefine((value, ctx) => {
    if (value.status === "ACTIVE" && value.durationDays === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["durationDays"],
        message: "durationDays is required for an ACTIVE subscription",
      });
    }
  });

export const adminSubscriptionUpdateSchema = z
  .object({
    planId: z.string().trim().min(1).optional(),
    extendDays: z.coerce.number().int().min(1).max(3660).optional(),
    graceDays: graceDaysSchema.optional(),
    status: z
      .enum(["TRIAL", "ACTIVE", "GRACE", "EXPIRED", "CANCELLED"])
      .optional(),
    paymentStatus: z
      .enum(["NOT_REQUIRED", "PENDING", "PAID", "WAIVED"])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one subscription field must be provided",
  });


const paymentAmountSchema = z.coerce.number().finite().positive().max(100000000);
const paymentExtendDaysSchema = z.coerce.number().int().min(0).max(3660);

export const adminPaymentCreateSchema = z
  .object({
    shopId: z.string().trim().min(1),
    amount: paymentAmountSchema,
    method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "OTHER"]),
    billingCycle: z
      .enum(["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"])
      .default("CUSTOM"),
    periodStartDate: z.string().trim().min(1).max(64).nullable().optional(),
    periodEndDate: z.string().trim().min(1).max(64).nullable().optional(),
    reference: z.string().trim().max(191).nullable().optional(),
    comment: z.string().trim().max(2000).nullable().optional(),
    receivedAt: z.string().trim().min(1).max(64).optional(),
    extendDays: paymentExtendDaysSchema.default(0),
    activateSubscription: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.method === "OTHER" && !value.comment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["comment"],
        message: "Comment is required when payment method is Other",
      });
    }

    if (value.periodStartDate && value.periodEndDate) {
      const start = new Date(value.periodStartDate);
      const end = new Date(value.periodEndDate);
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start > end
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["periodEndDate"],
          message: "Billing period end must be on or after billing period start",
        });
      }
    }
  });

export const adminPaymentListQuerySchema = z.object({
  shopId: z.string().trim().min(1).optional(),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "OTHER"]).optional(),
  billingCycle: z
    .enum(["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"])
    .optional(),
  from: z.string().trim().min(1).max(64).optional(),
  to: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});


export const merchantPaymentSubmissionSchema = z
  .object({
    amount: paymentAmountSchema,
    method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "OTHER"]),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
    paidAt: z.string().trim().min(1).max(64),
    recipientType: z.enum(["WEBBANAO", "REFERRAL_PARTNER", "OTHER"]),
    recipientName: z.string().trim().max(160).optional().nullable(),
    reference: z.string().trim().max(191).optional().nullable(),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "OTHER" && !value.comment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["comment"],
        message: "Add a note when payment method is Other",
      });
    }

    if (value.recipientType === "OTHER" && !value.recipientName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientName"],
        message: "Enter who received the payment",
      });
    }

    const paidAt = new Date(value.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAt"],
        message: "Payment date must be valid",
      });
    }
  });

export const adminPaymentSubmissionReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
    extendDays: paymentExtendDaysSchema.optional(),
    activateSubscription: z.boolean().default(true),
    comment: z.string().trim().max(2000).optional().nullable(),
  }),
  z.object({
    action: z.literal("REJECT"),
    comment: z.string().trim().min(2).max(2000),
  }),
]);

export const adminPaymentSubmissionListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  shopId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
