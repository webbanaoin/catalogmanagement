export type AdminShopStatus =
  | "PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export interface AdminShopOwner {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
}

export interface AdminShopSubscriptionSummary {
  planId: string;
  planName: string;
  planSlug: string;
  status: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  storedStatus: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "WAIVED";
  endDate: string;
  graceEndsAt?: string | null;
}

export interface AdminShop {
  id: string;
  name: string;
  slug: string;
  status: AdminShopStatus;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  requestedBusinessType?: string | null;
  businessCategory?: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE";
  } | null;
  createdAt: string;
  updatedAt: string;
  owners: AdminShopOwner[];
  subscription?: AdminShopSubscriptionSummary | null;
}

export interface AdminPlan {
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
  isDefaultTrial: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface AdminSubscription {
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
    productLimit: number;
    imageLimitPerProduct: number;
    analyticsEnabled: boolean;
    excelImportEnabled: boolean;
    customBrandingEnabled: boolean;
    trialDays: number;
    graceDays: number;
    status: "ACTIVE" | "INACTIVE";
  };
  usage: { products?: number };
}

export interface AdminPlanPayload {
  name: string;
  slug?: string;
  description?: string | null;
  monthlyPrice: number;
  annualPrice: number;
  productLimit: number;
  imageLimitPerProduct: number;
  analyticsEnabled: boolean;
  excelImportEnabled: boolean;
  customBrandingEnabled: boolean;
  trialDays: number;
  graceDays: number;
  isDefaultTrial: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface AdminBusinessCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
  shopCount: number;
}

export interface AdminBusinessCategoryPayload {
  name: string;
  slug?: string;
  icon?: string | null;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
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
    throw new AdminApiError(
      envelope?.error?.code ?? "ADMIN_REQUEST_FAILED",
      envelope?.error?.message ?? "The admin request could not be completed.",
      response.status,
    );
  }

  return body as T;
}

export async function getAdminShops(status: AdminShopStatus) {
  const params = new URLSearchParams({ status, page: "1", pageSize: "100" });
  return requestJson<{
    items: AdminShop[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>("/api/admin/shops?" + params.toString());
}

export async function updateAdminShopStatus(shopId: string, status: AdminShopStatus) {
  return requestJson<{ data: { id: string; status: AdminShopStatus } }>(
    "/api/admin/shops/" + encodeURIComponent(shopId) + "/status",
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export async function assignAdminShopBusinessCategory(
  shopId: string,
  businessCategoryId: string,
) {
  return requestJson<{
    data: {
      id: string;
      businessCategoryId: string;
      requestedBusinessType: null;
      businessCategory: {
        id: string;
        name: string;
        slug: string;
        status: "ACTIVE" | "INACTIVE";
      };
    };
  }>(
    "/api/admin/shops/" + encodeURIComponent(shopId) + "/business-category",
    {
      method: "PATCH",
      body: JSON.stringify({ businessCategoryId }),
    },
  );
}

export async function getAdminPlans() {
  return requestJson<{ items: AdminPlan[] }>("/api/admin/plans");
}

export async function createAdminPlan(payload: AdminPlanPayload) {
  return requestJson<{ data: AdminPlan }>("/api/admin/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPlan(planId: string, payload: Partial<AdminPlanPayload>) {
  return requestJson<{ data: AdminPlan }>(
    "/api/admin/plans/" + encodeURIComponent(planId),
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function getAdminSubscription(shopId: string) {
  return requestJson<{ data: AdminSubscription | null }>(
    "/api/admin/shops/" + encodeURIComponent(shopId) + "/subscription",
  );
}

export async function updateAdminSubscription(
  shopId: string,
  payload: {
    planId?: string;
    extendDays?: number;
    status?: AdminSubscription["storedStatus"];
    paymentStatus?: AdminSubscription["paymentStatus"];
  },
) {
  return requestJson<{ data: AdminSubscription }>(
    "/api/admin/shops/" + encodeURIComponent(shopId) + "/subscription",
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function getAdminBusinessCategories() {
  return requestJson<{ items: AdminBusinessCategory[] }>(
    "/api/admin/business-categories",
  );
}

export async function createAdminBusinessCategory(
  payload: AdminBusinessCategoryPayload,
) {
  return requestJson<{ data: Omit<AdminBusinessCategory, "shopCount"> }>(
    "/api/admin/business-categories",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function updateAdminBusinessCategory(
  categoryId: string,
  payload: Partial<AdminBusinessCategoryPayload>,
) {
  return requestJson<{ data: Omit<AdminBusinessCategory, "shopCount"> }>(
    "/api/admin/business-categories/" + encodeURIComponent(categoryId),
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}
