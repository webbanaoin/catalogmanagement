import { z } from "zod";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";

const schema = z.object({ allowed: z.boolean() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ shopId: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const { allowed } = schema.parse(await readJsonBody(request));
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { wishlistAllowedByAdmin: true, wishlistEnabledByMerchant: true },
    });
    if (!shop) {
      throw new AppError({ code: "SHOP_NOT_FOUND", message: "Shop not found", status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.shop.update({
        where: { id: shopId },
        // Revoking admin permission makes the feature unavailable immediately;
        // merchant preference is retained for later re-approval.
        data: { wishlistAllowedByAdmin: allowed },
        select: { wishlistAllowedByAdmin: true, wishlistEnabledByMerchant: true },
      });
      await tx.auditLog.create({
        data: {
          shopId, actorUserId: admin.id,
          action: "SHOP_WISHLIST_PERMISSION_UPDATED",
          entityType: "Shop", entityId: shopId,
          metadata: { previous: shop.wishlistAllowedByAdmin, allowed },
        },
      });
      return saved;
    });

    return NextResponse.json({ data: result });
  } catch (error) { return errorResponse(error); }
}
