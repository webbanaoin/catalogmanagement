import Link from "next/link";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  buttonClassName,
} from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";
import { prisma } from "@/server/database/prisma";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminPaymentsPage() {
  await requirePlatformAdminPageAccess();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [paidAggregate, monthAggregate, pendingSubscriptions, recent] =
    await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentRecord.aggregate({
        where: {
          status: "PAID",
          paymentDate: { gte: monthStart, lte: now },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.subscription.count({
        where: { paymentStatus: "PENDING" },
      }),
      prisma.paymentRecord.findMany({
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        take: 50,
        include: {
          shop: { select: { id: true, name: true, slug: true } },
          plan: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow="Billing operations"
          title="Payments"
          description="Track manual collections and payment status across shops. Payment history is append-only for auditability."
        />
        <Link href="/admin/shops" className={buttonClassName("secondary", "sm")}>
          Manage shop subscriptions
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Lifetime paid
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatMoney(Number(paidAggregate._sum.amount ?? 0))}
            </p>
            <p className="mt-1 text-xs text-muted">
              {paidAggregate._count._all} paid entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              This month
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatMoney(Number(monthAggregate._sum.amount ?? 0))}
            </p>
            <p className="mt-1 text-xs text-muted">
              {monthAggregate._count._all} paid entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Payment pending
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {pendingSubscriptions}
            </p>
            <p className="mt-1 text-xs text-muted">Shop subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Ledger
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {recent.length}
            </p>
            <p className="mt-1 text-xs text-muted">Recent entries shown</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent payment history</CardTitle>
          <CardDescription>
            Cash, UPI, bank transfer, online and other entries recorded by platform administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="No payment history yet"
              description="Record a payment from a shop's subscription panel."
              className="min-h-40"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-2 py-3">Date</th>
                    <th className="px-2 py-3">Shop</th>
                    <th className="px-2 py-3">Plan</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Method</th>
                    <th className="px-2 py-3">Amount</th>
                    <th className="px-2 py-3">Reference</th>
                    <th className="px-2 py-3">Received by</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/70">
                      <td className="whitespace-nowrap px-2 py-3">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium text-foreground">{payment.shop.name}</p>
                        <p className="text-xs text-muted">/s/{payment.shop.slug}</p>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {payment.plan?.name ?? "—"}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          variant={
                            payment.status === "PAID"
                              ? "success"
                              : payment.status === "PENDING"
                                ? "warning"
                                : payment.status === "WAIVED"
                                  ? "info"
                                  : "danger"
                          }
                        >
                          {titleCase(payment.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {titleCase(payment.method)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                        {formatMoney(Number(payment.amount))}
                      </td>
                      <td className="max-w-44 truncate px-2 py-3">
                        {payment.referenceId ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {payment.receivedBy?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
