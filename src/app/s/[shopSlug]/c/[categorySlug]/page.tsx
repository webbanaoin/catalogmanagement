import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { StorefrontView } from "@/components/storefront/storefront-view";
import { getAppEnvironment } from "@/server/env";
import {
  getPublicCategory,
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { shopSlug, categorySlug } = await params;
  const [shop, category] = await Promise.all([
    getPublicShop(shopSlug),
    getPublicCategory(shopSlug, categorySlug),
  ]);

  if (!shop || !category) return { title: "Category not found" };

  const description = `Browse ${category.name} from ${shop.name}.`;
  const canonical = new URL(
    `/s/${shopSlug}/c/${categorySlug}`,
    getAppEnvironment().APP_URL,
  ).toString();

  return {
    title: `${category.name} | ${shop.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${category.name} | ${shop.name}`,
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

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string; categorySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ shopSlug, categorySlug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const q = value(rawSearchParams.q)?.trim().slice(0, 120) || undefined;
  const catalogGroup = value(rawSearchParams.group)?.trim().slice(0, 120) || undefined;
  const attributeValue = value(rawSearchParams.spec)?.trim().slice(0, 500) || undefined;
  const availabilityFilter = availability(value(rawSearchParams.availability));
  const pageValue = Number(value(rawSearchParams.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 10000) : 1;

  const [category, data] = await Promise.all([
    getPublicCategory(shopSlug, categorySlug),
    getPublicStorefront(shopSlug, {
      q,
      categorySlug,
      catalogGroup,
      attributeValue,
      availability: availabilityFilter,
      page,
      includeHighlights: false,
    }),
  ]);

  if (!category || !data) notFound();

  return (
    <StorefrontShell
      homeHref={`/s/${shopSlug}`}
      label={data.shop.name}
      logoUrl={data.shop.logoUrl}
      shopSlug={shopSlug}
    >
      <StorefrontView
        data={data}
        q={q}
        categorySlug={categorySlug}
        catalogGroup={catalogGroup}
        attributeValue={attributeValue}
        availability={availabilityFilter}
        basePath={`/s/${shopSlug}/c/${categorySlug}`}
        collectionTitle={category.name}
        collectionDescription={`${data.pagination.total} product${data.pagination.total === 1 ? "" : "s"} in this category`}
      />
    </StorefrontShell>
  );
}
