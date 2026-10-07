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

const dayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function ShopHero({
  shop,
  productCount,
  categoryCount,
  newArrivalCount,
  offerCount,
}: {
  shop: PublicShop;
  productCount: number;
  categoryCount: number;
  newArrivalCount: number;
  offerCount: number;
}) {
  const location = [shop.address, shop.city, shop.state]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="pb-4 pt-4 sm:pb-6 sm:pt-6">
      <Container>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-foreground shadow-[0_24px_70px_rgba(23,32,29,0.12)] sm:rounded-[2rem]">
          <StorefrontMedia
            src={shop.coverUrl}
            alt={`${shop.name} cover`}
            className="aspect-[4/3] w-full sm:aspect-[16/7] lg:aspect-[16/6]"
            eager
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15" />

          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            <span className="inline-flex rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-md sm:text-xs">
              {shop.businessCategoryName ?? "Digital Showroom"}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 hidden rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md sm:block">
            Curated catalogue
          </div>
        </div>

        <div className="relative -mt-10 mx-2 rounded-[1.5rem] border border-border bg-surface/95 p-4 shadow-[0_20px_50px_rgba(23,32,29,0.11)] backdrop-blur-xl sm:-mt-14 sm:mx-6 sm:p-6 lg:mx-10 lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <StorefrontMedia
              src={shop.logoUrl}
              alt={`${shop.name} logo`}
              className="size-20 shrink-0 rounded-[1.25rem] border border-border bg-surface shadow-[0_10px_25px_rgba(23,32,29,0.12)] sm:size-24 lg:size-28"
              eager
            />

            <div className="grid min-w-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:gap-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary sm:text-xs">
                  Welcome to our showroom
                </p>
                <h1 className="storefront-heading mt-1.5 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                  {shop.name}
                </h1>
                {shop.tagline ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                    {shop.tagline}
                  </p>
                ) : null}

                {shop.description ? (
                  <p className="mt-4 line-clamp-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted">
                    {shop.description}
                  </p>
                ) : null}

                {location ? (
                  <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-strong">
                    <span className="mt-0.5 shrink-0" aria-hidden="true">
                      ◉
                    </span>
                    <span>{location}</span>
                  </p>
                ) : null}

                <div className="mt-5">
                  <StorefrontActions
                    title={shop.name}
                    shopSlug={shop.slug}
                    phone={shop.phone}
                    whatsapp={shop.whatsapp}
                    directionsUrl={shop.googleMapsUrl}
                  />
                </div>
              </div>

              <aside className="overflow-hidden rounded-[1.25rem] border border-primary/10 bg-[linear-gradient(145deg,#f1f7f4_0%,#ffffff_58%,#f8f4ea_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
                      Showroom at a glance
                    </p>
                    <p className="mt-1 text-sm leading-5 text-muted">
                      Everything organised for quick discovery.
                    </p>
                  </div>
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm"
                    aria-hidden="true"
                  >
                    ✦
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/80 bg-surface/85 p-3 shadow-sm">
                    <p className="storefront-heading text-xl font-bold text-foreground">
                      {productCount}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-muted">
                      Products
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-surface/85 p-3 shadow-sm">
                    <p className="storefront-heading text-xl font-bold text-foreground">
                      {categoryCount}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-muted">
                      Categories
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-surface/85 p-3 shadow-sm">
                    <p className="storefront-heading text-xl font-bold text-foreground">
                      {newArrivalCount}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-muted">
                      New arrivals
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-surface/85 p-3 shadow-sm">
                    <p className="storefront-heading text-xl font-bold text-foreground">
                      {offerCount}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-muted">
                      Offers
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={`/s/${shop.slug}#storefront-categories`}
                    className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-xs font-bold text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary"
                  >
                    Browse categories
                  </a>
                  <a
                    href={`/s/${shop.slug}#storefront-products`}
                    className="rounded-xl bg-foreground px-3 py-2.5 text-center text-xs font-bold text-surface shadow-sm transition hover:bg-primary"
                  >
                    View collection
                  </a>
                </div>

                <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Direct shop contact · No marketplace middleman
                </p>
              </aside>
            </div>
          </div>

          {shop.hours.length > 0 ? (
            <details className="mt-5 rounded-xl border border-border/80 bg-background/70 px-4 py-3 sm:px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground marker:hidden">
                <span>Opening hours</span>
                <span className="text-xs font-medium text-muted">View hours ▾</span>
              </summary>
              <div className="mt-4 grid gap-x-8 gap-y-2 border-t border-border pt-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
                {shop.hours.map((hour) => (
                  <div
                    key={hour.dayOfWeek}
                    className="flex justify-between gap-4 rounded-lg py-1"
                  >
                    <span className="font-medium text-muted-strong">
                      {dayLabels[hour.dayOfWeek] ??
                        `Day ${hour.dayOfWeek + 1}`}
                    </span>
                    <span className="text-right">
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

function GroupLinks({
  shopSlug,
  label,
  groups,
  activeGroup,
}: {
  shopSlug: string;
  label: string;
  groups: string[];
  activeGroup?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-strong">
        Shop by {label}
      </p>
      <div
        className="storefront-scroll flex gap-2 overflow-x-auto pb-1"
        aria-label={label}
      >
        <Link
          href={`/s/${shopSlug}`}
          className={buttonClassName(
            activeGroup ? "secondary" : "primary",
            "sm",
            "shrink-0 rounded-full px-4",
          )}
        >
          All
        </Link>
        {groups.map((group) => {
          const params = new URLSearchParams({ group });
          return (
            <Link
              key={group}
              href={`/s/${shopSlug}?${params.toString()}`}
              className={buttonClassName(
                activeGroup === group ? "primary" : "secondary",
                "sm",
                "shrink-0 rounded-full px-4",
              )}
            >
              {group}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CategoryShowcase({
  shopSlug,
  categories,
  activeCategory,
  catalogGroup,
  attributeValue,
}: {
  shopSlug: string;
  categories: PublicStorefrontResult["categories"];
  activeCategory?: string;
  catalogGroup?: string;
  attributeValue?: string;
}) {
  if (categories.length === 0) return null;

  function href(category: string) {
    const params = new URLSearchParams();
    if (catalogGroup) params.set("group", catalogGroup);
    if (attributeValue) params.set("spec", attributeValue);
    params.set("category", category);
    return `/s/${shopSlug}?${params.toString()}`;
  }

  return (
    <StorefrontSection
      eyebrow="Explore"
      title="Shop by category"
      description="Browse the collection the way you naturally shop."
    >
      <div className="storefront-scroll flex gap-3 overflow-x-auto pb-2 sm:gap-4 lg:grid lg:grid-cols-4 lg:overflow-visible xl:grid-cols-6">
        {categories.map((category) => {
          const active = activeCategory === category.slug;
          return (
            <Link
              key={category.slug}
              href={href(category.slug)}
              className={[
                "group relative w-[8.75rem] shrink-0 overflow-hidden rounded-[1.25rem] border bg-surface shadow-[0_8px_24px_rgba(23,32,29,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(23,32,29,0.1)] sm:w-[10rem] lg:w-auto",
                active
                  ? "border-primary ring-2 ring-primary/15"
                  : "border-border/90 hover:border-primary/25",
              ].join(" ")}
            >
              <div className="relative overflow-hidden">
                <StorefrontMedia
                  src={category.imageUrl}
                  alt={category.name}
                  className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-bold leading-5 tracking-[-0.015em] text-foreground">
                  {category.name}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  Explore →
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </StorefrontSection>
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-5">
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
  catalogGroup,
  attributeValue,
  availability,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: string;
}) {
  if (totalPages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    if (catalogGroup) params.set("group", catalogGroup);
    if (attributeValue) params.set("spec", attributeValue);
    if (availability) params.set("availability", availability);
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav
      className="mt-7 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:mt-8 sm:p-4"
      aria-label="Product pages"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className={buttonClassName("secondary", "sm", "rounded-xl")}
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-xs font-semibold text-muted sm:text-sm">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className={buttonClassName("secondary", "sm", "rounded-xl")}
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function HighlightSection({
  title,
  eyebrow,
  description,
  shopSlug,
  products,
  tone = "default",
}: {
  title: string;
  eyebrow: string;
  description: string;
  shopSlug: string;
  products: PublicProductSummary[];
  tone?: "default" | "soft";
}) {
  if (products.length === 0) return null;

  return (
    <StorefrontSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      tone={tone}
      action={
        <Badge variant="info">
          {products.length} pick{products.length === 1 ? "" : "s"}
        </Badge>
      }
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
  catalogGroup,
  attributeValue,
  availability,
  basePath,
  collectionTitle = "All products",
  collectionDescription,
}: {
  data: PublicStorefrontResult;
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: string;
  basePath: string;
  collectionTitle?: string;
  collectionDescription?: string;
}) {
  const filtered = Boolean(
    q || categorySlug || catalogGroup || attributeValue || availability,
  );

  return (
    <>
      <ShopHero
        shop={data.shop}
        productCount={data.pagination.total}
        categoryCount={data.categories.length}
        newArrivalCount={data.newArrivals.length}
        offerCount={data.offers.length}
      />

      {!filtered ? (
        <div id="storefront-categories" className="scroll-mt-24">
          <CategoryShowcase
            shopSlug={data.shop.slug}
            categories={data.categories}
            activeCategory={categorySlug}
            catalogGroup={catalogGroup}
            attributeValue={attributeValue}
          />
        </div>
      ) : null}

      <StorefrontSection
        eyebrow="Discover"
        title="Find your perfect pick"
        description="Search the catalogue or refine by collection, category and availability."
        tone={filtered ? "default" : "soft"}
      >
        <div className="space-y-5">
          <StorefrontFilters
            shopSlug={data.shop.slug}
            categories={data.categories}
            catalogGroups={data.catalogGroups}
            catalogGroupLabel={data.shop.catalogGroupLabel}
            primaryFilter={data.primaryFilter}
            q={q}
            categorySlug={categorySlug}
            catalogGroup={catalogGroup}
            attributeValue={attributeValue}
            availability={availability}
          />
          <GroupLinks
            shopSlug={data.shop.slug}
            label={data.shop.catalogGroupLabel}
            groups={data.catalogGroups}
            activeGroup={catalogGroup}
          />
        </div>
      </StorefrontSection>

      {!filtered ? (
        <>
          <HighlightSection
            eyebrow="Editor's selection"
            title="Featured favourites"
            description="A handpicked selection worth discovering first."
            shopSlug={data.shop.slug}
            products={data.featured}
          />
          <HighlightSection
            eyebrow="Just added"
            title="New arrivals"
            description="Fresh additions to the showroom, ready to explore."
            shopSlug={data.shop.slug}
            products={data.newArrivals}
            tone="soft"
          />
          <HighlightSection
            eyebrow="Worth a look"
            title="Special offers"
            description="Current highlighted offers from this collection."
            shopSlug={data.shop.slug}
            products={data.offers}
          />
        </>
      ) : null}

      <div id="storefront-products" className="scroll-mt-24">
        <StorefrontSection
          eyebrow={filtered ? "Filtered catalogue" : "Complete collection"}
        title={collectionTitle}
        description={
          collectionDescription ??
          (filtered
            ? `${data.pagination.total} matching product${data.pagination.total === 1 ? "" : "s"}`
            : `${data.pagination.total} product${data.pagination.total === 1 ? "" : "s"} available to browse`)
        }
        tone={!filtered ? "soft" : "default"}
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
          catalogGroup={catalogGroup}
          attributeValue={attributeValue}
          availability={availability}
        />
        </StorefrontSection>
      </div>
    </>
  );
}
