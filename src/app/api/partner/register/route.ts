import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { hashPassword } from "@/server/auth/password";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { partnerRegisterSchema } from "@/validation/referrals";

export async function POST(request: Request) {
  try {
    enforceRateLimit(
      "partner:register:" + getClientIp(request),
      10,
      15 * 60 * 1000,
    );

    const input = partnerRegisterSchema.parse(await readJsonBody(request));
    const passwordHash = await hashPassword(input.password);

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new AppError({
          code: "EMAIL_IN_USE",
          message: "An account with this email already exists",
          status: 409,
        });
      }

      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          mobile: input.mobile,
          passwordHash,
          platformRole: "PARTNER",
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      });

      const partner = await tx.referralPartner.create({
        data: {
          userId: user.id,
          status: "PENDING",
          city: input.city?.trim() || null,
          state: input.state?.trim() || null,
          marketingArea: input.marketingArea?.trim() || null,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "REFERRAL_PARTNER_REGISTERED",
          entityType: "ReferralPartner",
          entityId: partner.id,
          metadata: {
            city: input.city?.trim() || null,
            state: input.state?.trim() || null,
            marketingArea: input.marketingArea?.trim() || null,
          },
        },
      });

      return {
        id: partner.id,
        status: partner.status,
        message:
          "Registration submitted. Your referral code will be generated after admin approval.",
      };
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(
        new AppError({
          code: "PARTNER_REGISTRATION_CONFLICT",
          message: "This partner registration conflicts with an existing account",
          status: 409,
        }),
      );
    }
    return errorResponse(error);
  }
}
