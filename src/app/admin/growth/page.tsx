import Link from "next/link";

import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  EmptyState, PageHeader,
} from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";
import { prisma } from "@/server/database/prisma";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "IMPRESSION", "CREATE_CLICK", "PARTNER_CLICK", "EXPLORE_CLICK",
  "MERCHANT_REGISTERED", "PARTNER_REGISTERED",
] as const;

type GrowthEventType = (typeof EVENT_TYPES)[number];
type Metrics = Record<GrowthEventType, number>;

function emptyMetrics(): Metrics {
  return {
    IMPRESSION: 0,
    CREATE_CLICK: 0,
    PARTNER_CLICK: 0,
    EXPLORE_CLICK: 0,
    MERCHANT_REGISTERED: 0,
    PARTNER_REGISTERED: 0,
  };
}

function number(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default async function GrowthAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  await requirePlatformAdminPageAccess();
  const query = await searchParams;
  const daysParam = Array.isArray(query.days) ? query.days[0] : query.days;
  const days = daysParam === "7" ? 7 : daysParam === "90" ? 90 : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const groups = await prisma.storefrontGrowthEvent.groupBy({
    by: ["sourceShopId", "eventType"],
    where: { createdAt: { gte: from } },
    _count: { _all: true },
  });

  const ids = [...new Set(groups.map((row) => row.sourceShopId))];
  const shops = ids.length > 0
    ? await prisma.shop.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, storefrontGrowthPromoEnabled: true },
      })
    : [];
  const shopMap = new Map(shops.map((shop) => [shop.id, shop]));
  const totals = emptyMetrics();
  const perShop = new Map<string, Metrics>();

  for (const row of groups) {
    if (!EVENT_TYPES.some((type) => type === row.eventType)) continue;
    const type = row.eventType as GrowthEventType;
    const metrics = perShop.get(row.sourceShopId) ?? emptyMetrics();
    metrics[type] += row._count._all;
    totals[type] += row._count._all;
    perShop.set(row.sourceShopId, metrics);
  }

  const rows = [...perShop.entries()]
    .map(([id, metrics]) => {
      const shop = shopMap.get(id);
      return shop ? { ...shop, metrics } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) =>
      (b.metrics.CREATE_CLICK + b.metrics.PARTNER_CLICK + b.metrics.EXPLORE_CLICK) -
      (a.metrics.CREATE_CLICK + a.metrics.PARTNER_CLICK + a.metrics.EXPLORE_CLICK)
    );

  const stats = [
    { label: "Promotion impressions", value: totals.IMPRESSION },
    { label: "Create showroom clicks", value: totals.CREATE_CLICK },
    { label: "Partner clicks", value: totals.PARTNER_CLICK },
    { label: "Explore clicks", value: totals.EXPLORE_CLICK },
    { label: "Merchant signups", value: totals.MERCHANT_REGISTERED },
    { label: "Partner signups", value: totals.PARTNER_REGISTERED },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Storefront growth analytics"
        description="See which merchant showrooms introduce new visitors to Webbanao and generate completed registrations."
      />
      <nav aria-label="Growth report date range" className="flex flex-wrap gap-2">
        {[7, 30, 90].map((value) => (
          <Link
            key={value}
            href={`/admin/growth?days=${value}`}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary ${
              days === value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-foreground"
            }`}
          >
            Last {value} days
          </Link>
        ))}
      </nav>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 sm:pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-black text-foreground">{number(stat.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Attribution by source showroom</CardTitle>
              <CardDescription>Actual completed registrations are shown separately from CTA clicks.</CardDescription>
            </div>
            <Badge variant="info">{rows.length} source shops</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title="No growth promotion activity yet"
              description="Open an active showroom and scroll to its promotion to record the first impression."
              className="min-h-40"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Source shop</th>
                    <th className="px-3 py-3 text-right">Views</th>
                    <th className="px-3 py-3 text-right">Create</th>
                    <th className="px-3 py-3 text-right">Earn</th>
                    <th className="px-3 py-3 text-right">Explore</th>
                    <th className="px-3 py-3 text-right">Merchant signups</th>
                    <th className="px-3 py-3 text-right">Partner signups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted/30">
                      <td className="px-3 py-3">
                        <Link href={`/s/${row.slug}`} className="font-semibold text-primary hover:underline">
                          {row.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {row.storefrontGrowthPromoEnabled ? "Promotion ON" : "Promotion OFF"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right">{number(row.metrics.IMPRESSION)}</td>
                      <td className="px-3 py-3 text-right">{number(row.metrics.CREATE_CLICK)}</td>
                      <td className="px-3 py-3 text-right">{number(row.metrics.PARTNER_CLICK)}</td>
                      <td className="px-3 py-3 text-right">{number(row.metrics.EXPLORE_CLICK)}</td>
                      <td className="px-3 py-3 text-right font-bold text-primary">{number(row.metrics.MERCHANT_REGISTERED)}</td>
                      <td className="px-3 py-3 text-right font-bold text-primary">{number(row.metrics.PARTNER_REGISTERED)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-muted">
            Impressions are measured when the banner enters the viewport (deduplicated per browser session and page).
            Clicks are interactions, not unique people. Successful registrations are counted after the registration
            transaction commits and may complete on another visit; numbers are indicative, not commission evidence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
