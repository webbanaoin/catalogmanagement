import { z } from "zod";

const password = z.string().min(10, "Password must contain at least 10 characters").max(128, "Password is too long");
const email = z.string().trim().toLowerCase().pipe(z.email());
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  mobile: z.string().trim().min(7).max(30).optional(),
  password,
  shopName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(30).optional(),
  whatsapp: z.string().trim().min(7).max(30).optional(),
  city: optionalText(120),
  state: optionalText(120),
  pincode: optionalText(20),
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
