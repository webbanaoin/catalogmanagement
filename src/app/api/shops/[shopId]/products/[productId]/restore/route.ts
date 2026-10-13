import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { requireProductInShop } from "@/server/catalog/guards";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { requireProductCapacity } from "@/server/subscriptions/access";

export async function POST(
  _request: Request,
  context: { params: Promise<{ shopId: string; productId: string }> },
) {
  try {
    const { shopId, productId } = await context.params;
    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });

    const product = await requireProductInShop(shopId, productId, true);
    if (product.deletedAt) {
      await requireProductCapacity(shopId);
    }

    const data = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: null },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
