import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { hashPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { registerSchema } from "@/validation/auth";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 });
    const user = await prisma.user.create({ data: { name: input.name, email: input.email, mobile: input.mobile || null, passwordHash: await hashPassword(input.password) }, select: { id: true, name: true, email: true, mobile: true, status: true, createdAt: true } });
    await setSessionCookie(user.id);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
