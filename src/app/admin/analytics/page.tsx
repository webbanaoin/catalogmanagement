import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";
import { prisma } from "@/server/database/prisma";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default async function PlatformAnalyticsPage() {
  await requirePlatformAdminPageAccess();
  const now = new Date();
  const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [shopGroups, products, visits, views, actions, visitGroups] = await Promise.all([
    prisma.shop.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.catalogVisit.count({ where: { visitedAt: { gte: from, lte: now } } }),
    prisma.productView.count({ where: { viewedAt: { gte: from, lte: now } } }),
    prisma.customerAction.count({ where: { createdAt: { gte: from, lte: now } } }),
    prisma.catalogVisit.groupBy({
      by: ["shopId"],
      where: { visitedAt: { gte: from, lte: now } },
      _count: { _all: true },
    }),
  ]);

  const shopIds = visitGroups.map((group) => group.shopId);
  const shops = shopIds.length
    ? await prisma.shop.findMany({
        where: { id: { in: shopIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];

  const shopMap = new Map(shops.map((shop) => [shop.id, shop]));
  const topShops = visitGroups
    .map((group) => {
      const shop = shopMap.get(group.shopId);
      return shop ? { ...shop, visits: group._count._all } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  const totalShops = shopGroups.reduce((sum, group) => sum + group._count._all, 0);
  const metrics = [
    { label: "Shops", value: totalShops },
    { label: "Products", value: products },
    { label: "Catalogue visits", value: visits },
    { label: "Customer actions", value: actions },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Platform analytics"
        description="A protected operational view of platform catalogue activity over the last 30 days."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-5 sm:pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(metric.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Shop lifecycle</CardTitle>
              <CardDescription>Current shops grouped by platform status.</CardDescription>
            </div>
            <Badge variant="info">Current</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {shopGroups.map((group) => (
              <div key={group.status} className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs text-muted">{group.status}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(group._count._all)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top shops by catalogue visits</CardTitle>
          <CardDescription>Visit activity for the last 30 days. Product views: {formatNumber(views)}.</CardDescription>
        </CardHeader>
        <CardContent>
          {topShops.length === 0 ? (
            <EmptyState title="No platform visit data yet" className="min-h-40" />
          ) : (
            <ol className="space-y-3">
              {topShops.map((shop, index) => (
                <li key={shop.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{index + 1}. {shop.name}</p>
                    <p className="text-xs text-muted">/s/{shop.slug}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">{formatNumber(shop.visits)}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
