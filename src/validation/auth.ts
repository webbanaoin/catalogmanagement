import { z } from "zod";

import {
  isValidIndianMobile,
  isValidIndianPhone,
  isValidIndianPincode,
} from "@/lib/validation";

const password = z
  .string()
  .min(10, "Password must contain at least 10 characters")
  .max(128, "Password must contain at most 128 characters");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const optionalNonBlankText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} cannot be blank`)
    .max(max, `${label} must contain at most ${max} characters`)
    .optional();

const optionalIndianMobile = (label: string) =>
  z
    .string()
    .trim()
    .refine(isValidIndianMobile, `Enter a valid 10-digit Indian ${label}`)
    .optional();

const optionalIndianPhone = z
  .string()
  .trim()
  .refine(isValidIndianPhone, "Enter a valid Indian phone number")
  .optional();

const optionalIndianPincode = z
  .string()
  .trim()
  .refine(isValidIndianPincode, "Enter a valid 6-digit Indian PIN")
  .optional();

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(120, "Name must contain at most 120 characters"),
  email,
  mobile: optionalIndianMobile("mobile number"),
  password,
  shopName: z
    .string()
    .trim()
    .min(2, "Shop name must contain at least 2 characters")
    .max(160, "Shop name must contain at most 160 characters"),
  phone: optionalIndianPhone,
  whatsapp: optionalIndianMobile("WhatsApp number"),
  city: optionalNonBlankText("City", 120),
  state: optionalNonBlankText("State", 120),
  pincode: optionalIndianPincode,
});

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must contain at most 128 characters"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password,
});
