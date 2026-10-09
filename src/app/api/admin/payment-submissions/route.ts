import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { adminPaymentSubmissionListQuerySchema } from "@/validation/subscriptions";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const query = adminPaymentSubmissionListQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      shopId: url.searchParams.get("shopId") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const where: Prisma.PaymentSubmissionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.shopId ? { shopId: query.shopId } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total, groups] = await prisma.$transaction([
      prisma.paymentSubmission.findMany({
        where,
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          billingCycle: true,
          paidAt: true,
          recipientType: true,
          recipientNameSnapshot: true,
          reference: true,
          comment: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewComment: true,
          paymentRecordId: true,
          shop: { select: { id: true, name: true, slug: true } },
          submittedByUser: {
            select: { id: true, name: true, email: true, mobile: true },
          },
          reviewedByUser: {
            select: { id: true, name: true, email: true },
          },
          referralPartner: {
            select: {
              id: true,
              referralCode: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.paymentSubmission.count({ where }),
      prisma.paymentSubmission.groupBy({
        by: ["status"],
        where,
        orderBy: { status: "asc" },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const byStatus = {
      PENDING: { count: 0, amount: "0" },
      APPROVED: { count: 0, amount: "0" },
      REJECTED: { count: 0, amount: "0" },
    };

    for (const group of groups) {
      byStatus[group.status] = {
        count: group._count._all,
        amount: group._sum.amount?.toString() ?? "0",
      };
    }

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        amount: item.amount.toString(),
        recipientName: item.recipientNameSnapshot,
      })),
      summary: { total, byStatus, currency: "INR" },
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
