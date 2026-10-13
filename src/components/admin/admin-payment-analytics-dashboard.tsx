"use client";

import { useMemo, useState } from "react";

import type {
  AdminBillingCycle,
  AdminPaymentAnalytics,
  AdminPaymentTrendPoint,
  AdminSubscriptionPaymentHealth,
} from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type TrendMode = "weekly" | "monthly" | "quarterly";

function formatMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function cycleLabel(value: AdminBillingCycle) {
  return {
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    HALF_YEARLY: "Half-yearly",
    YEARLY: "Yearly",
    CUSTOM: "Custom",
  }[value];
}

function contactText(row: AdminSubscriptionPaymentHealth) {
  return (
    row.contact.ownerMobile ||
    row.contact.shopPhone ||
    row.contact.ownerEmail ||
    row.contact.shopEmail ||
    "—"
  );
}

function TrendBars({ points }: { points: AdminPaymentTrendPoint[] }) {
  const max = Math.max(1, ...points.map((point) => Number(point.amount)));

  return (
    <div className="space-y-3">
      {points.map((point) => {
        const amount = Number(point.amount);
        const width = Math.max(amount > 0 ? 3 : 0, (amount / max) * 100);
        return (
          <div key={point.from} className="grid grid-cols-[5.5rem_minmax(0,1fr)_7rem] items-center gap-3 text-sm">
            <span className="truncate text-muted">{point.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${width}%` }}
                aria-label={`${point.label}: ${formatMoney(point.amount)}`}
              />
            </div>
            <div className="text-right">
              <p className="font-medium text-foreground">{formatMoney(point.amount)}</p>
              <p className="text-xs text-muted">{point.count} payment{point.count === 1 ? "" : "s"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubscriptionRow({
  row,
  onRecordPayment,
  context,
}: {
  row: AdminSubscriptionPaymentHealth;
  onRecordPayment: (shopId: string) => void;
  context: "upcoming" | "expired" | "pending";
}) {
  const daysText =
    row.daysRemaining >= 0
      ? `${row.daysRemaining} day${row.daysRemaining === 1 ? "" : "s"} left`
      : `${Math.abs(row.daysRemaining)} day${Math.abs(row.daysRemaining) === 1 ? "" : "s"} overdue`;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{row.shopName}</p>
            <Badge
              variant={
                context === "expired"
                  ? "danger"
                  : row.daysRemaining <= 7
                    ? "warning"
                    : "neutral"
              }
            >
              {context === "pending" ? "Payment pending" : daysText}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {row.planName} · valid until {formatDate(row.endDate)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {row.contact.ownerName ? `${row.contact.ownerName} · ` : ""}
            {contactText(row)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {row.lastPayment ? (
            <div className="text-sm lg:text-right">
              <p className="font-medium text-foreground">
                Last {formatMoney(row.lastPayment.amount)}
              </p>
              <p className="text-xs text-muted">
                {cycleLabel(row.lastPayment.billingCycle)} · {formatDate(row.lastPayment.receivedAt)}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted">No payment history</span>
          )}
          <Button type="button" size="sm" onClick={() => onRecordPayment(row.shopId)}>
            Record payment
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminPaymentAnalyticsDashboard({
  analytics,
  onRecordPayment,
}: {
  analytics: AdminPaymentAnalytics;
  onRecordPayment: (shopId: string) => void;
}) {
  const [trendMode, setTrendMode] = useState<TrendMode>("monthly");

  const trendPoints = analytics.trends[trendMode];
  const upcoming = analytics.expiry.upcoming.slice(0, 12);
  const expiredAndGrace = useMemo(
    () =>
      [...analytics.expiry.grace, ...analytics.expiry.expired]
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 12),
    [analytics.expiry.expired, analytics.expiry.grace],
  );

  const methodEntries = Object.entries(analytics.paymentBreakdown.byMethod) as Array<
    [keyof typeof analytics.paymentBreakdown.byMethod, { count: number; amount: string }]
  >;
  const cycleEntries = Object.entries(
    analytics.paymentBreakdown.byBillingCycle,
  ) as Array<[AdminBillingCycle, { count: number; amount: string }]>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total collected", formatMoney(analytics.revenue.total), "All recorded payments"],
          ["This month", formatMoney(analytics.revenue.thisMonth), "Actual received revenue"],
          ["This quarter", formatMoney(analytics.revenue.thisQuarter), "Current calendar quarter"],
          ["This week", formatMoney(analytics.revenue.thisWeek), "Monday to today"],
          [
            "Expiring in 7 days",
            String(analytics.subscriptions.expiringWithin7Days),
            "Needs renewal follow-up",
          ],
          ["Expired", String(analytics.subscriptions.expired), "Subscription no longer usable"],
          [
            "Payment pending",
            String(analytics.subscriptions.pendingPayment),
            "Shops marked pending",
          ],
          ["Active paid", String(analytics.subscriptions.activePaid), "Healthy paid subscriptions"],
        ].map(([label, value, hint]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Revenue trend</CardTitle>
                <CardDescription>
                  Compare actual collections weekly, monthly or quarterly.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["weekly", "monthly", "quarterly"] as TrendMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={trendMode === mode ? "primary" : "secondary"}
                    onClick={() => setTrendMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TrendBars points={trendPoints} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue snapshot</CardTitle>
            <CardDescription>Actual received money by current period.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ["Today", analytics.revenue.today],
                ["This week", analytics.revenue.thisWeek],
                ["This month", analytics.revenue.thisMonth],
                ["This quarter", analytics.revenue.thisQuarter],
                ["This year", analytics.revenue.thisYear],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold text-foreground">{formatMoney(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment method breakdown</CardTitle>
            <CardDescription>Where received money came from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {methodEntries.map(([method, data]) => (
              <div key={method} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="font-medium text-foreground">
                    {method === "BANK_TRANSFER"
                      ? "Bank transfer"
                      : method.charAt(0) + method.slice(1).toLowerCase()}
                  </p>
                  <p className="text-xs text-muted">{data.count} payments</p>
                </div>
                <p className="font-semibold text-foreground">{formatMoney(data.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing cycle breakdown</CardTitle>
            <CardDescription>Weekly, monthly, quarterly and long-term collections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cycleEntries.map(([cycle, data]) => (
              <div key={cycle} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="font-medium text-foreground">{cycleLabel(cycle)}</p>
                  <p className="text-xs text-muted">{data.count} payments</p>
                </div>
                <p className="font-semibold text-foreground">{formatMoney(data.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription expiry intelligence</CardTitle>
          <CardDescription>
            Renewal pipeline grouped by urgency so the admin knows whom to follow up with first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["0–7 days", analytics.subscriptions.expiringWithin7Days],
              ["8–15 days", analytics.subscriptions.expiring8To15Days],
              ["16–30 days", analytics.subscriptions.expiring16To30Days],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-surface-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted">subscriptions nearing expiry</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">No subscriptions expire in the next 30 days.</p>
            ) : (
              upcoming.map((row) => (
                <SubscriptionRow
                  key={row.subscriptionId}
                  row={row}
                  context="upcoming"
                  onRecordPayment={onRecordPayment}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expired & grace follow-up</CardTitle>
            <CardDescription>
              Shops already expired or currently surviving in grace period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiredAndGrace.length === 0 ? (
              <p className="text-sm text-muted">No expired or grace subscriptions.</p>
            ) : (
              expiredAndGrace.map((row) => (
                <SubscriptionRow
                  key={row.subscriptionId}
                  row={row}
                  context="expired"
                  onRecordPayment={onRecordPayment}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment follow-up</CardTitle>
            <CardDescription>
              Shops whose subscription payment state is currently Pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.expiry.pendingPayments.length === 0 ? (
              <p className="text-sm text-muted">No shops are marked payment pending.</p>
            ) : (
              analytics.expiry.pendingPayments.slice(0, 12).map((row) => (
                <SubscriptionRow
                  key={row.subscriptionId}
                  row={row}
                  context="pending"
                  onRecordPayment={onRecordPayment}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top paying shops</CardTitle>
          <CardDescription>Lifetime received revenue from each shop.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topShops.length === 0 ? (
            <p className="text-sm text-muted">No payment history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="pb-3 pr-4 font-semibold">Shop</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Payments</th>
                    <th className="pb-3 text-right font-semibold">Total received</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topShops.map((row) => (
                    <tr key={row.shop.id} className="border-b border-border last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{row.shop.name}</td>
                      <td className="py-3 pr-4"><Badge variant="neutral">{row.shop.status}</Badge></td>
                      <td className="py-3 pr-4 text-right text-foreground">{row.paymentCount}</td>
                      <td className="py-3 text-right font-semibold text-foreground">{formatMoney(row.amount)}</td>
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
