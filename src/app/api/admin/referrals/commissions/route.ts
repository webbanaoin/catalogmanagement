import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { adminReferralCommissionListQuerySchema } from "@/validation/referrals";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const query = adminReferralCommissionListQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      partnerId: url.searchParams.get("partnerId") ?? undefined,
      shopId: url.searchParams.get("shopId") ?? undefined,
      billingCycle: url.searchParams.get("billingCycle") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const where: Prisma.ReferralCommissionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.partnerId ? { referralPartnerId: query.partnerId } : {}),
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.billingCycle ? { billingCycle: query.billingCycle } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total, aggregate, groups] = await prisma.$transaction([
      prisma.referralCommission.findMany({
        where,
        orderBy: [{ earnedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          paymentRecordId: true,
          billingCycle: true,
          status: true,
          commissionAmount: true,
          currency: true,
          paymentAmountSnapshot: true,
          planNameSnapshot: true,
          partnerNameSnapshot: true,
          partnerCodeSnapshot: true,
          shopNameSnapshot: true,
          earnedAt: true,
          paidAt: true,
          payoutMethod: true,
          payoutReference: true,
          payoutComment: true,
          cancelledAt: true,
          cancelComment: true,
          createdAt: true,
          referralPartner: {
            select: {
              id: true,
              referralCode: true,
              user: { select: { name: true, email: true, mobile: true } },
            },
          },
          shop: { select: { id: true, name: true, slug: true } },
          paidByUser: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.referralCommission.count({ where }),
      prisma.referralCommission.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
      prisma.referralCommission.groupBy({
        by: ["status"],
        where,
        orderBy: { status: "asc" },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus = {
      EARNED: { count: 0, amount: "0" },
      PAID: { count: 0, amount: "0" },
      CANCELLED: { count: 0, amount: "0" },
    };
    for (const group of groups) {
      byStatus[group.status] = {
        count: group._count._all,
        amount: group._sum.commissionAmount?.toString() ?? "0",
      };
    }

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        commissionAmount: item.commissionAmount.toString(),
        paymentAmountSnapshot: item.paymentAmountSnapshot.toString(),
      })),
      summary: {
        count: total,
        amount: aggregate._sum.commissionAmount?.toString() ?? "0",
        currency: "INR",
        byStatus,
      },
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
