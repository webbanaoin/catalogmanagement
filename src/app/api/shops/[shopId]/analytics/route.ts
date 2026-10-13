import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { requireSubscriptionFeature } from "@/server/subscriptions/access";

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

export async function GET(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId);
    await requireSubscriptionFeature(shopId, "analyticsEnabled");

    const { from, to } = dateRange(request);
    const visitWhere = { shopId, visitedAt: { gte: from, lte: to } };
    const viewWhere = { shopId, viewedAt: { gte: from, lte: to } };
    const actionWhere = { shopId, createdAt: { gte: from, lte: to } };

    const [
      catalogVisits,
      uniqueSessions,
      qrVisits,
      productViews,
      actionGroups,
      productGroups,
      trafficGroups,
    ] = await Promise.all([
      prisma.catalogVisit.count({ where: visitWhere }),
      prisma.catalogVisit.findMany({
        where: visitWhere,
        distinct: ["sessionId"],
        select: { sessionId: true },
      }),
      prisma.catalogVisit.count({
        where: {
          ...visitWhere,
          source: { startsWith: "qr" },
        },
      }),
      prisma.productView.count({ where: viewWhere }),
      prisma.customerAction.groupBy({
        by: ["actionType"],
        where: actionWhere,
        _count: { _all: true },
      }),
      prisma.productView.groupBy({
        by: ["productId"],
        where: viewWhere,
        _count: { _all: true },
      }),
      prisma.catalogVisit.groupBy({
        by: ["source"],
        where: visitWhere,
        _count: { _all: true },
      }),
    ]);

    const productIds = productGroups.map((group) => group.productId);
    const productRows = productIds.length
      ? await prisma.product.findMany({
          where: { shopId, id: { in: productIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        })
      : [];

    const productById = new Map(productRows.map((product) => [product.id, product]));
    const topProducts = productGroups
      .map((group) => {
        const product = productById.get(group.productId);
        if (!product) return null;

        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          views: group._count._all,
        };
      })
      .filter((product): product is NonNullable<typeof product> => Boolean(product))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const categoryTotals = new Map<
      string,
      { categoryId: string; name: string; slug: string; views: number }
    >();

    for (const group of productGroups) {
      const product = productById.get(group.productId);
      const category = product?.category;
      if (!category) continue;

      const current = categoryTotals.get(category.id);
      if (current) {
        current.views += group._count._all;
      } else {
        categoryTotals.set(category.id, {
          categoryId: category.id,
          name: category.name,
          slug: category.slug,
          views: group._count._all,
        });
      }
    }

    const topCategories = [...categoryTotals.values()]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const actions = {
      whatsapp: 0,
      call: 0,
      directions: 0,
      share: 0,
      pwaInstall: 0,
    };

    for (const group of actionGroups) {
      switch (group.actionType) {
        case "WHATSAPP":
          actions.whatsapp = group._count._all;
          break;
        case "CALL":
          actions.call = group._count._all;
          break;
        case "DIRECTIONS":
          actions.directions = group._count._all;
          break;
        case "SHARE":
          actions.share = group._count._all;
          break;
        case "PWA_INSTALL":
          actions.pwaInstall = group._count._all;
          break;
      }
    }

    const trafficSources = trafficGroups
      .map((group) => ({
        source: group.source || "direct",
        visits: group._count._all,
      }))
      .sort((a, b) => b.visits - a.visits);

    return NextResponse.json({
      data: {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        totals: {
          catalogVisits,
          uniqueVisits: uniqueSessions.length,
          qrVisits,
          productViews,
          customerActions:
            actions.whatsapp +
            actions.call +
            actions.directions +
            actions.share +
            actions.pwaInstall,
        },
        actions,
        topProducts,
        topCategories,
        trafficSources,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
