import { NextResponse } from "next/server";

import {
  createPasswordResetToken,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/server/auth/password-reset";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { forgotPasswordSchema } from "@/validation/auth";

const GENERIC_MESSAGE = "If an eligible account exists, password reset instructions will be sent.";

export async function POST(request: Request) {
  try {
    enforceRateLimit("auth:forgot-password:" + getClientIp(request), 5, 15 * 60 * 1000);
    const input = forgotPasswordSchema.parse(await readJsonBody(request));
    enforceRateLimit("auth:forgot-password-account:" + input.email, 5, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, status: true },
    });

    if (user?.status === "ACTIVE") {
      const { token, tokenHash } = createPasswordResetToken();
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
      );
      const created = await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        return tx.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
          select: { id: true },
        });
      });

      try {
        const delivery = await sendPasswordResetEmail({
          to: user.email,
          resetToken: token,
        });

        return NextResponse.json({
          data: {
            message: GENERIC_MESSAGE,
            ...(delivery.exposedForTesting
              ? { developmentResetUrl: delivery.resetUrl }
              : {}),
          },
        });
      } catch (deliveryError) {
        await prisma.passwordResetToken.updateMany({
          where: { id: created.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        console.error(
          "Password reset email delivery failed",
          deliveryError instanceof Error
            ? deliveryError.message
            : "Unknown password reset email error",
        );
      }
    }

    return NextResponse.json({ data: { message: GENERIC_MESSAGE } });
  } catch (error) { return errorResponse(error); }
}
