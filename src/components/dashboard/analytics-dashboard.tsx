"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AnalyticsApiError,
  getShopAnalytics,
  type AnalyticsSummary,
} from "@/lib/analytics-api";
import {
  CatalogApiError,
  getCurrentMerchantShop,
  type MerchantShop,
} from "@/lib/catalog-api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Select,
  buttonClassName,
} from "@/components/ui";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
] as const;

type RangeDays = (typeof RANGE_OPTIONS)[number]["value"];

function rangeFor(days: RangeDays) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (Number(days) - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatRange(range: AnalyticsSummary["range"]) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(range.from))} – ${formatter.format(new Date(range.to))}`;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {formatNumber(value)}
        </p>
        {hint ? <p className="mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function RankedList({
  items,
  empty,
}: {
  items: Array<{ key: string; label: string; value: number; href?: string }>;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-muted">{empty}</p>;
  }

  const maximum = Math.max(...items.map((item) => item.value), 1);

  return (
    <ol className="space-y-4">
      {items.map((item, index) => {
        const width = Math.max(4, Math.round((item.value / maximum) * 100));
        const content = (
          <>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 truncate font-medium text-foreground">
                {index + 1}. {item.label}
              </span>
              <span className="shrink-0 text-muted">{formatNumber(item.value)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
            </div>
          </>
        );

        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}

function featureUnavailable(error: AnalyticsApiError) {
  return ["FEATURE_NOT_INCLUDED", "SUBSCRIPTION_REQUIRED", "SUBSCRIPTION_EXPIRED"].includes(
    error.code,
  );
}

export function AnalyticsDashboard() {
  const [shop, setShop] = useState<MerchantShop | null>(null);
  const [days, setDays] = useState<RangeDays>("30");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<AnalyticsApiError | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getCurrentMerchantShop()
      .then((current) => {
        if (active) setShop(current);
      })
      .catch((error) => {
        if (!active) return;
        setShopError(
          error instanceof CatalogApiError ? error.message : "Unable to load the merchant shop.",
        );
      })
      .finally(() => {
        if (active) setLoadingShop(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!shop) return;

    let active = true;
    setLoadingAnalytics(true);
    setAnalyticsError(null);

    getShopAnalytics(shop.id, rangeFor(days))
      .then((summary) => {
        if (active) setData(summary);
      })
      .catch((error) => {
        if (!active) return;
        setData(null);
        setAnalyticsError(
          error instanceof AnalyticsApiError
            ? error
            : new AnalyticsApiError(
                "ANALYTICS_REQUEST_FAILED",
                "Unable to load analytics.",
                500,
              ),
        );
      })
      .finally(() => {
        if (active) setLoadingAnalytics(false);
      });

    return () => {
      active = false;
    };
  }, [days, reloadKey, shop]);

  const actionItems = useMemo(
    () =>
      data
        ? [
            { label: "WhatsApp", value: data.actions.whatsapp },
            { label: "Calls", value: data.actions.call },
            { label: "Directions", value: data.actions.directions },
            { label: "Shares", value: data.actions.share },
            { label: "PWA installs", value: data.actions.pwaInstall },
          ]
        : [],
    [data],
  );

  if (loadingShop) {
    return (
      <LoadingState
        title="Loading analytics workspace"
        description="Resolving your tenant-safe merchant shop."
      />
    );
  }

  if (shopError || !shop) {
    return (
      <ErrorState
        title="Analytics unavailable"
        description={shopError ?? "No approved or active merchant shop is available."}
      />
    );
  }

  if (loadingAnalytics && !data) {
    return (
      <LoadingState
        title="Loading shop analytics"
        description="Aggregating catalogue visits, product views and customer actions."
      />
    );
  }

  if (analyticsError && featureUnavailable(analyticsError)) {
    return (
      <EmptyState
        title="Analytics is not available on the current subscription"
        description={analyticsError.message}
      />
    );
  }

  if (analyticsError) {
    return (
      <ErrorState
        title="Unable to load analytics"
        description={analyticsError.message}
        action={
          <Button onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{shop.name}</p>
          <p className="mt-1 text-xs text-muted">{formatRange(data.range)}</p>
        </div>
        <Field label="Analytics range" htmlFor="analytics-range" className="sm:w-52">
          <Select
            id="analytics-range"
            value={days}
            onChange={(event) => setDays(event.target.value as RangeDays)}
            disabled={loadingAnalytics}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loadingAnalytics ? (
        <Alert title="Refreshing analytics">Updating this date range…</Alert>
      ) : null}

      <section aria-labelledby="analytics-overview">
        <h2 id="analytics-overview" className="sr-only">Analytics overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Catalogue visits" value={data.totals.catalogVisits} />
          <MetricCard label="Unique visits" value={data.totals.uniqueVisits} hint="Session-aware" />
          <MetricCard label="QR visits" value={data.totals.qrVisits} />
          <MetricCard label="Product views" value={data.totals.productViews} />
          <MetricCard label="Customer actions" value={data.totals.customerActions} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer actions</CardTitle>
            <CardDescription>Actions recorded from the public storefront.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {actionItems.map((action) => (
                <div key={action.label} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted">{action.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatNumber(action.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic sources</CardTitle>
            <CardDescription>Where catalogue visits originated.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              items={data.trafficSources.map((source) => ({
                key: source.source,
                label: source.source || "direct",
                value: source.visits,
              }))}
              empty="No traffic-source data is available for this range."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Top products</CardTitle>
              <Badge variant="info">Views</Badge>
            </div>
            <CardDescription>Products ranked by recorded public views.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              items={data.topProducts.map((product) => ({
                key: product.productId,
                label: product.name,
                value: product.views,
                href: `/s/${shop.slug}/p/${product.slug}`,
              }))}
              empty="No product views are available for this range."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Top categories</CardTitle>
              <Badge variant="info">Views</Badge>
            </div>
            <CardDescription>Categories ranked from their product-view totals.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              items={data.topCategories.map((category) => ({
                key: category.categoryId,
                label: category.name,
                value: category.views,
                href: `/s/${shop.slug}/c/${category.slug}`,
              }))}
              empty="No category views are available for this range."
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/s/${shop.slug}`} className={buttonClassName("secondary", "sm")}>
          Open public catalogue
        </Link>
        <Link href="/dashboard/qr" className={buttonClassName("secondary", "sm")}>
          Open QR workspace
        </Link>
      </div>
    </div>
  );
}
