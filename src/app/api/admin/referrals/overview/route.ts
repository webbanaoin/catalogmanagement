import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function GET() {
  try {
    await requirePlatformAdmin();

    const referredShops = await prisma.shop.findMany({
      where: { referralPartnerId: { not: null } },
      select: { id: true },
    });
    const referredShopIds = referredShops.map((shop) => shop.id);
    const monthStart = startOfMonth(new Date());

    const [
      totalCollections,
      referredCollections,
      monthlyReferredCollections,
      commissionGroups,
      monthlyCommissionGroups,
      activePartners,
      pendingPartners,
      paidReferredShops,
    ] = await Promise.all([
      prisma.paymentRecord.aggregate({ _sum: { amount: true } }),
      prisma.paymentRecord.aggregate({
        where:
          referredShopIds.length > 0
            ? { shopId: { in: referredShopIds } }
            : { id: "__none__" },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: {
          ...(referredShopIds.length > 0
            ? { shopId: { in: referredShopIds } }
            : { id: "__none__" }),
          receivedAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.referralCommission.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      prisma.referralCommission.groupBy({
        by: ["status"],
        where: { earnedAt: { gte: monthStart } },
        orderBy: { status: "asc" },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      prisma.referralPartner.count({ where: { status: "ACTIVE" } }),
      prisma.referralPartner.count({ where: { status: "PENDING" } }),
      prisma.shop.count({
        where: {
          referralPartnerId: { not: null },
          payments: { some: {} },
        },
      }),
    ]);

    let commissionEarned = 0;
    let commissionPaid = 0;
    let commissionPending = 0;
    let cancelled = 0;
    let commissionCount = 0;

    for (const group of commissionGroups) {
      const amount = Number(group._sum.commissionAmount ?? 0);
      commissionCount += group._count._all;
      if (group.status === "PAID") {
        commissionPaid += amount;
        commissionEarned += amount;
      } else if (group.status === "EARNED") {
        commissionPending += amount;
        commissionEarned += amount;
      } else {
        cancelled += amount;
      }
    }

    let monthlyCommissionLiability = 0;
    for (const group of monthlyCommissionGroups) {
      if (group.status === "PAID" || group.status === "EARNED") {
        monthlyCommissionLiability += Number(group._sum.commissionAmount ?? 0);
      }
    }

    const total = Number(totalCollections._sum.amount ?? 0);
    const referred = Number(referredCollections._sum.amount ?? 0);

    return NextResponse.json({
      data: {
        generatedAt: new Date(),
        revenue: {
          totalCollections: total.toFixed(2),
          referredCollections: referred.toFixed(2),
          commissionEarned: commissionEarned.toFixed(2),
          commissionPaid: commissionPaid.toFixed(2),
          commissionPending: commissionPending.toFixed(2),
          cancelledCommission: cancelled.toFixed(2),
          netRevenueAfterCommission: (total - commissionEarned).toFixed(2),
          realizedNetCash: (total - commissionPaid).toFixed(2),
          monthlyReferredCollections: Number(
            monthlyReferredCollections._sum.amount ?? 0,
          ).toFixed(2),
          monthlyCommissionLiability: monthlyCommissionLiability.toFixed(2),
          currency: "INR",
        },
        counts: {
          activePartners,
          pendingPartners,
          referredShops: referredShopIds.length,
          paidReferredShops,
          commissionRecords: commissionCount,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
