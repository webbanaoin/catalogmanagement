import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminShopReferralSchema } from "@/validation/referrals";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminShopReferralSchema.parse(await readJsonBody(request));
    const { shopId } = await context.params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        referralPartnerId: true,
        referralPartner: {
          select: { id: true, referralCode: true, user: { select: { name: true } } },
        },
        _count: { select: { referralCommissions: true } },
      },
    });
    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    if (
      shop._count.referralCommissions > 0 &&
      shop.referralPartnerId !== input.referralPartnerId
    ) {
      throw new AppError({
        code: "REFERRAL_ATTRIBUTION_LOCKED",
        message:
          "Referral attribution cannot be changed after commission has been earned for this shop",
        status: 409,
      });
    }

    let partner:
      | {
          id: string;
          referralCode: string | null;
          user: { name: string };
        }
      | null = null;

    if (input.referralPartnerId) {
      partner = await prisma.referralPartner.findFirst({
        where: {
          id: input.referralPartnerId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          referralCode: true,
          user: { select: { name: true } },
        },
      });
      if (!partner?.referralCode) {
        throw new AppError({
          code: "REFERRAL_PARTNER_NOT_ACTIVE",
          message: "Select an approved active marketing partner",
          status: 400,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.shop.update({
        where: { id: shop.id },
        data: {
          referralPartnerId: partner?.id ?? null,
          referralAssignedAt: partner ? new Date() : null,
        },
        select: {
          id: true,
          name: true,
          referralPartnerId: true,
          referralAssignedAt: true,
          referralPartner: {
            select: {
              id: true,
              referralCode: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          shopId: shop.id,
          action: "SHOP_REFERRAL_ATTRIBUTION_CHANGED",
          entityType: "Shop",
          entityId: shop.id,
          metadata: {
            previousReferralPartnerId: shop.referralPartnerId,
            nextReferralPartnerId: partner?.id ?? null,
            nextReferralCode: partner?.referralCode ?? null,
            source: "ADMIN",
          },
        },
      });

      return saved;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
