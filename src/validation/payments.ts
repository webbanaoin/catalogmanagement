import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const adminPaymentCreateSchema = z.object({
  amount: z.coerce.number().min(0).max(9_999_999_999.99),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "WAIVED"]),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "ONLINE", "OTHER"]),
  paymentDate: z.string().trim().min(1),
  referenceId: optionalText(191),
  gatewayOrderId: optionalText(191),
  gatewayPaymentId: optionalText(191),
  notes: optionalText(2000),
  extendDays: z.coerce.number().int().min(1).max(3660).optional(),
});
