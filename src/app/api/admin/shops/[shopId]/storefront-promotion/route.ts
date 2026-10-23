import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";

const schema = z.object({ enabled: z.boolean() }).strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const { enabled } = schema.parse(await readJsonBody(request));
    const current = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { storefrontGrowthPromoEnabled: true },
    });
    if (!current) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Shop not found",
        status: 404,
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const saved = await tx.shop.update({
        where: { id: shopId },
        data: { storefrontGrowthPromoEnabled: enabled },
        select: { id: true, storefrontGrowthPromoEnabled: true },
      });
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: admin.id,
          action: "SHOP_STOREFRONT_GROWTH_PROMOTION_UPDATED",
          entityType: "Shop",
          entityId: shopId,
          metadata: { previous: current.storefrontGrowthPromoEnabled, enabled },
        },
      });
      return saved;
    });

    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
