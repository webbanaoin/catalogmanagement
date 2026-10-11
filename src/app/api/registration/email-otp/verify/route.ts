import { NextResponse } from "next/server";

import {
  createRegistrationVerificationGrant, hashRegistrationOtp,
  REGISTRATION_OTP_MAX_ATTEMPTS, secureHashEqual,
} from "@/server/auth/registration-email-otp";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { verifyRegistrationOtpSchema } from "@/validation/registration-email-otp";

export async function POST(request: Request) {
  try {
    enforceRateLimit("registration-otp:verify-ip:" + getClientIp(request), 20, 15 * 60 * 1000);
    const { email, purpose, code } = verifyRegistrationOtpSchema.parse(await readJsonBody(request));
    enforceRateLimit("registration-otp:verify-email:" + email, 10, 15 * 60 * 1000);

    const challenge = await prisma.registrationEmailOtp.findUnique({ where: { email_purpose: { email, purpose } } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.consumedAt || challenge.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS || challenge.verifiedAt) {
      throw new AppError({ code: "OTP_EXPIRED_OR_INVALID", status: 400, message: "Code expired or attempts exceeded. Request a new verification code." });
    }
    if (!secureHashEqual(challenge.codeHash, hashRegistrationOtp(email, purpose, code))) {
      await prisma.registrationEmailOtp.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError({ code: "OTP_INCORRECT", status: 400, message: "Incorrect code. Please check your email and try again." });
    }
    const grant = createRegistrationVerificationGrant(email, purpose);
    const updated = await prisma.registrationEmailOtp.updateMany({
      where: {
        id: challenge.id, verifiedAt: null, consumedAt: null,
        expiresAt: { gt: new Date() }, attempts: { lt: REGISTRATION_OTP_MAX_ATTEMPTS },
      },
      data: { verifiedAt: new Date(), verificationTokenHash: grant.hash },
    });
    if (updated.count !== 1) {
      throw new AppError({ code: "OTP_ALREADY_USED", status: 409, message: "This code has already been verified. Request a new one." });
    }
    return NextResponse.json({ data: { verificationToken: grant.token, email } });
  } catch (error) {
    return errorResponse(error);
  }
}
