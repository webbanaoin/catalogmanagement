import type { ShopStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminShopStatusSchema } from "@/validation/admin";

const ALLOWED_TRANSITIONS: Record<ShopStatus, readonly ShopStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "SUSPENDED"],
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  REJECTED: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ shopId: string }> }) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;
    const input = adminShopStatusSchema.parse(await readJsonBody(request));

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!shop) throw new AppError({ code: "SHOP_NOT_FOUND", message: "Shop not found", status: 404 });

    if (shop.status === input.status) {
      return NextResponse.json({ data: shop });
    }
    if (!ALLOWED_TRANSITIONS[shop.status].includes(input.status)) {
      throw new AppError({
        code: "INVALID_SHOP_STATUS_TRANSITION",
        message: `Shop status cannot change from ${shop.status} to ${input.status}`,
        status: 409,
      });
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: { status: input.status },
      select: { id: true, name: true, slug: true, status: true, updatedAt: true },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
