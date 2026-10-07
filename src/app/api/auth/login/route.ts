import { NextResponse } from "next/server";

import { verifyPassword } from "@/server/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/server/auth/session";
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
    enforceRateLimit("auth:login-account:" + input.email, 10, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        shopUsers: {
          select: { role: true, shop: { select: { id: true, name: true, slug: true, status: true } } },
        },
      },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash)) || user.status !== "ACTIVE") {
      throw new AppError({ code: "INVALID_CREDENTIALS", message: "Invalid email or password", status: 401 });
    }

    const usableMemberships = user.shopUsers.filter(
      ({ shop }) => shop.status === "APPROVED" || shop.status === "ACTIVE",
    );

    if (
      user.platformRole !== "ADMIN" &&
      user.shopUsers.length > 0 &&
      usableMemberships.length === 0
    ) {
      const statuses = new Set(user.shopUsers.map(({ shop }) => shop.status));
      if (statuses.has("PENDING")) {
        await clearSessionCookie();
        throw new AppError({ code: "SHOP_PENDING_APPROVAL", message: "Your shop is pending admin approval", status: 403 });
      }
      await clearSessionCookie();
      throw new AppError({ code: "SHOP_ACCESS_UNAVAILABLE", message: "Your shop is not currently available for merchant access", status: 403 });
    }

    await setSessionCookie(user.id, user.sessionVersion);
    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        status: user.status,
        platformRole: user.platformRole,
        createdAt: user.createdAt,
        shops: usableMemberships.map(({ role, shop }) => ({ ...shop, role })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
