import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { adminReferralPartnerListQuerySchema } from "@/validation/referrals";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const query = adminReferralPartnerListQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const where = query.status ? { status: query.status } : undefined;
    const skip = (query.page - 1) * query.pageSize;

    const [partners, total, options] = await prisma.$transaction([
      prisma.referralPartner.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take: query.pageSize,
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
        shops: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
            subscription: {
              select: {
                status: true,
                paymentStatus: true,
                plan: { select: { name: true } },
              },
            },
            _count: { select: { payments: true } },
          },
        },
        _count: {
          select: {
            shops: true,
            commissions: true,
          },
        },
      },
    }),
      prisma.referralPartner.count({ where }),
      prisma.referralPartner.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          referralCode: true,
          status: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    const items = await Promise.all(
      partners.map(async (partner) => {
        const shopIds = partner.shops.map((shop) => shop.id);
        const [collections, commissionGroups] = await Promise.all([
          prisma.paymentRecord.aggregate({
            where:
              shopIds.length > 0
                ? { shopId: { in: shopIds } }
                : { id: "__none__" },
            _sum: { amount: true },
          }),
          prisma.referralCommission.groupBy({
            by: ["status"],
            where: { referralPartnerId: partner.id },
            orderBy: { status: "asc" },
            _sum: { commissionAmount: true },
            _count: { _all: true },
          }),
        ]);
        const paidShops = partner.shops.filter(
          (shop) => shop._count.payments > 0,
        ).length;

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
            netRevenue: (totalCollections - earned).toFixed(2),
          },
        };
      }),
    );

    return NextResponse.json({
      items,
      options,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
