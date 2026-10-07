import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/storefront/product-gallery";
import { StorefrontAnalytics } from "@/components/storefront/storefront-analytics";
import { StorefrontActions } from "@/components/storefront/storefront-actions";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { Badge, Card, CardContent, Container } from "@/components/ui";
import { availabilityLabel, formatInr } from "@/lib/storefront";
import { getAppEnvironment } from "@/server/env";
import { getPublicProduct } from "@/server/storefront/storefront-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { shopSlug, productSlug } = await params;
  const result = await getPublicProduct(shopSlug, productSlug);

  if (!result) return { title: "Product not found" };

  const description =
    result.product.description?.slice(0, 160) ??
    `View ${result.product.name} from ${result.shop.name}.`;
  const canonical = new URL(
    `/s/${shopSlug}/p/${productSlug}`,
    getAppEnvironment().APP_URL,
  ).toString();

  return {
    title: `${result.product.name} | ${result.shop.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${result.product.name} | ${result.shop.name}`,
      description,
      url: canonical,
      type: "website",
    },
    manifest: `/s/${shopSlug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: result.shop.name,
      statusBarStyle: "default",
    },
  };
}

function ProductPrice({
  priceType,
  priceVisible,
  price,
  discountPrice,
}: {
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  priceVisible: boolean;
  price: number | null;
  discountPrice: number | null;
}) {
  if (!priceVisible || priceType === "ASK_PRICE") {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Pricing
        </p>
        <p className="storefront-heading mt-1 text-2xl font-bold text-primary sm:text-3xl">
          Price on request
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Contact the shop for the latest price and availability.
        </p>
      </div>
    );
  }

  if (price == null) {
    return <p className="text-lg font-semibold text-muted">Price unavailable</p>;
  }

  if (
    priceType === "FIXED" &&
    discountPrice != null &&
    discountPrice < price
  ) {
    const saving = Math.round(((price - discountPrice) / price) * 100);
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Current price
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
          <span className="storefront-heading text-3xl font-bold text-foreground sm:text-4xl">
            {formatInr(discountPrice)}
          </span>
          <span className="text-base font-medium text-muted line-through">
            {formatInr(price)}
          </span>
          {saving > 0 ? (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-strong">
              {saving}% off
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        {priceType === "STARTING_FROM" ? "Starting from" : "Price"}
      </p>
      <p className="storefront-heading mt-1 text-3xl font-bold text-foreground sm:text-4xl">
        {formatInr(price)}
      </p>
    </div>
  );
}

function availabilityTone(value: "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST") {
  if (value === "IN_STOCK") return "bg-success-soft text-success-strong";
  if (value === "ON_REQUEST") return "bg-warning-soft text-warning-strong";
  return "bg-surface-muted text-muted-strong";
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
  const availabilityRequest =
    product.availabilityStatus === "OUT_OF_STOCK"
      ? "Please share the current price and let me know when it will be available."
      : product.availabilityStatus === "ON_REQUEST"
        ? "Please share the current price and expected availability or lead time."
        : "Please share the current price and availability.";

  const requestPriceMessage = [
    `Hi ${shop.name}, I'm interested in this product and would like to know its current price.`,
    `Product: ${product.name}`,
    product.sku ? `SKU: ${product.sku}` : null,
    product.catalogGroup
      ? `${shop.catalogGroupLabel}: ${product.catalogGroup}`
      : null,
    product.category ? `Category: ${product.category.name}` : null,
    `Availability: ${availabilityLabel(product.availabilityStatus)}`,
    `Product link: ${productUrl}`,
    availabilityRequest,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsappMessage = product.priceVisible
    ? `Hi, I'm interested in ${product.name} from ${shop.name}. ${productUrl}`
    : requestPriceMessage;

  return (
    <StorefrontShell
      homeHref={`/s/${shopSlug}`}
      label={shop.name}
      shopSlug={shopSlug}
    >
      <StorefrontAnalytics
        shopSlug={shopSlug}
        productSlug={productSlug}
        eventType="PRODUCT_VIEW"
      />

      <Container className="pb-10 pt-4 sm:pb-14 sm:pt-6">
        <nav className="mb-4 flex min-w-0 items-center gap-2 text-xs font-semibold text-muted sm:mb-6 sm:text-sm">
          <Link
            href={`/s/${shopSlug}`}
            className="shrink-0 rounded-lg py-1 text-primary hover:text-primary-hover"
          >
            Showroom
          </Link>
          <span aria-hidden="true">/</span>
          {product.category ? (
            <>
              <Link
                href={`/s/${shopSlug}/c/${product.category.slug}`}
                className="max-w-[8rem] truncate rounded-lg py-1 text-muted-strong hover:text-primary sm:max-w-xs"
              >
                {product.category.name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <span className="min-w-0 truncate text-muted">{product.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:gap-9 xl:gap-12">
          <ProductGallery productName={product.name} images={product.images} />

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[1.6rem] border border-border bg-surface p-5 shadow-[0_18px_50px_rgba(23,32,29,0.08)] sm:p-6 lg:p-7">
              <div className="flex flex-wrap gap-2">
                {product.catalogGroup ? (
                  <Link
                    href={`/s/${shopSlug}?group=${encodeURIComponent(product.catalogGroup)}`}
                  >
                    <Badge variant="info">
                      {shop.catalogGroupLabel}: {product.catalogGroup}
                    </Badge>
                  </Link>
                ) : null}
                {product.category ? (
                  <Link href={`/s/${shopSlug}/c/${product.category.slug}`}>
                    <Badge variant="info">{product.category.name}</Badge>
                  </Link>
                ) : null}
                {product.isNewArrival ? <Badge>New arrival</Badge> : null}
                {product.isOffer ? (
                  <Badge variant="warning">Special offer</Badge>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
                  {shop.name}
                </p>
                <h1 className="storefront-heading mt-1.5 text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
                  {product.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 font-bold",
                      availabilityTone(product.availabilityStatus),
                    ].join(" ")}
                  >
                    {availabilityLabel(product.availabilityStatus)}
                  </span>
                  {product.sku ? (
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-semibold text-muted-strong">
                      SKU {product.sku}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="my-5 h-px bg-border" />

              <ProductPrice
                priceType={product.priceType}
                priceVisible={product.priceVisible}
                price={product.price}
                discountPrice={product.discountPrice}
              />

              <div className="mt-6">
                <StorefrontActions
                  title={`${product.name} | ${shop.name}`}
                  shopSlug={shopSlug}
                  productSlug={productSlug}
                  phone={shop.phone}
                  whatsapp={shop.whatsapp}
                  directionsUrl={shop.googleMapsUrl}
                  whatsappMessage={whatsappMessage}
                  whatsappLabel={
                    product.priceVisible ? "WhatsApp shop" : "Request Price"
                  }
                />
              </div>

              <div className="mt-5 rounded-xl bg-primary-soft/70 p-3.5 text-xs leading-5 text-primary sm:p-4">
                <p className="font-bold">Interested in this product?</p>
                <p className="mt-0.5 text-primary/80">
                  Contact the shop directly for current stock, custom options and
                  final purchase details.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-7 grid gap-5 lg:mt-10 lg:grid-cols-2 lg:gap-6">
          {product.description ? (
            <Card className="rounded-[1.5rem] border-border/90 shadow-[0_10px_32px_rgba(23,32,29,0.045)]">
              <CardContent className="pt-5 sm:pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
                  Overview
                </p>
                <h2 className="storefront-heading mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  About this product
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted sm:text-[15px]">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {product.attributes.length > 0 ? (
            <Card className="rounded-[1.5rem] border-border/90 shadow-[0_10px_32px_rgba(23,32,29,0.045)]">
              <CardContent className="pt-5 sm:pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">
                  Specifications
                </p>
                <h2 className="storefront-heading mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  Product details
                </h2>
                <dl className="mt-4 divide-y divide-border/80">
                  {product.attributes.map((attribute, index) => (
                    <div
                      key={`${attribute.name}-${attribute.displayOrder}-${index}`}
                      className="grid grid-cols-[minmax(6.5rem,0.42fr)_1fr] gap-4 py-3 text-sm sm:grid-cols-[minmax(8rem,0.4fr)_1fr]"
                    >
                      <dt className="font-semibold text-muted-strong">
                        {attribute.name}
                      </dt>
                      <dd className="min-w-0 break-words text-foreground">
                        {attribute.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </Container>
    </StorefrontShell>
  );
}
