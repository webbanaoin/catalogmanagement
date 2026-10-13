import type { BillingCycle, PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { effectiveSubscriptionStatus } from "@/server/subscriptions/access";

const DAY_MS = 24 * 60 * 60 * 1000;

const methods: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];
const cycles: BillingCycle[] = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
  "CUSTOM",
];

function startOfDay(date: Date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const weekday = day.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return new Date(day.getTime() + mondayOffset * DAY_MS);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfQuarter(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
}

function startOfYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    1,
  ));
}

function addQuarters(date: Date, quarters: number) {
  return addMonths(date, quarters * 3);
}

function money(value: { toString(): string } | null | undefined) {
  return value?.toString() ?? "0";
}

function amountSummary(
  value: { _sum: { amount: { toString(): string } | null }; _count?: unknown },
) {
  return money(value._sum.amount);
}

function shortMonth(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function shortDay(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

type TrendPayment = {
  receivedAt: Date;
  amount: { toString(): string };
};

function sumSeries(
  payments: TrendPayment[],
  buckets: Array<{ label: string; start: Date; end: Date }>,
) {
  return buckets.map((bucket) => {
    let amount = 0;
    let count = 0;
    for (const payment of payments) {
      if (
        payment.receivedAt.getTime() >= bucket.start.getTime() &&
        payment.receivedAt.getTime() < bucket.end.getTime()
      ) {
        amount += Number(payment.amount);
        count += 1;
      }
    }
    return {
      label: bucket.label,
      from: bucket.start.toISOString(),
      to: bucket.end.toISOString(),
      amount: amount.toFixed(2),
      count,
    };
  });
}

function shopContact(shop: {
  phone: string | null;
  email: string | null;
  shopUsers: Array<{
    user: {
      name: string;
      email: string;
      mobile: string | null;
    };
  }>;
}) {
  const owner = shop.shopUsers[0]?.user ?? null;
  return {
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerMobile: owner?.mobile ?? null,
    shopPhone: shop.phone,
    shopEmail: shop.email,
  };
}

export async function GET() {
  try {
    await requirePlatformAdmin();

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const quarterStart = startOfQuarter(now);
    const yearStart = startOfYear(now);

    const monthlyStart = addMonths(monthStart, -11);
    const quarterlyStart = addQuarters(quarterStart, -7);
    const weeklyStart = addDays(weekStart, -77);
    const trendStart = new Date(
      Math.min(
        monthlyStart.getTime(),
        quarterlyStart.getTime(),
        weeklyStart.getTime(),
      ),
    );

    const [
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      quarterRevenue,
      yearRevenue,
      methodGroups,
      cycleGroups,
      trendPayments,
      subscriptions,
      latestPayments,
      topShopGroups,
    ] = await Promise.all([
      prisma.paymentRecord.aggregate({ _sum: { amount: true } }),
      prisma.paymentRecord.aggregate({
        where: { receivedAt: { gte: todayStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { receivedAt: { gte: weekStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { receivedAt: { gte: monthStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { receivedAt: { gte: quarterStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { receivedAt: { gte: yearStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.groupBy({
        by: ["method"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.groupBy({
        by: ["billingCycle"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.findMany({
        where: { receivedAt: { gte: trendStart, lte: now } },
        orderBy: { receivedAt: "asc" },
        select: { receivedAt: true, amount: true },
      }),
      prisma.subscription.findMany({
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          startDate: true,
          endDate: true,
          graceEndsAt: true,
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              phone: true,
              email: true,
              shopUsers: {
                where: { role: "OWNER" },
                take: 1,
                select: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                      mobile: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.paymentRecord.findMany({
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        select: {
          shopId: true,
          amount: true,
          receivedAt: true,
          billingCycle: true,
        },
      }),
      prisma.paymentRecord.groupBy({
        by: ["shopId"],
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
    ]);

    const byMethod = Object.fromEntries(
      methods.map((method) => [method, { count: 0, amount: "0" }]),
    ) as Record<PaymentMethod, { count: number; amount: string }>;
    for (const row of methodGroups) {
      byMethod[row.method] = {
        count: row._count._all,
        amount: money(row._sum.amount),
      };
    }

    const byBillingCycle = Object.fromEntries(
      cycles.map((cycle) => [cycle, { count: 0, amount: "0" }]),
    ) as Record<BillingCycle, { count: number; amount: string }>;
    for (const row of cycleGroups) {
      byBillingCycle[row.billingCycle] = {
        count: row._count._all,
        amount: money(row._sum.amount),
      };
    }

    const lastPaymentByShop = new Map<
      string,
      {
        amount: string;
        receivedAt: Date;
        billingCycle: BillingCycle;
      }
    >();
    for (const payment of latestPayments) {
      if (!lastPaymentByShop.has(payment.shopId)) {
        lastPaymentByShop.set(payment.shopId, {
          amount: payment.amount.toString(),
          receivedAt: payment.receivedAt,
          billingCycle: payment.billingCycle,
        });
      }
    }

    const expiryRows = subscriptions.map((subscription) => {
      const effectiveStatus = effectiveSubscriptionStatus(subscription, now);
      const daysRemaining = Math.ceil(
        (subscription.endDate.getTime() - now.getTime()) / DAY_MS,
      );
      const lastPayment = lastPaymentByShop.get(subscription.shop.id) ?? null;
      return {
        subscriptionId: subscription.id,
        shopId: subscription.shop.id,
        shopName: subscription.shop.name,
        shopSlug: subscription.shop.slug,
        shopStatus: subscription.shop.status,
        planId: subscription.plan.id,
        planName: subscription.plan.name,
        subscriptionStatus: effectiveStatus,
        paymentStatus: subscription.paymentStatus,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        graceEndsAt: subscription.graceEndsAt,
        daysRemaining,
        contact: shopContact(subscription.shop),
        lastPayment: lastPayment
          ? {
              amount: lastPayment.amount,
              receivedAt: lastPayment.receivedAt,
              billingCycle: lastPayment.billingCycle,
            }
          : null,
      };
    });

    const upcoming = expiryRows
      .filter(
        (row) =>
          ["ACTIVE", "TRIAL"].includes(row.subscriptionStatus) &&
          row.daysRemaining >= 0 &&
          row.daysRemaining <= 30,
      )
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const expired = expiryRows
      .filter((row) =>
        ["EXPIRED", "CANCELLED"].includes(row.subscriptionStatus),
      )
      .sort(
        (a, b) =>
          new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      );

    const grace = expiryRows
      .filter((row) => row.subscriptionStatus === "GRACE")
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const pendingPayments = expiryRows
      .filter((row) => row.paymentStatus === "PENDING")
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const weeklyBuckets = Array.from({ length: 12 }, (_, index) => {
      const start = addDays(weeklyStart, index * 7);
      return {
        label: shortDay(start),
        start,
        end: addDays(start, 7),
      };
    });

    const monthlyBuckets = Array.from({ length: 12 }, (_, index) => {
      const start = addMonths(monthlyStart, index);
      return {
        label: shortMonth(start),
        start,
        end: addMonths(start, 1),
      };
    });

    const quarterlyBuckets = Array.from({ length: 8 }, (_, index) => {
      const start = addQuarters(quarterlyStart, index);
      const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
      return {
        label: `Q${quarter} ${start.getUTCFullYear()}`,
        start,
        end: addQuarters(start, 1),
      };
    });

    const topShopIds = topShopGroups.map((row) => row.shopId);
    const topShopRows = topShopIds.length
      ? await prisma.shop.findMany({
          where: { id: { in: topShopIds } },
          select: { id: true, name: true, slug: true, status: true },
        })
      : [];
    const topShopById = new Map(topShopRows.map((shop) => [shop.id, shop]));
    const topShops = topShopGroups
      .map((row) => {
        const shop = topShopById.get(row.shopId);
        return shop
          ? {
              shop,
              amount: money(row._sum.amount),
              paymentCount: row._count._all,
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return NextResponse.json({
      data: {
        generatedAt: now.toISOString(),
        revenue: {
          total: amountSummary(totalRevenue),
          today: amountSummary(todayRevenue),
          thisWeek: amountSummary(weekRevenue),
          thisMonth: amountSummary(monthRevenue),
          thisQuarter: amountSummary(quarterRevenue),
          thisYear: amountSummary(yearRevenue),
          currency: "INR",
        },
        paymentBreakdown: {
          byMethod,
          byBillingCycle,
        },
        subscriptions: {
          activePaid: expiryRows.filter(
            (row) =>
              row.subscriptionStatus === "ACTIVE" &&
              row.paymentStatus === "PAID",
          ).length,
          trial: expiryRows.filter(
            (row) => row.subscriptionStatus === "TRIAL",
          ).length,
          grace: grace.length,
          expired: expired.length,
          pendingPayment: pendingPayments.length,
          expiringWithin7Days: upcoming.filter(
            (row) => row.daysRemaining <= 7,
          ).length,
          expiring8To15Days: upcoming.filter(
            (row) => row.daysRemaining >= 8 && row.daysRemaining <= 15,
          ).length,
          expiring16To30Days: upcoming.filter(
            (row) => row.daysRemaining >= 16 && row.daysRemaining <= 30,
          ).length,
        },
        expiry: {
          upcoming,
          grace,
          expired,
          pendingPayments,
        },
        trends: {
          weekly: sumSeries(trendPayments, weeklyBuckets),
          monthly: sumSeries(trendPayments, monthlyBuckets),
          quarterly: sumSeries(trendPayments, quarterlyBuckets),
        },
        topShops,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
