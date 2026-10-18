// Explicit, same-showroom return URLs let a product page navigate back to
// the exact filtered list instead of relying on browser history (which may
// contain another website when the product was opened from a shared link).
type ListingContext = {
  shopSlug: string;
  basePath: string;
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: string;
  page?: number;
};

export function storefrontListingHref(context: ListingContext): string {
  const parameters = new URLSearchParams();
  if (context.q) parameters.set("q", context.q);
  if (context.categorySlug) parameters.set("category", context.categorySlug);
  if (context.catalogGroup) parameters.set("group", context.catalogGroup);
  if (context.attributeValue) parameters.set("spec", context.attributeValue);
  if (context.availability) parameters.set("availability", context.availability);
  if (context.page && context.page > 1) parameters.set("page", String(context.page));

  const root = "/s/" + encodeURIComponent(context.shopSlug);
  const safePath = context.basePath === root ||
    (context.basePath.startsWith(root + "/c/") &&
      /^[a-z0-9-]+$/.test(context.basePath.slice((root + "/c/").length)))
    ? context.basePath
    : root;
  return safePath + (parameters.size ? "?" + parameters.toString() : "") + "#storefront-products";
}

export function productLinkHref(
  shopSlug: string,
  productSlug: string,
  listingHref?: string,
): string {
  const path = "/s/" + encodeURIComponent(shopSlug) +
    "/p/" + encodeURIComponent(productSlug);
  return listingHref ? path + "?from=" + encodeURIComponent(listingHref) : path;
}

// Never follow untrusted from query parameters to a different shop/domain.
export function safeProductReturnHref(
  shopSlug: string,
  rawFrom: string | undefined,
  fallbackCategorySlug?: string | null,
): string {
  const root = "/s/" + encodeURIComponent(shopSlug);
  const fallback = fallbackCategorySlug
    ? root + "?category=" + encodeURIComponent(fallbackCategorySlug) + "#storefront-products"
    : root + "#storefront-products";

  if (!rawFrom || rawFrom.length > 1600 || !rawFrom.startsWith(root)) return fallback;
  try {
    const parsed = new URL(rawFrom, "https://showroom.invalid");
    const sameShowroomPath = parsed.pathname === root ||
      (parsed.pathname.startsWith(root + "/c/") &&
        /^[a-z0-9-]+$/.test(parsed.pathname.slice((root + "/c/").length)));
    if (parsed.origin !== "https://showroom.invalid" || !sameShowroomPath) return fallback;
    if (parsed.hash !== "#storefront-products" && parsed.hash !== "#storefront-categories") return fallback;
    const allowed = new Set(["q", "category", "group", "spec", "availability", "page"]);
    if ([...parsed.searchParams.keys()].some((key) => !allowed.has(key))) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
