import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { hashPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { registerSchema } from "@/validation/auth";

export async function POST(request: Request) {
  try {
    enforceRateLimit("auth:register:" + getClientIp(request), 10, 15 * 60 * 1000);
    const input = registerSchema.parse(await readJsonBody(request));

    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      throw new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 });
    }

    try {
      const user = await prisma.user.create({
        data: { name: input.name, email: input.email, mobile: input.mobile || null, passwordHash: await hashPassword(input.password) },
        select: { id: true, name: true, email: true, mobile: true, status: true, createdAt: true },
      });
      await setSessionCookie(user.id);
      return NextResponse.json({ data: user }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 });
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
