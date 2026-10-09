import { NextResponse } from "next/server";

import { hashPassword } from "@/server/auth/password";
import { hashPasswordResetToken } from "@/server/auth/password-reset";
import { clearSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { resetPasswordSchema } from "@/validation/auth";

export async function POST(request: Request) {
  try {
    enforceRateLimit("auth:reset-password:" + getClientIp(request), 10, 15 * 60 * 1000);
    const input = resetPasswordSchema.parse(await readJsonBody(request));
    const tokenHash = hashPasswordResetToken(input.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new AppError({ code: "INVALID_RESET_TOKEN", message: "Password reset token is invalid or expired", status: 400 });
    }

    const passwordHash = await hashPassword(input.password);
    const usedAt = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const result = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: usedAt } }, data: { usedAt } });
      if (result.count !== 1) return false;
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: record.userId,
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: record.userId,
        },
      });
      return true;
    });
    if (!consumed) {
      throw new AppError({
        code: "INVALID_RESET_TOKEN",
        message: "Password reset token is invalid or expired",
        status: 400,
      });
    }

    await clearSessionCookie();

    return NextResponse.json({
      data: { message: "Password has been reset successfully" },
    });
  } catch (error) { return errorResponse(error); }
}
