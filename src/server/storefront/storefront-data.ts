import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/prisma";
import { getCatalogPreset } from "@/lib/catalog-presets";
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
  showProductPrices: boolean;
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
    select: { storageKey: true },
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

async function mediaUrl(storageKey: string | null | undefined): Promise<string | null> {
  if (!storageKey) return null;

  try {
    return (await storage()?.getMediaUrl(storageKey)) ?? null;
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
  showProductPrices: boolean;
  logoStorageKey: string | null;
  coverStorageKey: string | null;
  businessCategory: { name: string; slug: string } | null;
  hours: PublicShopHour[];
}): Promise<PublicShop> {
  const [logoUrl, coverUrl] = await Promise.all([
    mediaUrl(shop.logoStorageKey),
    mediaUrl(shop.coverStorageKey),
  ]);
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
    showProductPrices: shop.showProductPrices,
    businessCategoryName: shop.businessCategory?.name ?? null,
    businessCategorySlug: shop.businessCategory?.slug ?? null,
    catalogGroupLabel: preset.groupLabel,
    primaryFilterAttribute: preset.primaryFilterAttribute ?? null,
    logoUrl,
    coverUrl,
    hours: shop.hours,
  };
}

async function mapProduct(
  row: ProductSummaryRow,
  shopShowProductPrices: boolean,
): Promise<PublicProductSummary> {
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
    imageUrl: await mediaUrl(row.images[0]?.storageKey),
  };
}

async function getActiveShopRecord(shopSlug: string) {
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
      showProductPrices: true,
      logoStorageKey: true,
      coverStorageKey: true,
      businessCategory: {
        select: { name: true, slug: true },
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
}

function publicProductWhere(
  shopId: string,
  query: StorefrontQuery,
  primaryAttributeName?: string,
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
      slug: categorySlug,
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
  const where = publicProductWhere(shopRecord.id, query, primaryAttributeName);

  const [categories, groupRows, attributeRows, products, total] = await Promise.all([
    prisma.shopCategory.findMany({
      where: { shopId: shopRecord.id, status: "ACTIVE" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, imageStorageKey: true },
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
  ]);

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
          imageUrl: await mediaUrl(category.imageStorageKey),
        })),
      ),
      Promise.all(products.map((product) => mapProduct(product, shopRecord.showProductPrices))),
      Promise.all((featured as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices))),
      Promise.all((newArrivals as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices))),
      Promise.all((offers as ProductSummaryRow[]).map((product) => mapProduct(product, shopRecord.showProductPrices))),
    ]);

  const catalogGroups = groupRows
    .map((row) => row.catalogGroup?.trim())
    .filter((value): value is string => Boolean(value));
  const primaryFilterValues = attributeRows
    .map((row) => row.attributeValue.trim())
    .filter(Boolean);

  return {
    shop,
    categories: mappedCategories,
    catalogGroups,
    primaryFilter:
      primaryAttributeName && primaryFilterValues.length > 0
        ? {
            name: primaryAttributeName,
            label:
              preset.attributes.find((attribute) => attribute.name === primaryAttributeName)
                ?.label ?? primaryAttributeName,
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

export async function getPublicProduct(
  shopSlug: string,
  productSlug: string,
): Promise<{ shop: PublicShop; product: PublicProductDetail } | null> {
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

  const [shop, images] = await Promise.all([
    mapShop(shopRecord),
    Promise.all(
      product.images.map(async (image) => ({
        id: image.id,
        url: await mediaUrl(image.storageKey),
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
      })),
    ),
  ]);

  const visibleImages = images.filter(
    (image): image is { id: string; url: string; isPrimary: boolean; displayOrder: number } =>
      Boolean(image.url),
  );

  const summary: ProductSummaryRow = {
    ...product,
    images: product.images.slice(0, 1).map((image) => ({ storageKey: image.storageKey })),
  };

  return {
    shop,
    product: {
      ...(await mapProduct(summary, shopRecord.showProductPrices)),
      imageUrl: visibleImages[0]?.url ?? null,
      images: visibleImages,
      attributes: product.attributes.map((attribute) => ({
        name: attribute.attributeName,
        value: attribute.attributeValue,
        displayOrder: attribute.displayOrder,
      })),
    },
  };
}
