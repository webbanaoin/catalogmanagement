import Link from "next/link";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import { availabilityLabel, formatInr } from "@/lib/storefront";
import type { PublicProductSummary } from "@/server/storefront/storefront-data";

function Price({ product }: { product: PublicProductSummary }) {
  if (!product.priceVisible || product.priceType === "ASK_PRICE") {
    return (
      <p className="text-sm font-bold tracking-[-0.01em] text-primary sm:text-base">
        Price on request
      </p>
    );
  }

  if (product.price == null) {
    return <p className="text-sm font-semibold text-muted">Price unavailable</p>;
  }

  const price = formatInr(product.price);

  if (
    product.priceType === "FIXED" &&
    product.discountPrice != null &&
    product.discountPrice < product.price
  ) {
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
          {formatInr(product.discountPrice)}
        </span>
        <span className="text-xs font-medium text-muted line-through sm:text-sm">
          {price}
        </span>
      </div>
    );
  }

  return (
    <p className="text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
      {product.priceType === "STARTING_FROM" ? (
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted sm:text-[11px]">
          From
        </span>
      ) : null}
      {price}
    </p>
  );
}

function availabilityTone(value: PublicProductSummary["availabilityStatus"]) {
  if (value === "IN_STOCK") return "bg-success-soft text-success-strong";
  if (value === "ON_REQUEST") return "bg-warning-soft text-warning-strong";
  return "bg-surface-muted text-muted-strong";
}

export function ProductCard({
  shopSlug,
  product,
}: {
  shopSlug: string;
  product: PublicProductSummary;
}) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-[1.35rem] border border-border/90 bg-surface shadow-[0_8px_28px_rgba(23,32,29,0.055)] transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_18px_40px_rgba(23,32,29,0.1)]">
      <Link
        href={`/s/${shopSlug}/p/${product.slug}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <div className="relative overflow-hidden bg-surface-muted">
          <StorefrontMedia
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          />

          <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {product.isOffer ? (
              <span className="rounded-full bg-warning-soft/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-warning-strong shadow-sm backdrop-blur sm:text-[10px]">
                Offer
              </span>
            ) : null}
            {product.isNewArrival ? (
              <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-surface shadow-sm backdrop-blur sm:text-[10px]">
                New
              </span>
            ) : null}
            {product.isFeatured ? (
              <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm backdrop-blur sm:text-[10px]">
                Featured
              </span>
            ) : null}
          </div>

          <div className="absolute bottom-2 right-2 rounded-full bg-surface/90 px-2.5 py-1 text-[9px] font-semibold text-muted-strong shadow-sm backdrop-blur sm:bottom-3 sm:right-3 sm:text-[10px]">
            View details
          </div>
        </div>

        <div className="flex min-h-[10.5rem] flex-col p-3.5 sm:min-h-[11.25rem] sm:p-4">
          <div className="min-w-0">
            {product.category || product.catalogGroup ? (
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-primary sm:text-[11px]">
                {product.category?.name ?? product.catalogGroup}
              </p>
            ) : null}
            <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-5 tracking-[-0.02em] text-foreground sm:text-base sm:leading-6">
              {product.name}
            </h3>
          </div>

          <div className="mt-auto pt-4">
            <Price product={product} />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span
                className={[
                  "inline-flex min-w-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]",
                  availabilityTone(product.availabilityStatus),
                ].join(" ")}
              >
                <span className="truncate">
                  {availabilityLabel(product.availabilityStatus)}
                </span>
              </span>
              <span className="text-xs font-bold text-primary transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
