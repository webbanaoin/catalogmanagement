import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { errorResponse } from "@/server/http/error-response";

export async function GET(_request: Request, context: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await context.params;
    const access = await requireShopAccess(shopId);
    return NextResponse.json({
      data: {
        shop: access.shop,
        membership: { role: access.membership.role },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
