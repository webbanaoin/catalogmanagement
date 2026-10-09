import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status");
    const status =
      requestedStatus === "PENDING" ||
      requestedStatus === "ACTIVE" ||
      requestedStatus === "SUSPENDED" ||
      requestedStatus === "REJECTED"
        ? requestedStatus
        : undefined;

    const partners = await prisma.referralPartner.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        referralCode: true,
        status: true,
        city: true,
        state: true,
        marketingArea: true,
        notes: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
          },
        },
        _count: {
          select: {
            shops: true,
            commissions: true,
          },
        },
      },
    });

    const items = await Promise.all(
      partners.map(async (partner) => {
        const [collections, paidShops, commissionGroups] = await Promise.all([
          prisma.paymentRecord.aggregate({
            where: { shop: { referralPartnerId: partner.id } },
            _sum: { amount: true },
          }),
          prisma.shop.count({
            where: {
              referralPartnerId: partner.id,
              payments: { some: {} },
            },
          }),
          prisma.referralCommission.groupBy({
            by: ["status"],
            where: { referralPartnerId: partner.id },
            orderBy: { status: "asc" },
            _sum: { commissionAmount: true },
            _count: { _all: true },
          }),
        ]);

        let earned = 0;
        let paid = 0;
        let pending = 0;
        for (const group of commissionGroups) {
          const amount = Number(group._sum.commissionAmount ?? 0);
          if (group.status === "PAID") paid += amount;
          if (group.status === "EARNED") pending += amount;
          if (group.status === "PAID" || group.status === "EARNED") {
            earned += amount;
          }
        }

        const totalCollections = Number(collections._sum.amount ?? 0);

        return {
          ...partner,
          shopCount: partner._count.shops,
          paidShopCount: paidShops,
          commissionCount: partner._count.commissions,
          financials: {
            totalCollections: totalCollections.toFixed(2),
            commissionEarned: earned.toFixed(2),
            commissionPaid: paid.toFixed(2),
            commissionPending: pending.toFixed(2),
            netRevenue: Math.max(0, totalCollections - earned).toFixed(2),
          },
        };
      }),
    );

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
