import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { accountProfileSchema } from "@/validation/auth";

export async function GET() {
  try {
    return NextResponse.json({ data: await requireCurrentUser() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const input = accountProfileSchema.parse(await readJsonBody(request));

    const data = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name: input.name,
        mobile: input.mobile?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
