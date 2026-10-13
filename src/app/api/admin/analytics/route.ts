import type {
  CustomerActionType,
  ShopStatus,
  SubscriptionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { effectiveSubscriptionStatus } from "@/server/subscriptions/access";

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

function dateRange(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to = toRaw ? new Date(toRaw) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError({
      code: "INVALID_DATE_RANGE",
      message: "from and to must be valid ISO dates",
      status: 400,
    });
  }
  if (from > to) {
    throw new AppError({
      code: "INVALID_DATE_RANGE",
      message: "from must be earlier than or equal to to",
      status: 400,
    });
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new AppError({
      code: "INVALID_DATE_RANGE",
      message: "Analytics date range cannot exceed 366 days",
      status: 400,
    });
  }

  return { from, to };
}

const shopStatuses: ShopStatus[] = [
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "SUSPENDED",
  "REJECTED",
];

const actionTypes: CustomerActionType[] = [
  "WHATSAPP",
  "CALL",
  "DIRECTIONS",
  "SHARE",
  "PWA_INSTALL",
];

const subscriptionStatuses: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "GRACE",
  "EXPIRED",
  "CANCELLED",
];

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const { from, to } = dateRange(request);

    const [
      shopGroups,
      totalUsers,
      totalProducts,
      shopsCreatedInRange,
      catalogVisits,
      productViews,
      actionGroups,
      subscriptionRows,
      visitShopGroups,
    ] = await Promise.all([
      prisma.shop.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.user.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.shop.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.catalogVisit.count({
        where: { visitedAt: { gte: from, lte: to } },
      }),
      prisma.productView.count({
        where: { viewedAt: { gte: from, lte: to } },
      }),
      prisma.customerAction.groupBy({
        by: ["actionType"],
        where: { createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      prisma.subscription.findMany({
        select: {
          status: true,
          endDate: true,
          graceEndsAt: true,
        },
      }),
      prisma.catalogVisit.groupBy({
        by: ["shopId"],
        where: { visitedAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
    ]);

    const shopsByStatus = Object.fromEntries(
      shopStatuses.map((status) => [status.toLowerCase(), 0]),
    ) as Record<string, number>;
    for (const group of shopGroups) {
      shopsByStatus[group.status.toLowerCase()] = group._count._all;
    }

    const actions = Object.fromEntries(
      actionTypes.map((type) => [type.toLowerCase(), 0]),
    ) as Record<string, number>;
    for (const group of actionGroups) {
      actions[group.actionType.toLowerCase()] = group._count._all;
    }

    const subscriptions = Object.fromEntries(
      subscriptionStatuses.map((status) => [status.toLowerCase(), 0]),
    ) as Record<string, number>;
    const now = new Date();
    for (const subscription of subscriptionRows) {
      const effective = effectiveSubscriptionStatus(subscription, now);
      subscriptions[effective.toLowerCase()] += 1;
    }

    const topVisitGroups = [...visitShopGroups]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 10);
    const topShopIds = topVisitGroups.map((group) => group.shopId);
    const topShopRows = topShopIds.length
      ? await prisma.shop.findMany({
          where: { id: { in: topShopIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        })
      : [];
    const shopById = new Map(topShopRows.map((shop) => [shop.id, shop]));
    const topShops = topVisitGroups
      .map((group) => {
        const shop = shopById.get(group.shopId);
        if (!shop) return null;
        return {
          shopId: shop.id,
          name: shop.name,
          slug: shop.slug,
          status: shop.status,
          visits: group._count._all,
        };
      })
      .filter((shop): shop is NonNullable<typeof shop> => Boolean(shop));

    return NextResponse.json({
      data: {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        totals: {
          shops: Object.values(shopsByStatus).reduce(
            (total, value) => total + value,
            0,
          ),
          users: totalUsers,
          products: totalProducts,
          shopsCreatedInRange,
          catalogVisits,
          productViews,
          customerActions: Object.values(actions).reduce(
            (total, value) => total + value,
            0,
          ),
        },
        shopsByStatus,
        subscriptions,
        actions,
        topShops,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
