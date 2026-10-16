import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import {
  getShopSubscriptionAccess,
  subscriptionResponse,
} from "@/server/subscriptions/access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId);

    const [access, products, totalImages] = await Promise.all([
      getShopSubscriptionAccess(shopId),
      prisma.product.count({ where: { shopId, deletedAt: null } }),
      prisma.productImage.count({ where: { product: { is: { shopId } } } }),
    ]);

    return NextResponse.json({
      data: access ? subscriptionResponse(access, { products, totalImages }) : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
