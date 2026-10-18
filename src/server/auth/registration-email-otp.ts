import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { getAppEnvironment } from "@/server/env";
import { AppError } from "@/server/http/app-error";

export type RegistrationPurpose = "MERCHANT" | "PARTNER";
export const REGISTRATION_OTP_MINUTES = 10;
export const REGISTRATION_OTP_RESEND_SECONDS = 60;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;

function hmac(value: string): string {
  return createHmac("sha256", getAppEnvironment().AUTH_SECRET).update(value).digest("hex");
}

export function createRegistrationOtp(email: string, purpose: RegistrationPurpose) {
  const code = randomInt(100000, 1000000).toString();
  return {
    code,
    codeHash: hashRegistrationOtp(email, purpose, code),
    expiresAt: new Date(Date.now() + REGISTRATION_OTP_MINUTES * 60 * 1000),
  };
}

export function hashRegistrationOtp(email: string, purpose: RegistrationPurpose, code: string) {
  return hmac(`registration-otp:${purpose}:${email.toLowerCase()}:${code}`);
}

export function createRegistrationVerificationGrant(email: string, purpose: RegistrationPurpose) {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashRegistrationVerificationGrant(email, purpose, token) };
}

export function hashRegistrationVerificationGrant(email: string, purpose: RegistrationPurpose, token: string) {
  return hmac(`registration-verification:${purpose}:${email.toLowerCase()}:${token}`);
}

export function secureHashEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(actual, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function consumeRegistrationEmailGrant(
  tx: Prisma.TransactionClient,
  email: string,
  purpose: RegistrationPurpose,
  token: string,
): Promise<void> {
  const hash = hashRegistrationVerificationGrant(email, purpose, token);
  const updated = await tx.registrationEmailOtp.updateMany({
    where: {
      email, purpose, verificationTokenHash: hash,
      verifiedAt: { not: null }, consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  if (updated.count !== 1) {
    throw new AppError({
      code: "EMAIL_VERIFICATION_REQUIRED", status: 400,
      message: "Email verification expired or is no longer valid. Please request a new 6-digit OTP to continue.",
    });
  }
}
