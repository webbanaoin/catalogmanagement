import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { StorefrontView } from "@/components/storefront/storefront-view";
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

  return {
    title: `${category.name} | ${shop.name}`,
    description: `Browse ${category.name} from ${shop.name}.`,
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
  const q = value(rawSearchParams.q)?.trim() || undefined;
  const availabilityFilter = availability(value(rawSearchParams.availability));
  const pageValue = Number(value(rawSearchParams.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  const [category, data] = await Promise.all([
    getPublicCategory(shopSlug, categorySlug),
    getPublicStorefront(shopSlug, {
      q,
      categorySlug,
      availability: availabilityFilter,
      page,
      includeHighlights: false,
    }),
  ]);

  if (!category || !data) notFound();

  return (
    <StorefrontShell homeHref={`/s/${shopSlug}`} label={data.shop.name}>
      <StorefrontView
        data={data}
        q={q}
        categorySlug={categorySlug}
        availability={availabilityFilter}
        basePath={`/s/${shopSlug}/c/${categorySlug}`}
        collectionTitle={category.name}
        collectionDescription={`${data.pagination.total} product${data.pagination.total === 1 ? "" : "s"} in this category`}
      />
    </StorefrontShell>
  );
}
