import "server-only";

import type { ShopStatus, ShopUserRole } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { requireCurrentUser } from "./current-user";

export const MERCHANT_ROLES: readonly ShopUserRole[] = ["OWNER", "MANAGER", "STAFF"];

type TenantAccessOptions = {
  roles?: readonly ShopUserRole[];
  shopStatuses?: readonly ShopStatus[];
};

export async function requireShopAccess(shopId: string, options: TenantAccessOptions = {}) {
  const user = await requireCurrentUser();
  const membership = await prisma.shopUser.findUnique({
    where: { userId_shopId: { userId: user.id, shopId } },
    select: {
      id: true,
      role: true,
      shopId: true,
      shop: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (!membership) {
    throw new AppError({ code: "FORBIDDEN", message: "You do not have access to this shop", status: 403 });
  }

  if (options.roles && !options.roles.includes(membership.role)) {
    throw new AppError({ code: "FORBIDDEN", message: "You do not have permission to perform this action", status: 403 });
  }

  if (options.shopStatuses && !options.shopStatuses.includes(membership.shop.status)) {
    throw new AppError({ code: "SHOP_NOT_AVAILABLE", message: "This shop is not available for this action", status: 403 });
  }

  return { user, membership, shop: membership.shop };
}

export async function requireShopOwner(shopId: string) {
  return requireShopAccess(shopId, { roles: ["OWNER"] });
}
