import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/storefront/product-gallery";
import { StorefrontAnalytics } from "@/components/storefront/storefront-analytics";
import { StorefrontActions } from "@/components/storefront/storefront-actions";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { Badge, Card, CardContent, Container, buttonClassName } from "@/components/ui";
import { availabilityLabel, formatInr } from "@/lib/storefront";
import { getPublicProduct } from "@/server/storefront/storefront-data";
import { getAppEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { shopSlug, productSlug } = await params;
  const result = await getPublicProduct(shopSlug, productSlug);

  if (!result) return { title: "Product not found" };

  return {
    title: `${result.product.name} | ${result.shop.name}`,
    description:
      result.product.description?.slice(0, 160) ??
      `View ${result.product.name} from ${result.shop.name}.`,
  };
}

function ProductPrice({
  priceType,
  price,
  discountPrice,
}: {
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  price: number | null;
  discountPrice: number | null;
}) {
  if (priceType === "ASK_PRICE") {
    return <p className="text-2xl font-semibold text-foreground">Ask for price</p>;
  }

  if (price == null) {
    return <p className="text-lg font-semibold text-foreground">Price unavailable</p>;
  }

  if (priceType === "FIXED" && discountPrice != null && discountPrice < price) {
    return (
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-foreground">{formatInr(discountPrice)}</span>
        <span className="text-base text-muted line-through">{formatInr(price)}</span>
      </div>
    );
  }

  return (
    <p className="text-2xl font-semibold text-foreground">
      {priceType === "STARTING_FROM" ? "Starting from " : ""}
      {formatInr(price)}
    </p>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ shopSlug: string; productSlug: string }>;
}) {
  const { shopSlug, productSlug } = await params;
  const result = await getPublicProduct(shopSlug, productSlug);

  if (!result) notFound();

  const { shop, product } = result;
  const productUrl = new URL(
    `/s/${shopSlug}/p/${productSlug}`,
    getAppEnvironment().APP_URL,
  ).toString();
  const whatsappMessage = `Hi, I'm interested in ${product.name} from ${shop.name}. ${productUrl}`;

  return (
    <StorefrontShell homeHref={`/s/${shopSlug}`} label={shop.name}>
      <StorefrontAnalytics
        shopSlug={shopSlug}
        productSlug={productSlug}
        eventType="PRODUCT_VIEW"
      />
      <Container className="py-5 sm:py-8">
        <Link
          href={`/s/${shopSlug}`}
          className={buttonClassName("ghost", "sm", "mb-4 -ml-3")}
        >
          ← Back to shop
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
          <ProductGallery productName={product.name} images={product.images} />

          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap gap-2">
                {product.category ? (
                  <Link href={`/s/${shopSlug}/c/${product.category.slug}`}>
                    <Badge variant="info">{product.category.name}</Badge>
                  </Link>
                ) : null}
                {product.isNewArrival ? <Badge>New arrival</Badge> : null}
                {product.isOffer ? <Badge variant="warning">Offer</Badge> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {availabilityLabel(product.availabilityStatus)}
                {product.sku ? ` · SKU ${product.sku}` : ""}
              </p>
            </div>

            <ProductPrice
              priceType={product.priceType}
              price={product.price}
              discountPrice={product.discountPrice}
            />

            <StorefrontActions
              title={`${product.name} | ${shop.name}`}
              shopSlug={shopSlug}
              productSlug={productSlug}
              phone={shop.phone}
              whatsapp={shop.whatsapp}
              directionsUrl={shop.googleMapsUrl}
              whatsappMessage={whatsappMessage}
            />

            {product.description ? (
              <Card>
                <CardContent className="pt-5 sm:pt-6">
                  <h2 className="text-base font-semibold text-foreground">About this product</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {product.attributes.length > 0 ? (
              <Card>
                <CardContent className="pt-5 sm:pt-6">
                  <h2 className="text-base font-semibold text-foreground">Product details</h2>
                  <dl className="mt-3 divide-y divide-border">
                    {product.attributes.map((attribute, index) => (
                      <div
                        key={`${attribute.name}-${attribute.displayOrder}-${index}`}
                        className="grid grid-cols-[minmax(7rem,0.4fr)_1fr] gap-4 py-3 text-sm"
                      >
                        <dt className="font-medium text-foreground">{attribute.name}</dt>
                        <dd className="text-muted">{attribute.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </Container>
    </StorefrontShell>
  );
}
