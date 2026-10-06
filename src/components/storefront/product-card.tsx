import Link from "next/link";

import { Badge, Card } from "@/components/ui";
import { availabilityLabel, formatInr } from "@/lib/storefront";
import type { PublicProductSummary } from "@/server/storefront/storefront-data";
import { StorefrontMedia } from "@/components/storefront/storefront-media";

function Price({ product }: { product: PublicProductSummary }) {
  if (!product.priceVisible || product.priceType === "ASK_PRICE") {
    return <p className="text-sm font-semibold text-foreground">Price on request</p>;
  }

  if (product.price == null) {
    return <p className="text-sm font-semibold text-foreground">Price unavailable</p>;
  }

  const price = formatInr(product.price);

  if (
    product.priceType === "FIXED" &&
    product.discountPrice != null &&
    product.discountPrice < product.price
  ) {
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">
          {formatInr(product.discountPrice)}
        </span>
        <span className="text-xs text-muted line-through">{price}</span>
      </div>
    );
  }

  return (
    <p className="text-sm font-semibold text-foreground">
      {product.priceType === "STARTING_FROM" ? "Starting from " : ""}
      {price}
    </p>
  );
}

export function ProductCard({
  shopSlug,
  product,
}: {
  shopSlug: string;
  product: PublicProductSummary;
}) {
  return (
    <Card className="overflow-hidden">
      <Link
        href={`/s/${shopSlug}/p/${product.slug}`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <StorefrontMedia
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <div className="space-y-2 p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5">
            {product.catalogGroup ? <Badge variant="info">{product.catalogGroup}</Badge> : null}
            {product.isNewArrival ? <Badge variant="info">New</Badge> : null}
            {product.isOffer ? <Badge variant="warning">Offer</Badge> : null}
            {product.isFeatured ? <Badge>Featured</Badge> : null}
          </div>
          <div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground sm:text-base">
              {product.name}
            </h3>
            {product.category ? (
              <p className="mt-1 text-xs text-muted">{product.category.name}</p>
            ) : null}
          </div>
          <Price product={product} />
          <p className="text-xs text-muted">{availabilityLabel(product.availabilityStatus)}</p>
        </div>
      </Link>
    </Card>
  );
}
