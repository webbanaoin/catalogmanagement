import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const sendRegistrationOtpSchema = z.object({
  email,
  purpose: z.enum(["MERCHANT", "PARTNER"]),
});
export const verifyRegistrationOtpSchema = sendRegistrationOtpSchema.extend({
  code: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit email code"),
});
