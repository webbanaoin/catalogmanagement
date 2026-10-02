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
