import "server-only";

import { cache } from "react";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { getCatalogPreset } from "@/lib/catalog-presets";
import { buildCategoryProductFallbacks } from "@/server/storefront/category-product-fallback";
import { resolveShopBranding } from "@/server/media/shop-branding-resolver";
import { S3StorageService } from "@/services/storage/s3-storage";

export interface PublicShopHour {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface PublicShop {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  googleMapsUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  showProductPrices: boolean;
  wishlistEnabled: boolean;
  storefrontGrowthPromoEnabled: boolean;
  businessCategoryName: string | null;
  businessCategorySlug: string | null;
  catalogGroupLabel: string;
  primaryFilterAttribute: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  hours: PublicShopHour[];
}

export interface PublicCategory {
  slug: string;
  name: string;
  parentSlug: string | null;
  imageUrl: string | null;
}

export interface PublicProductSummary {
  slug: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number | null;
  discountPrice: number | null;
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  priceVisible: boolean;
  availabilityStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  catalogGroup: string | null;
  category: { slug: string; name: string } | null;
  imageUrl: string | null;
  imageSource: "actual" | "category-default" | "none";
}

export interface PublicProductDetail extends PublicProductSummary {
  images: Array<{ id: string; url: string; isPrimary: boolean; displayOrder: number }>;
  attributes: Array<{ name: string; value: string; displayOrder: number }>;
}

export interface PublicStorefrontResult {
  shop: PublicShop;
  categories: PublicCategory[];
  catalogGroups: string[];
  primaryFilter: { name: string; label: string; values: string[] } | null;
  products: PublicProductSummary[];
  featured: PublicProductSummary[];
  newArrivals: PublicProductSummary[];
  offers: PublicProductSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface StorefrontQuery {
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";
  page?: number;
  includeHighlights?: boolean;
}

const productSummarySelect = {
  slug: true,
  name: true,
  sku: true,
  description: true,
  price: true,
  discountPrice: true,
  priceType: true,
  showPrice: true,
  availabilityStatus: true,
  isFeatured: true,
  isNewArrival: true,
  isOffer: true,
  catalogGroup: true,
  category: {
    select: {
      slug: true,
      name: true,
      status: true,
    },
  },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { displayOrder: "asc" as const }],
    take: 1,
    select: { storageKey: true, thumbnailKey: true },
  },
} satisfies Prisma.ProductSelect;

type ProductSummaryRow = Prisma.ProductGetPayload<{ select: typeof productSummarySelect }>;

let storageService: S3StorageService | null | undefined;

function storage(): S3StorageService | null {
  if (storageService !== undefined) return storageService;

  try {
    storageService = new S3StorageService();
  } catch {
    storageService = null;
  }

  return storageService;
}

// Request-scoped memoization: featured, recent and catalogue lists often share
// the same image. React.cache never persists a 15-minute R2 signed URL across
// HTTP requests, so this is safe for private storage and current data freshness.
const mediaUrl = cache(async (storageKey: string | null | undefined): Promise<string | null> => {
  if (!storageKey) return null;

  try {
    return (await storage()?.getMediaUrl(storageKey)) ?? null;
  } catch {
    return null;
  }
});

// Shop owners may provide social links, but public action labels should never
// send visitors to unrelated or unsafe domains.
function publicSocialUrl(value: string | null, domains: readonly string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (!domains.some((domain) => host === domain || host.endsWith("." + domain))) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function mapShop(shop: {
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  googleMapsUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  showProductPrices: boolean;
  wishlistAllowedByAdmin: boolean;
  wishlistEnabledByMerchant: boolean;
  storefrontGrowthPromoEnabled: boolean;
  logoStorageKey: string | null;
  coverStorageKey: string | null;
  businessCategory:
    | {
        name: string;
        slug: string;
        defaultCoverStorageKey: string | null;
      }
    | null;
  hours: PublicShopHour[];
}): Promise<PublicShop> {
  const branding = await resolveShopBranding({
    logoStorageKey: shop.logoStorageKey,
    coverStorageKey: shop.coverStorageKey,
    businessCategoryDefaultCoverStorageKey:
      shop.businessCategory?.defaultCoverStorageKey ?? null,
  });
  const preset = getCatalogPreset(shop.businessCategory);

  return {
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    description: shop.description,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    address: shop.address,
    city: shop.city,
    state: shop.state,
    googleMapsUrl: shop.googleMapsUrl,
    instagramUrl: publicSocialUrl(shop.instagramUrl, ["instagram.com"]),
    facebookUrl: publicSocialUrl(shop.facebookUrl, ["facebook.com", "fb.com", "fb.me"]),
    showProductPrices: shop.showProductPrices,
    wishlistEnabled: shop.wishlistAllowedByAdmin && shop.wishlistEnabledByMerchant && Boolean(shop.whatsapp),
    storefrontGrowthPromoEnabled: shop.storefrontGrowthPromoEnabled,
    businessCategoryName: shop.businessCategory?.name ?? null,
    businessCategorySlug: shop.businessCategory?.slug ?? null,
    catalogGroupLabel: preset.groupLabel,
    primaryFilterAttribute: preset.primaryFilterAttribute ?? null,
    logoUrl: branding.logoUrl,
    coverUrl: branding.coverUrl,
    hours: shop.hours,
  };
}

async function mapProduct(
  row: ProductSummaryRow,
  shopShowProductPrices: boolean,
  fallbackByCategorySlug?: Map<string, string>,
): Promise<PublicProductSummary> {
  const actualUrl = await mediaUrl(row.images[0]?.thumbnailKey ?? row.images[0]?.storageKey);
  const fallbackKey = row.category?.status === "ACTIVE"
    ? fallbackByCategorySlug?.get(row.category.slug)
    : undefined;
  const representativeUrl = !actualUrl ? await mediaUrl(fallbackKey) : null;
  const priceVisible =
    row.price != null &&
    row.priceType !== "ASK_PRICE" &&
    (row.showPrice ?? shopShowProductPrices);

  return {
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    description: row.description,
    price: priceVisible && row.price != null ? Number(row.price) : null,
    discountPrice:
      priceVisible && row.discountPrice != null ? Number(row.discountPrice) : null,
    priceType: row.priceType,
    priceVisible,
    availabilityStatus: row.availabilityStatus,
    isFeatured: row.isFeatured,
    isNewArrival: row.isNewArrival,
    isOffer: row.isOffer,
    catalogGroup: row.catalogGroup,
    category:
      row.category?.status === "ACTIVE"
        ? { slug: row.category.slug, name: row.category.name }
        : null,
    imageUrl: actualUrl ?? representativeUrl,
    imageSource: actualUrl ? "actual" : representativeUrl ? "category-default" : "none",
  };
}

// Also coalesces the shop lookup shared by Next.js metadata and page rendering
// within the same request. No cross-request caching of shop activation status.
const getActiveShopRecord = cache(async (shopSlug: string) => {
  return prisma.shop.findFirst({
    where: {
      slug: shopSlug,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      googleMapsUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      showProductPrices: true,
      wishlistAllowedByAdmin: true,
      wishlistEnabledByMerchant: true,
      storefrontGrowthPromoEnabled: true,
      logoStorageKey: true,
      coverStorageKey: true,
      businessCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          defaultCoverStorageKey: true,
        },
      },
      hours: {
        orderBy: { dayOfWeek: "asc" },
        select: {
          dayOfWeek: true,
          isClosed: true,
          openTime: true,
          closeTime: true,
        },
      },
    },
  });
});

function publicProductWhere(
  shopId: string,
  query: StorefrontQuery,
  primaryAttributeName?: string,
  descendantSlugs?: string[],
): Prisma.ProductWhereInput {
  const q = query.q?.trim().slice(0, 120);
  const categorySlug = query.categorySlug?.trim().slice(0, 160);
  const catalogGroup = query.catalogGroup?.trim().slice(0, 120);
  const attributeValue = query.attributeValue?.trim().slice(0, 500);
  const and: Prisma.ProductWhereInput[] = [];

  const where: Prisma.ProductWhereInput = {
    shopId,
    deletedAt: null,
    isVisible: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { sku: { contains: q } },
          ],
        }
      : {}),
    ...(catalogGroup ? { catalogGroup } : {}),
    ...(query.availability ? { availabilityStatus: query.availability } : {}),
  };

  if (categorySlug) {
    where.category = {
      slug: descendantSlugs ? { in: descendantSlugs } : categorySlug,
      status: "ACTIVE",
    };
  } else {
    and.push({
      OR: [
        { categoryId: null },
        { category: { status: "ACTIVE" } },
      ],
    });
  }

  if (primaryAttributeName && attributeValue) {
    and.push({
      attributes: {
        some: {
          attributeName: primaryAttributeName,
          attributeValue,
        },
      },
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function getPublicShop(shopSlug: string): Promise<PublicShop | null> {
  const shop = await getActiveShopRecord(shopSlug);
  return shop ? mapShop(shop) : null;
}

export async function getPublicStorefront(
  shopSlug: string,
  query: StorefrontQuery = {},
): Promise<PublicStorefrontResult | null> {
  const shopRecord = await getActiveShopRecord(shopSlug);
  if (!shopRecord) return null;

  const pageSize = 24;
  const page = Math.max(1, query.page ?? 1);
  const preset = getCatalogPreset(shopRecord.businessCategory);
  const primaryAttributeName = preset.primaryFilterAttribute;
  const isEventServices = preset.key === "event-planners-decorators";
  // Only event services use a three-level category hierarchy. Other
  // existing verticals retain their original single-category filters.
  const eventCategories = isEventServices
    ? await prisma.shopCategory.findMany({
        where: { shopId: shopRecord.id, status: "ACTIVE" },
        select: { id: true, slug: true, parentId: true },
      })
    : [];
  const descendantSlugs = query.categorySlug && isEventServices
    ? (() => {
        const selected = eventCategories.find((item) => item.slug === query.categorySlug);
        if (!selected) return [];
        const ids = new Set([selected.id]);
        for (let index = 0; index < 3; index++) {
          for (const item of eventCategories) if (item.parentId && ids.has(item.parentId)) ids.add(item.id);
        }
        return eventCategories.filter((item) => ids.has(item.id)).map((item) => item.slug);
      })()
    : undefined;
  const where = publicProductWhere(shopRecord.id, query, primaryAttributeName, descendantSlugs);

  const [
    categories,
    groupRows,
    attributeRows,
    products,
    total,
    globalCategoryMedia,
    fallbackCategories,
  ] = await Promise.all([
    prisma.shopCategory.findMany({
      where: {
        shopId: shopRecord.id,
        status: "ACTIVE",
        ...(isEventServices ? {} : {
          products: {
            some: {
              deletedAt: null,
              isVisible: true,
              ...(query.catalogGroup?.trim()
                ? { catalogGroup: query.catalogGroup.trim().slice(0, 120) }
                : {}),
            },
          },
        }),
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true, imageStorageKey: true },
    }),
    prisma.product.findMany({
      where: {
        shopId: shopRecord.id,
        deletedAt: null,
        isVisible: true,
        catalogGroup: { not: null },
      },
      distinct: ["catalogGroup"],
      orderBy: { catalogGroup: "asc" },
      select: { catalogGroup: true },
    }),
    primaryAttributeName
      ? prisma.productAttribute.findMany({
          where: {
            attributeName: primaryAttributeName,
            product: {
              shopId: shopRecord.id,
              deletedAt: null,
              isVisible: true,
              ...(query.catalogGroup?.trim()
                ? { catalogGroup: query.catalogGroup.trim().slice(0, 120) }
                : {}),
              ...(query.categorySlug?.trim()
                ? {
                    category: {
                      slug: query.categorySlug.trim().slice(0, 160),
                      status: "ACTIVE",
                    },
                  }
                : {}),
            },
          },
          distinct: ["attributeValue"],
          orderBy: { attributeValue: "asc" },
          select: { attributeValue: true },
        })
      : Promise.resolve([]),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productSummarySelect,
    }),
    prisma.product.count({ where }),
    shopRecord.businessCategory?.id
      ? prisma.businessCategoryMedia.findMany({
          where: {
            businessCategoryId: shopRecord.businessCategory.id,
          },
          select: {
            categorySlug: true,
            imageStorageKey: true,
            visibleAsProductDefault: true,
          },
        })
      : Promise.resolve([]),
    prisma.shopCategory.findMany({
      where: { shopId: shopRecord.id, status: "ACTIVE" },
      select: {
        id: true, slug: true, parentId: true,
        imageStorageKey: true, visibleAsProductDefault: true,
      },
    }),
  ]);

  const slugByCategoryId = new Map(categories.map((category) => [category.id, category.slug]));
  const globalCategoryImageBySlug = new Map(
    globalCategoryMedia.map((item) => [item.categorySlug, item.imageStorageKey]),
  );
  const fallbackByCategorySlug = buildCategoryProductFallbacks(
    fallbackCategories, globalCategoryMedia,
  );

  let featured: ProductSummaryRow[] = [];
  let newArrivals: ProductSummaryRow[] = [];
  let offers: ProductSummaryRow[] = [];

  if (query.includeHighlights) {
    [featured, newArrivals, offers] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...publicProductWhere(shopRecord.id, {}),
          isFeatured: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: productSummarySelect,
      }),
      prisma.product.findMany({
        where: {
          ...publicProductWhere(shopRecord.id, {}),
          isNewArrival: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: productSummarySelect,
      }),
      prisma.product.findMany({
        where: {
          ...publicProductWhere(shopRecord.id, {}),
          isOffer: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: productSummarySelect,
      }),
    ]);
  }

  const [shop, mappedCategories, mappedProducts, mappedFeatured, mappedNewArrivals, mappedOffers] =
    await Promise.all([
      mapShop(shopRecord),
      Promise.all(
        categories.map(async (category) => ({
          slug: category.slug,
          name: category.name,
          parentSlug: category.parentId ? (slugByCategoryId.get(category.parentId) ?? null) : null,
          imageUrl: await mediaUrl(
            category.imageStorageKey ??
              globalCategoryImageBySlug.get(category.slug) ??
              null,
          ),
        })),
      ),
      Promise.all(products.map((product) => mapProduct(product, shopRecord.showProductPrices, fallbackByCategorySlug))),
      Promise.all((featured as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices, fallbackByCategorySlug))),
      Promise.all((newArrivals as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices, fallbackByCategorySlug))),
      Promise.all((offers as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices, fallbackByCategorySlug))),
    ]);

  const groupOrder = new Map(
    preset.groups.map((value, index) => [value.toLowerCase(), index]),
  );
  const catalogGroups = groupRows
    .map((row) => row.catalogGroup?.trim())
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => {
      const leftOrder = groupOrder.get(left.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = groupOrder.get(right.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right);
    });

  const primaryPreset = primaryAttributeName
    ? preset.attributes.find((attribute) => attribute.name === primaryAttributeName)
    : undefined;
  const primaryValueOrder = new Map(
    (primaryPreset?.options ?? []).map((value, index) => [value.toLowerCase(), index]),
  );
  const primaryFilterValues = attributeRows
    .map((row) => row.attributeValue.trim())
    .filter(Boolean)
    .sort((left, right) => {
      const leftOrder =
        primaryValueOrder.get(left.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        primaryValueOrder.get(right.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right);
    });

  return {
    shop,
    categories: mappedCategories,
    catalogGroups,
    primaryFilter:
      primaryAttributeName && primaryFilterValues.length > 0
        ? {
            name: primaryAttributeName,
            label: primaryPreset?.label ?? primaryAttributeName,
            values: primaryFilterValues,
          }
        : null,
    products: mappedProducts,
    featured: mappedFeatured,
    newArrivals: mappedNewArrivals,
    offers: mappedOffers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getPublicCategory(
  shopSlug: string,
  categorySlug: string,
): Promise<{ name: string; slug: string } | null> {
  const shop = await getActiveShopRecord(shopSlug);
  if (!shop) return null;

  return prisma.shopCategory.findFirst({
    where: {
      shopId: shop.id,
      slug: categorySlug,
      status: "ACTIVE",
    },
    select: {
      name: true,
      slug: true,
    },
  });
}

export const getPublicProduct = cache(async (
  shopSlug: string,
  productSlug: string,
): Promise<{ shop: PublicShop; product: PublicProductDetail } | null> => {
  const shopRecord = await getActiveShopRecord(shopSlug);
  if (!shopRecord) return null;

  const product = await prisma.product.findFirst({
    where: {
      shopId: shopRecord.id,
      slug: productSlug,
      deletedAt: null,
      isVisible: true,
      AND: [
        {
          OR: [
            { categoryId: null },
            { category: { status: "ACTIVE" } },
          ],
        },
      ],
    },
    select: {
      ...productSummarySelect,
      images: {
        orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
        select: {
          id: true,
          storageKey: true,
          isPrimary: true,
          displayOrder: true,
        },
      },
      attributes: {
        orderBy: { displayOrder: "asc" },
        select: {
          attributeName: true,
          attributeValue: true,
          displayOrder: true,
        },
      },
    },
  });

  if (!product) return null;

  const [shop, images, fallbackCategories, globalCategoryMedia] = await Promise.all([
    mapShop(shopRecord),
    Promise.all(
      product.images.map(async (image) => ({
        id: image.id,
        url: await mediaUrl(image.storageKey),
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
      })),
    ),
    prisma.shopCategory.findMany({
      where: { shopId: shopRecord.id, status: "ACTIVE" },
      select: {
        id: true, slug: true, parentId: true,
        imageStorageKey: true, visibleAsProductDefault: true,
      },
    }),
    shopRecord.businessCategory?.id
      ? prisma.businessCategoryMedia.findMany({
          where: { businessCategoryId: shopRecord.businessCategory.id },
          select: {
            categorySlug: true,
            imageStorageKey: true,
            visibleAsProductDefault: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const visibleImages = images.filter(
    (image): image is { id: string; url: string; isPrimary: boolean; displayOrder: number } =>
      Boolean(image.url),
  );

  const fallbackByCategorySlug = buildCategoryProductFallbacks(
    fallbackCategories, globalCategoryMedia,
  );
  const summary: ProductSummaryRow = {
    ...product,
    images: product.images.slice(0, 1).map((image) => ({ storageKey: image.storageKey, thumbnailKey: null })),
  };

  return {
    shop,
    product: {
      ...(await mapProduct(summary, shopRecord.showProductPrices, fallbackByCategorySlug)),
      ...(visibleImages.length > 0
        ? { imageUrl: visibleImages[0]!.url, imageSource: "actual" as const }
        : {}),
      images: visibleImages,
      attributes: product.attributes.map((attribute) => ({
        name: attribute.attributeName,
        value: attribute.attributeValue,
        displayOrder: attribute.displayOrder,
      })),
    },
  };
});
