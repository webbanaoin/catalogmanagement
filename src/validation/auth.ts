import { z } from "zod";

const password = z.string().min(10, "Password must contain at least 10 characters").max(128, "Password is too long");
export const registerSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.email().transform((v) => v.trim().toLowerCase()), mobile: z.string().trim().min(7).max(30).optional(), password });
export const loginSchema = z.object({ email: z.email().transform((v) => v.trim().toLowerCase()), password: z.string().min(1).max(128) });
