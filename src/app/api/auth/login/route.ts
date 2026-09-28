import { NextResponse } from "next/server";

import { verifyPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { loginSchema } from "@/validation/auth";

export async function POST(request: Request) {
  try {
    enforceRateLimit("auth:login:" + getClientIp(request), 20, 15 * 60 * 1000);
    const input = loginSchema.parse(await readJsonBody(request));
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await verifyPassword(input.password, user.passwordHash)) || user.status !== "ACTIVE") {
      throw new AppError({ code: "INVALID_CREDENTIALS", message: "Invalid email or password", status: 401 });
    }

    await setSessionCookie(user.id);
    return NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, status: user.status, createdAt: user.createdAt },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
