import { NextResponse } from "next/server";

import { createPasswordResetToken, PASSWORD_RESET_TTL_MINUTES } from "@/server/auth/password-reset";
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
    const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, status: true } });

    if (user?.status === "ACTIVE") {
      const { token, tokenHash } = createPasswordResetToken();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
      ]);

      // Delivery provider is intentionally deferred. In development only, return the raw token for local integration testing.
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ data: { message: GENERIC_MESSAGE, developmentResetToken: token } });
      }
    }

    return NextResponse.json({ data: { message: GENERIC_MESSAGE } });
  } catch (error) { return errorResponse(error); }
}
