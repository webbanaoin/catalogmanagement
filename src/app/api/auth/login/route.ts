import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { verifyPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { loginSchema } from "@/validation/auth";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash)) || user.status !== "ACTIVE") throw new AppError({ code: "INVALID_CREDENTIALS", message: "Invalid email or password", status: 401 });
    await setSessionCookie(user.id);
    return NextResponse.json({ data: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, status: user.status, createdAt: user.createdAt } });
  } catch (error) { return errorResponse(error); }
}
