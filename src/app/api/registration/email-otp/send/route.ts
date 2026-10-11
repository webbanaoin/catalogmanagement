import { NextResponse } from "next/server";

import { createRegistrationOtp, REGISTRATION_OTP_RESEND_SECONDS } from "@/server/auth/registration-email-otp";
import { prisma } from "@/server/database/prisma";
import { sendRegistrationOtpEmail } from "@/server/email/registration-otp-email";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { sendRegistrationOtpSchema } from "@/validation/registration-email-otp";

export async function POST(request: Request) {
  try {
    enforceRateLimit("registration-otp:ip:" + getClientIp(request), 10, 15 * 60 * 1000);
    const { email, purpose } = sendRegistrationOtpSchema.parse(await readJsonBody(request));
    enforceRateLimit("registration-otp:email:" + email, 5, 15 * 60 * 1000);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      throw new AppError({ code: "EMAIL_IN_USE", message: "This email is already registered. Please sign in.", status: 409 });
    }

    const previous = await prisma.registrationEmailOtp.findUnique({
      where: { email_purpose: { email, purpose } },
      select: { lastSentAt: true },
    });
    if (previous && Date.now() - previous.lastSentAt.getTime() < REGISTRATION_OTP_RESEND_SECONDS * 1000) {
      throw new AppError({ code: "OTP_RESEND_COOLDOWN", message: "Please wait 60 seconds before requesting another code.", status: 429 });
    }

    const otp = createRegistrationOtp(email, purpose);
    await prisma.registrationEmailOtp.upsert({
      where: { email_purpose: { email, purpose } },
      create: { email, purpose, codeHash: otp.codeHash, expiresAt: otp.expiresAt, lastSentAt: new Date() },
      update: {
        codeHash: otp.codeHash, expiresAt: otp.expiresAt, lastSentAt: new Date(),
        verifiedAt: null, verificationTokenHash: null, consumedAt: null, attempts: 0,
      },
    });

    try {
      await sendRegistrationOtpEmail(email, purpose, otp.code);
    } catch {
      await prisma.registrationEmailOtp.updateMany({
        where: { email, purpose, codeHash: otp.codeHash },
        data: { expiresAt: new Date(0) },
      });
      console.error("Registration OTP email delivery failed. Check verified sender and Resend configuration.");
      throw new AppError({
        code: "OTP_EMAIL_UNAVAILABLE", status: 503,
        message: "We could not send a verification email right now. Please try again later.",
      });
    }

    return NextResponse.json({
      data: { message: "A 6-digit verification code has been sent to your email.", expiresInMinutes: 10 },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
