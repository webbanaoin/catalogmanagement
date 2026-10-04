import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontAnalytics } from "@/components/storefront/storefront-analytics";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { StorefrontView } from "@/components/storefront/storefront-view";
import { getAppEnvironment } from "@/server/env";
import {
  getPublicShop,
  getPublicStorefront,
  type StorefrontQuery,
} from "@/server/storefront/storefront-data";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined): string | undefined {
  return Array.isArray(input) ? input[0] : input;
}

function availability(input: string | undefined): StorefrontQuery["availability"] {
  return input === "IN_STOCK" || input === "OUT_OF_STOCK" || input === "ON_REQUEST"
    ? input
    : undefined;
}

function pageNumber(input: string | undefined): number {
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}): Promise<Metadata> {
  const { shopSlug } = await params;
  const shop = await getPublicShop(shopSlug);

  if (!shop) {
    return { title: "Shop not found" };
  }

  const description =
    shop.description?.slice(0, 160) ??
    shop.tagline ??
    `Browse the latest catalogue from ${shop.name}.`;
  const canonical = new URL(`/s/${shopSlug}`, getAppEnvironment().APP_URL).toString();

  return {
    title: `${shop.name} | Digital Showroom`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${shop.name} | Digital Showroom`,
      description,
      url: canonical,
      type: "website",
    },
    manifest: `/s/${shopSlug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: shop.name,
      statusBarStyle: "default",
    },
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ shopSlug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const q = value(rawSearchParams.q)?.trim().slice(0, 120) || undefined;
  const categorySlug = value(rawSearchParams.category)?.trim().slice(0, 160) || undefined;
  const availabilityFilter = availability(value(rawSearchParams.availability));
  const page = pageNumber(value(rawSearchParams.page));
  const includeHighlights = !q && !categorySlug && !availabilityFilter && page === 1;

  const data = await getPublicStorefront(shopSlug, {
    q,
    categorySlug,
    availability: availabilityFilter,
    page,
    includeHighlights,
  });

  if (!data) notFound();

  return (
    <StorefrontShell homeHref={`/s/${shopSlug}`} label={data.shop.name} shopSlug={shopSlug}>
      <StorefrontAnalytics shopSlug={shopSlug} eventType="CATALOG_VISIT" />
      <StorefrontView
        data={data}
        q={q}
        categorySlug={categorySlug}
        availability={availabilityFilter}
        basePath={`/s/${shopSlug}`}
      />
    </StorefrontShell>
  );
}
