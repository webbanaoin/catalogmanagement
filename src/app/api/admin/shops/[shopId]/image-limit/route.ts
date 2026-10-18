import { z } from "zod";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";

const schema = z.object({
  imageLimitPerProductOverride: z.number().int().min(1).max(50).nullable(),
}).strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const input = schema.parse(await readJsonBody(request));

    const current = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        imageLimitPerProductOverride: true,
        subscription: { select: { plan: { select: {
          imageLimitPerProduct: true,
          totalImageLimit: true,
        } } } },
      },
    });
    if (!current) {
      throw new AppError({
        code: "SHOP_NOT_FOUND", message: "Shop not found", status: 404,
      });
    }
    const saved = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.update({
        where: { id: shopId },
        data: { imageLimitPerProductOverride: input.imageLimitPerProductOverride },
        select: { id: true, imageLimitPerProductOverride: true },
      });
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: admin.id,
          action: "SHOP_IMAGE_LIMIT_OVERRIDE_UPDATED",
          entityType: "Shop",
          entityId: shopId,
          metadata: {
            previous: current.imageLimitPerProductOverride,
            override: shop.imageLimitPerProductOverride,
            inheritedPlanLimit: current.subscription?.plan.imageLimitPerProduct ?? null,
          },
        },
      });
      return shop;
    });
    const plan = current.subscription?.plan;
    return NextResponse.json({
      data: {
        ...saved,
        planImageLimitPerProduct: plan?.imageLimitPerProduct ?? null,
        effectiveImageLimitPerProduct:
          saved.imageLimitPerProductOverride ?? plan?.imageLimitPerProduct ?? null,
        totalImageLimit: plan?.totalImageLimit ?? null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
