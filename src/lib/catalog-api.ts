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

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  status: string;
  createdAt: string;
  shops?: MerchantShop[];
}

export interface CurrentUserResponse {
  data: CurrentUser;
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
  showProductPrices: boolean;
  logoUrl?: string | null;
  coverUrl?: string | null;
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
  showProductPrices?: boolean;
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

export async function getCurrentUser() {
  return requestJson<CurrentUserResponse>("/api/auth/me");
}

export async function updateCurrentUser(payload: {
  name: string;
  mobile?: string | null;
}) {
  return requestJson<{
    data: Omit<CurrentUser, "shops">;
  }>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentMerchantShop(): Promise<MerchantShop> {
  const response = await getCurrentUser();
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


export interface ShopHour {
  id?: string;
  shopId?: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}

export async function getShopHours(shopId: string) {
  return requestJson<{ items: ShopHour[] }>(
    `/api/shops/${encodeURIComponent(shopId)}/hours`,
  );
}

export async function updateShopHours(shopId: string, hours: ShopHour[]) {
  return requestJson<{ items: ShopHour[] }>(
    `/api/shops/${encodeURIComponent(shopId)}/hours`,
    {
      method: "PUT",
      body: JSON.stringify({
        hours: hours.map(({ dayOfWeek, isClosed, openTime, closeTime }) => ({
          dayOfWeek,
          isClosed,
          openTime: isClosed ? null : openTime,
          closeTime: isClosed ? null : closeTime,
        })),
      }),
    },
  );
}


export type ShopBrandingKind = "logo" | "cover";

export async function uploadShopBranding(
  shopId: string,
  kind: ShopBrandingKind,
  file: File,
) {
  const upload = await requestJson<{
    data: {
      url: string;
      key: string;
      expiresInSeconds: number;
      headers: Record<string, string>;
    };
  }>(`/api/shops/${encodeURIComponent(shopId)}/branding/upload-url`, {
    method: "POST",
    body: JSON.stringify({
      kind,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
  });

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
        `The browser could not upload the ${kind} to object storage. Check that the storage bucket CORS allows PUT requests from ${origin}.`,
      status: 0,
    });
  }

  if (!put.ok) {
    throw new CatalogApiError({
      code: "IMAGE_UPLOAD_FAILED",
      message:
        `Object storage rejected the ${kind} upload (HTTP ${put.status}). Check bucket CORS, endpoint, region and credentials.`,
      status: put.status,
    });
  }

  return requestJson<{
    data: {
      kind: ShopBrandingKind;
      storageKey: string;
      url: string | null;
    };
  }>(`/api/shops/${encodeURIComponent(shopId)}/branding`, {
    method: "POST",
    body: JSON.stringify({
      kind,
      storageKey: upload.data.key,
    }),
  });
}

export async function removeShopBranding(
  shopId: string,
  kind: ShopBrandingKind,
) {
  return requestJson<{ data: { kind: ShopBrandingKind; removed: boolean } }>(
    `/api/shops/${encodeURIComponent(shopId)}/branding`,
    {
      method: "DELETE",
      body: JSON.stringify({ kind }),
    },
  );
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
  catalogGroup?: string | null;
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
  showPrice?: boolean | null;
  deletedAt?: string | null;
  category?: ShopCategory | null;
  attributes?: Array<{
    id?: string;
    attributeName: string;
    attributeValue: string;
    displayOrder: number;
  }>;
  images: ProductImage[];
  imageCount?: number;
}

export interface ShopProductPayload {
  name: string;
  categoryId?: string | null;
  catalogGroup?: string | null;
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
  showPrice?: boolean | null;
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
  options?: { isPrimary?: boolean; displayOrder?: number },
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
        displayOrder: options?.displayOrder ?? 0,
        isPrimary: options?.isPrimary ?? false,
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
