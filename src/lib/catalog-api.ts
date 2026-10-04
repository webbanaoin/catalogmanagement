export type CatalogFieldErrors = Record<string, string>;

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: unknown;
  };
}

function normalizeFieldErrors(value: unknown): CatalogFieldErrors {
  if (!value || typeof value !== "object") return {};

  const result: CatalogFieldErrors = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      result[key] = raw;
      continue;
    }

    if (Array.isArray(raw)) {
      const first = raw.find((item): item is string => typeof item === "string");
      if (first) result[key] = first;
    }
  }

  return result;
}

export class CatalogApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: CatalogFieldErrors;

  constructor({
    code,
    message,
    status,
    fields = {},
  }: {
    code: string;
    message: string;
    status: number;
    fields?: CatalogFieldErrors;
  }) {
    super(message);
    this.name = "CatalogApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body: unknown = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const envelope = body as ErrorEnvelope | null;
    throw new CatalogApiError({
      code: envelope?.error?.code ?? "REQUEST_FAILED",
      message: envelope?.error?.message ?? "Something went wrong. Please try again.",
      status: response.status,
      fields: normalizeFieldErrors(envelope?.error?.fields),
    });
  }

  return body as T;
}

export interface MerchantShop {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

export interface CurrentUserResponse {
  data: {
    id: string;
    name: string;
    email: string;
    mobile?: string | null;
    status: string;
    createdAt: string;
    shops?: MerchantShop[];
  };
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  status: string;
  displayOrder: number;
}

export interface ShopProfile {
  id: string;
  name: string;
  businessCategoryId?: string | null;
  tagline?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  googleMapsUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  businessCategory?: BusinessCategory | null;
}

export interface ShopProfilePayload {
  name: string;
  businessCategoryId?: string | null;
  tagline?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  googleMapsUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

export interface ShopCategory {
  id: string;
  shopId: string;
  parentId?: string | null;
  name: string;
  slug: string;
  imageStorageKey?: string | null;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface ShopCategoryPayload {
  name: string;
  parentId?: string | null;
  displayOrder?: number;
  status?: "ACTIVE" | "INACTIVE";
}

export async function getCurrentMerchantShop(): Promise<MerchantShop> {
  const response = await requestJson<CurrentUserResponse>("/api/auth/me");
  const shop = response.data.shops?.find(
    (item) => item.status === "APPROVED" || item.status === "ACTIVE",
  );

  if (!shop) {
    throw new CatalogApiError({
      code: "SHOP_ACCESS_UNAVAILABLE",
      message: "No approved shop is available for this account.",
      status: 403,
    });
  }

  return shop;
}

export async function getBusinessCategories() {
  return requestJson<{ items: BusinessCategory[] }>("/api/business-categories");
}

export async function getShopProfile(shopId: string) {
  return requestJson<{ data: ShopProfile }>(`/api/shops/${shopId}/profile`);
}

export async function updateShopProfile(shopId: string, payload: ShopProfilePayload) {
  return requestJson<{ data: ShopProfile }>(`/api/shops/${shopId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getShopCategories(shopId: string) {
  return requestJson<{ items: ShopCategory[]; pagination: { total: number } }>(
    `/api/shops/${shopId}/categories?page=1&pageSize=100`,
  );
}

export async function createShopCategory(shopId: string, payload: ShopCategoryPayload) {
  return requestJson<{ data: ShopCategory }>(`/api/shops/${shopId}/categories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateShopCategory(
  shopId: string,
  categoryId: string,
  payload: ShopCategoryPayload,
) {
  return requestJson<{ data: ShopCategory }>(
    `/api/shops/${shopId}/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteShopCategory(shopId: string, categoryId: string) {
  return requestJson<{ data: { deleted: boolean } }>(
    `/api/shops/${shopId}/categories/${categoryId}`,
    { method: "DELETE" },
  );
}


export type ProductPriceType = "FIXED" | "STARTING_FROM" | "ASK_PRICE";
export type ProductAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";

export interface ProductImage {
  id: string;
  storageKey: string;
  thumbnailKey?: string | null;
  displayOrder: number;
  isPrimary: boolean;
  fileSize: number;
  mimeType: string;
  url?: string | null;
  thumbnailUrl?: string | null;
}

export interface ShopProduct {
  id: string;
  shopId: string;
  categoryId?: string | null;
  name: string;
  slug: string;
  sku?: string | null;
  description?: string | null;
  price?: string | number | null;
  discountPrice?: string | number | null;
  priceType: ProductPriceType;
  availabilityStatus: ProductAvailability;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  isVisible: boolean;
  deletedAt?: string | null;
  category?: ShopCategory | null;
  images: ProductImage[];
}

export interface ShopProductPayload {
  name: string;
  categoryId?: string | null;
  sku?: string | null;
  description?: string | null;
  price?: number | null;
  discountPrice?: number | null;
  priceType: ProductPriceType;
  availabilityStatus: ProductAvailability;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  isVisible: boolean;
  attributes?: Array<{
    attributeName: string;
    attributeValue: string;
    displayOrder: number;
  }>;
}

export interface MerchantSubscription {
  id: string;
  status: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  storedStatus: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "WAIVED";
  startDate: string;
  endDate: string;
  graceEndsAt?: string | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    monthlyPrice: string;
    annualPrice: string;
    productLimit: number;
    imageLimitPerProduct: number;
    analyticsEnabled: boolean;
    excelImportEnabled: boolean;
    customBrandingEnabled: boolean;
    trialDays: number;
    graceDays: number;
    status: "ACTIVE" | "INACTIVE";
  };
  usage: {
    products?: number;
  };
}

export async function getShopProducts(shopId: string) {
  return requestJson<{
    items: ShopProduct[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/api/shops/${encodeURIComponent(shopId)}/products?page=1&pageSize=100`);
}

export async function createShopProduct(shopId: string, payload: ShopProductPayload) {
  return requestJson<{ data: ShopProduct }>(
    `/api/shops/${encodeURIComponent(shopId)}/products`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateShopProduct(
  shopId: string,
  productId: string,
  payload: Partial<ShopProductPayload>,
) {
  return requestJson<{ data: ShopProduct }>(
    `/api/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteShopProduct(shopId: string, productId: string) {
  return requestJson<{ data: { deleted: boolean } }>(
    `/api/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
}

export async function duplicateShopProduct(shopId: string, productId: string) {
  return requestJson<{ data: ShopProduct }>(
    `/api/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}/duplicate`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function uploadProductImage(
  shopId: string,
  productId: string,
  file: File,
) {
  const upload = await requestJson<{
    data: {
      url: string;
      key: string;
      expiresInSeconds: number;
      headers: Record<string, string>;
    };
  }>(
    `/api/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}/images/upload-url`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    },
  );

  let put: Response;
  try {
    put = await fetch(upload.data.url, {
      method: "PUT",
      headers: upload.data.headers,
      body: file,
    });
  } catch {
    const origin =
      typeof window === "undefined" ? "the current app origin" : window.location.origin;
    throw new CatalogApiError({
      code: "IMAGE_UPLOAD_NETWORK_ERROR",
      message:
        `The browser could not upload the image to object storage. Check that the storage bucket CORS allows PUT requests from ${origin}.`,
      status: 0,
    });
  }

  if (!put.ok) {
    throw new CatalogApiError({
      code: "IMAGE_UPLOAD_FAILED",
      message:
        `Object storage rejected the image upload (HTTP ${put.status}). Check bucket CORS, endpoint, region and credentials.`,
      status: put.status,
    });
  }

  return requestJson<{ data: ProductImage }>(
    `/api/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}/images`,
    {
      method: "POST",
      body: JSON.stringify({
        storageKey: upload.data.key,
        thumbnailKey: null,
        displayOrder: 0,
        isPrimary: true,
        fileSize: file.size,
        mimeType: file.type,
      }),
    },
  );
}

export async function getShopSubscription(shopId: string) {
  return requestJson<{ data: MerchantSubscription | null }>(
    `/api/shops/${encodeURIComponent(shopId)}/subscription`,
  );
}
