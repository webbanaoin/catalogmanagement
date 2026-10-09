import { NextResponse } from "next/server";

import { verifyPassword } from "@/server/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { partnerLoginSchema } from "@/validation/referrals";

export async function POST(request: Request) {
  try {
    enforceRateLimit(
      "partner:login:" + getClientIp(request),
      20,
      15 * 60 * 1000,
    );

    const input = partnerLoginSchema.parse(await readJsonBody(request));
    enforceRateLimit(
      "partner:login-account:" + input.email,
      10,
      15 * 60 * 1000,
    );

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        status: true,
        platformRole: true,
        sessionVersion: true,
        referralPartner: {
          select: {
            id: true,
            status: true,
            referralCode: true,
          },
        },
      },
    });

    if (
      !user ||
      !(await verifyPassword(input.password, user.passwordHash)) ||
      user.status !== "ACTIVE" ||
      user.platformRole !== "PARTNER" ||
      !user.referralPartner
    ) {
      throw new AppError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid partner email or password",
        status: 401,
      });
    }

    if (user.referralPartner.status === "PENDING") {
      await clearSessionCookie();
      throw new AppError({
        code: "PARTNER_PENDING_APPROVAL",
        message: "Your marketing partner registration is pending admin approval",
        status: 403,
      });
    }

    if (
      user.referralPartner.status !== "ACTIVE" ||
      !user.referralPartner.referralCode
    ) {
      await clearSessionCookie();
      throw new AppError({
        code: "PARTNER_ACCESS_UNAVAILABLE",
        message: "Your marketing partner account is not currently active",
        status: 403,
      });
    }

    await setSessionCookie(user.id, user.sessionVersion);

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        platformRole: "PARTNER" as const,
        partner: {
          id: user.referralPartner.id,
          status: "ACTIVE" as const,
          referralCode: user.referralPartner.referralCode,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
