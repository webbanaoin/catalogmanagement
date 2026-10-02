import Link from "next/link";

import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontActions } from "@/components/storefront/storefront-actions";
import { StorefrontFilters } from "@/components/storefront/storefront-filters";
import { StorefrontMedia } from "@/components/storefront/storefront-media";
import { StorefrontSection } from "@/components/storefront/storefront-shell";
import { Badge, Container, EmptyState, buttonClassName } from "@/components/ui";
import type {
  PublicProductSummary,
  PublicShop,
  PublicStorefrontResult,
} from "@/server/storefront/storefront-data";

const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function ShopHero({ shop }: { shop: PublicShop }) {
  const location = [shop.address, shop.city, shop.state].filter(Boolean).join(", ");

  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-4 sm:py-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted">
          <StorefrontMedia
            src={shop.coverUrl}
            alt={`${shop.name} cover`}
            className="aspect-[16/6] w-full sm:aspect-[16/5]"
            eager
          />
        </div>

        <div className="relative -mt-8 flex items-end gap-4 px-3 sm:-mt-10 sm:px-5">
          <StorefrontMedia
            src={shop.logoUrl}
            alt={`${shop.name} logo`}
            className="size-20 shrink-0 rounded-2xl border-4 border-surface bg-surface shadow-sm sm:size-24"
            eager
          />
          <div className="min-w-0 flex-1 pb-1">
            {shop.businessCategoryName ? (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {shop.businessCategoryName}
              </p>
            ) : null}
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {shop.name}
            </h1>
            {shop.tagline ? <p className="mt-1 text-sm text-muted">{shop.tagline}</p> : null}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {location ? <p className="text-sm leading-6 text-muted">{location}</p> : null}
          <StorefrontActions
            title={shop.name}
            phone={shop.phone}
            whatsapp={shop.whatsapp}
            directionsUrl={shop.googleMapsUrl}
          />

          {shop.hours.length > 0 ? (
            <details className="rounded-xl border border-border bg-background p-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Opening hours
              </summary>
              <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {shop.hours.map((hour) => (
                  <div key={hour.dayOfWeek} className="flex justify-between gap-4">
                    <span>{dayLabels[hour.dayOfWeek] ?? `Day ${hour.dayOfWeek + 1}`}</span>
                    <span>
                      {hour.isClosed
                        ? "Closed"
                        : hour.openTime && hour.closeTime
                          ? `${hour.openTime} – ${hour.closeTime}`
                          : "Hours not set"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

function CategoryLinks({
  shopSlug,
  categories,
  activeCategory,
}: {
  shopSlug: string;
  categories: PublicStorefrontResult["categories"];
  activeCategory?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Shop categories">
      <Link
        href={`/s/${shopSlug}`}
        className={buttonClassName(activeCategory ? "secondary" : "primary", "sm", "shrink-0")}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/s/${shopSlug}/c/${category.slug}`}
          className={buttonClassName(
            activeCategory === category.slug ? "primary" : "secondary",
            "sm",
            "shrink-0",
          )}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}

function ProductGrid({
  shopSlug,
  products,
  emptyTitle,
  emptyDescription,
}: {
  shopSlug: string;
  products: PublicProductSummary[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} shopSlug={shopSlug} product={product} />
      ))}
    </div>
  );
}

function Pagination({
  basePath,
  page,
  totalPages,
  q,
  categorySlug,
  availability,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  q?: string;
  categorySlug?: string;
  availability?: string;
}) {
  if (totalPages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    if (availability) params.set("availability", availability);
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Product pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClassName("secondary", "sm")}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={buttonClassName("secondary", "sm")}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function HighlightSection({
  title,
  shopSlug,
  products,
  badge,
}: {
  title: string;
  shopSlug: string;
  products: PublicProductSummary[];
  badge?: string;
}) {
  if (products.length === 0) return null;

  return (
    <StorefrontSection
      title={title}
      action={badge ? <Badge variant="info">{badge}</Badge> : undefined}
    >
      <ProductGrid
        shopSlug={shopSlug}
        products={products}
        emptyTitle="No products"
        emptyDescription="No products are available in this section yet."
      />
    </StorefrontSection>
  );
}

export function StorefrontView({
  data,
  q,
  categorySlug,
  availability,
  basePath,
  collectionTitle = "All products",
  collectionDescription,
}: {
  data: PublicStorefrontResult;
  q?: string;
  categorySlug?: string;
  availability?: string;
  basePath: string;
  collectionTitle?: string;
  collectionDescription?: string;
}) {
  const filtered = Boolean(q || categorySlug || availability);

  return (
    <>
      <ShopHero shop={data.shop} />

      {data.shop.description ? (
        <StorefrontSection title="About this shop">
          <p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-muted">
            {data.shop.description}
          </p>
        </StorefrontSection>
      ) : null}

      <StorefrontSection title="Browse this shop">
        <div className="space-y-4">
          <StorefrontFilters
            shopSlug={data.shop.slug}
            categories={data.categories}
            q={q}
            categorySlug={categorySlug}
            availability={availability}
          />
          <CategoryLinks
            shopSlug={data.shop.slug}
            categories={data.categories}
            activeCategory={categorySlug}
          />
        </div>
      </StorefrontSection>

      {!filtered ? (
        <>
          <HighlightSection
            title="Featured"
            shopSlug={data.shop.slug}
            products={data.featured}
            badge="Featured"
          />
          <HighlightSection
            title="New arrivals"
            shopSlug={data.shop.slug}
            products={data.newArrivals}
            badge="New"
          />
          <HighlightSection
            title="Offers"
            shopSlug={data.shop.slug}
            products={data.offers}
            badge="Offers"
          />
        </>
      ) : null}

      <StorefrontSection
        title={collectionTitle}
        description={
          collectionDescription ??
          (filtered
            ? `${data.pagination.total} matching product${data.pagination.total === 1 ? "" : "s"}`
            : `${data.pagination.total} product${data.pagination.total === 1 ? "" : "s"} available`)
        }
      >
        <ProductGrid
          shopSlug={data.shop.slug}
          products={data.products}
          emptyTitle="No products found"
          emptyDescription="Try another search, category or availability filter."
        />
        <Pagination
          basePath={basePath}
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          q={q}
          categorySlug={categorySlug}
          availability={availability}
        />
      </StorefrontSection>
    </>
  );
}
