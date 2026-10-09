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
  referralAssignedAt?: string | null;
  referralPartner?: {
    id: string;
    referralCode?: string | null;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
    user: {
      name: string;
      email: string;
      mobile?: string | null;
    };
  } | null;
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

export type AdminReferralPartnerStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export type AdminReferralCommissionMode =
  | "FIRST_PAID_SUBSCRIPTION"
  | "EVERY_ELIGIBLE_PAYMENT";

export type AdminReferralCommissionStatus = "EARNED" | "PAID" | "CANCELLED";

export interface AdminReferralSettings {
  isEnabled: boolean;
  commissionMode: AdminReferralCommissionMode;
  monthlyCommission: string;
  yearlyCommission: string;
  updatedAt?: string | null;
}

export interface AdminReferralPartner {
  id: string;
  referralCode?: string | null;
  status: AdminReferralPartnerStatus;
  city?: string | null;
  state?: string | null;
  marketingArea?: string | null;
  notes?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    mobile?: string | null;
  };
  shopCount: number;
  paidShopCount: number;
  commissionCount: number;
  shops: Array<{
    id: string;
    name: string;
    slug: string;
    status: AdminShopStatus;
    createdAt: string;
    subscription?: {
      status: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
      paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "WAIVED";
      plan: { name: string };
    } | null;
    _count: { payments: number };
  }>;
  financials: {
    totalCollections: string;
    commissionEarned: string;
    commissionPaid: string;
    commissionPending: string;
    netRevenue: string;
  };
}

export interface AdminReferralOverview {
  generatedAt: string;
  revenue: {
    totalCollections: string;
    referredCollections: string;
    commissionEarned: string;
    commissionPaid: string;
    commissionPending: string;
    cancelledCommission: string;
    netRevenueAfterCommission: string;
    realizedNetCash: string;
    monthlyReferredCollections: string;
    monthlyCommissionLiability: string;
    currency: string;
  };
  counts: {
    activePartners: number;
    pendingPartners: number;
    referredShops: number;
    paidReferredShops: number;
    commissionRecords: number;
  };
}

export interface AdminReferralCommission {
  id: string;
  paymentRecordId: string;
  billingCycle: "MONTHLY" | "YEARLY" | AdminBillingCycle;
  status: AdminReferralCommissionStatus;
  commissionAmount: string;
  currency: string;
  paymentAmountSnapshot: string;
  planNameSnapshot: string;
  partnerNameSnapshot: string;
  partnerCodeSnapshot: string;
  shopNameSnapshot: string;
  earnedAt: string;
  paidAt?: string | null;
  payoutMethod?: AdminPaymentMethod | null;
  payoutReference?: string | null;
  payoutComment?: string | null;
  cancelledAt?: string | null;
  cancelComment?: string | null;
  createdAt: string;
  referralPartner: {
    id: string;
    referralCode?: string | null;
    user: {
      name: string;
      email: string;
      mobile?: string | null;
    };
  };
  shop: { id: string; name: string; slug: string };
  paidByUser?: { id: string; name: string; email: string } | null;
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

export type AdminPaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
export type AdminBillingCycle =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "CUSTOM";

export type AdminPaymentSubmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type AdminPaymentRecipientType =
  | "WEBBANAO"
  | "REFERRAL_PARTNER"
  | "OTHER";

export interface AdminPaymentSubmission {
  id: string;
  amount: string;
  currency: string;
  method: AdminPaymentMethod;
  billingCycle: AdminBillingCycle;
  paidAt: string;
  recipientType: AdminPaymentRecipientType;
  recipientName: string;
  recipientNameSnapshot: string;
  reference?: string | null;
  comment?: string | null;
  status: AdminPaymentSubmissionStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  paymentRecordId?: string | null;
  shop: { id: string; name: string; slug: string };
  submittedByUser: {
    id: string;
    name: string;
    email: string;
    mobile?: string | null;
  };
  reviewedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  referralPartner?: {
    id: string;
    referralCode?: string | null;
    user: { name: string };
  } | null;
}

export interface AdminPaymentRecord {
  id: string;
  amount: string;
  currency: string;
  method: AdminPaymentMethod;
  billingCycle: AdminBillingCycle;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  reference?: string | null;
  comment?: string | null;
  receivedAt: string;
  extendDays: number;
  previousEndDate?: string | null;
  newEndDate?: string | null;
  createdAt: string;
  planName: string;
  shop: { id: string; name: string; slug: string };
  recordedBy?: { id: string; name: string; email: string } | null;
}

export interface AdminPaymentSummary {
  count: number;
  amount: string;
  currency: string;
  byMethod: Record<AdminPaymentMethod, { count: number; amount: string }>;
}

export interface AdminPaymentCreatePayload {
  shopId: string;
  amount: number;
  method: AdminPaymentMethod;
  billingCycle: AdminBillingCycle;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  reference?: string | null;
  comment?: string | null;
  receivedAt?: string;
  extendDays: number;
  activateSubscription: boolean;
}

export interface AdminPaymentTrendPoint {
  label: string;
  from: string;
  to: string;
  amount: string;
  count: number;
}

export interface AdminSubscriptionPaymentHealth {
  subscriptionId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopStatus: AdminShopStatus;
  planId: string;
  planName: string;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "WAIVED";
  startDate: string;
  endDate: string;
  graceEndsAt?: string | null;
  daysRemaining: number;
  contact: {
    ownerName?: string | null;
    ownerEmail?: string | null;
    ownerMobile?: string | null;
    shopPhone?: string | null;
    shopEmail?: string | null;
  };
  lastPayment?: {
    amount: string;
    receivedAt: string;
    billingCycle: AdminBillingCycle;
  } | null;
}

export interface AdminPaymentAnalytics {
  generatedAt: string;
  revenue: {
    total: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    thisQuarter: string;
    thisYear: string;
    currency: string;
  };
  paymentBreakdown: {
    byMethod: Record<AdminPaymentMethod, { count: number; amount: string }>;
    byBillingCycle: Record<AdminBillingCycle, { count: number; amount: string }>;
  };
  subscriptions: {
    activePaid: number;
    trial: number;
    grace: number;
    expired: number;
    pendingPayment: number;
    expiringWithin7Days: number;
    expiring8To15Days: number;
    expiring16To30Days: number;
  };
  expiry: {
    upcoming: AdminSubscriptionPaymentHealth[];
    grace: AdminSubscriptionPaymentHealth[];
    expired: AdminSubscriptionPaymentHealth[];
    pendingPayments: AdminSubscriptionPaymentHealth[];
  };
  trends: {
    weekly: AdminPaymentTrendPoint[];
    monthly: AdminPaymentTrendPoint[];
    quarterly: AdminPaymentTrendPoint[];
  };
  topShops: Array<{
    shop: {
      id: string;
      name: string;
      slug: string;
      status: AdminShopStatus;
    };
    amount: string;
    paymentCount: number;
  }>;
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
  defaultCoverConfigured: boolean;
  sharedCategoryImageCount: number;
  presetCategoryCount: number;
}

export interface AdminBusinessCategoryPayload {
  name: string;
  slug?: string;
  icon?: string | null;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
}


export interface AdminCategoryMediaItem {
  categoryName: string;
  categorySlug: string;
  displayOrder: number;
  imageStorageKey?: string | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
}

export interface AdminCategoryMediaLibrary {
  businessCategory: {
    id: string;
    name: string;
    slug: string;
  };
  presetKey: string | null;
  items: AdminCategoryMediaItem[];
}


export interface AdminPlatformStorefrontBranding {
  defaultLogoStorageKey?: string | null;
  defaultLogoUrl?: string | null;
  defaultCoverStorageKey?: string | null;
  defaultCoverUrl?: string | null;
  updatedAt?: string | null;
}

export interface AdminBusinessCategoryBranding {
  businessCategory: {
    id: string;
    name: string;
    slug: string;
  };
  defaultCoverStorageKey?: string | null;
  defaultCoverUrl?: string | null;
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

export async function getAdminShops(
  status: AdminShopStatus,
  options?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams({
    status,
    page: String(options?.page ?? 1),
    pageSize: String(options?.pageSize ?? 100),
  });
  return requestJson<{
    items: AdminShop[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
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

export async function getAdminPayments(filters?: {
  shopId?: string;
  method?: AdminPaymentMethod;
  billingCycle?: AdminBillingCycle;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.shopId) params.set("shopId", filters.shopId);
  if (filters?.method) params.set("method", filters.method);
  if (filters?.billingCycle) params.set("billingCycle", filters.billingCycle);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  params.set("page", String(filters?.page ?? 1));
  params.set("pageSize", String(filters?.pageSize ?? 100));

  return requestJson<{
    items: AdminPaymentRecord[];
    summary: AdminPaymentSummary;
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>("/api/admin/payments?" + params.toString());
}

export async function getAdminPaymentAnalytics() {
  return requestJson<{ data: AdminPaymentAnalytics }>(
    "/api/admin/payments/analytics",
  );
}

export async function recordAdminPayment(payload: AdminPaymentCreatePayload) {
  return requestJson<{
    data: AdminPaymentRecord;
    subscription: AdminSubscription;
  }>("/api/admin/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminBusinessCategories() {
  return requestJson<{ items: AdminBusinessCategory[] }>(
    "/api/admin/business-categories",
  );
}

export async function createAdminBusinessCategory(
  payload: AdminBusinessCategoryPayload,
) {
  return requestJson<{
    data: Omit<
      AdminBusinessCategory,
      | "shopCount"
      | "defaultCoverConfigured"
      | "sharedCategoryImageCount"
      | "presetCategoryCount"
    >;
  }>(
    "/api/admin/business-categories",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function updateAdminBusinessCategory(
  categoryId: string,
  payload: Partial<AdminBusinessCategoryPayload>,
) {
  return requestJson<{
    data: Omit<
      AdminBusinessCategory,
      | "shopCount"
      | "defaultCoverConfigured"
      | "sharedCategoryImageCount"
      | "presetCategoryCount"
    >;
  }>(
    "/api/admin/business-categories/" + encodeURIComponent(categoryId),
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}


export async function getAdminCategoryMediaLibrary(categoryId: string) {
  return requestJson<AdminCategoryMediaLibrary>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/category-media",
  );
}

export async function uploadAdminCategoryMedia(
  categoryId: string,
  categorySlug: string,
  file: File,
) {
  const upload = await requestJson<{
    data: {
      url: string;
      key: string;
      expiresInSeconds: number;
      headers: Record<string, string>;
      categoryName: string;
      categorySlug: string;
    };
  }>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/category-media/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        categorySlug,
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
    throw new AdminApiError(
      "CATEGORY_IMAGE_UPLOAD_NETWORK_ERROR",
      "The browser could not upload the category image to object storage.",
      0,
    );
  }

  if (!put.ok) {
    throw new AdminApiError(
      "CATEGORY_IMAGE_UPLOAD_FAILED",
      "Object storage rejected the category image upload.",
      put.status,
    );
  }

  return requestJson<{ data: AdminCategoryMediaItem }>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/category-media",
    {
      method: "POST",
      body: JSON.stringify({
        categorySlug,
        storageKey: upload.data.key,
      }),
    },
  );
}

export async function removeAdminCategoryMedia(
  categoryId: string,
  categorySlug: string,
) {
  return requestJson<{ data: { removed: boolean } }>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/category-media",
    {
      method: "DELETE",
      body: JSON.stringify({ categorySlug }),
    },
  );
}


async function uploadAdminBrandingFile<T>(
  uploadPath: string,
  confirmPath: string,
  payload: Record<string, unknown>,
  file: File,
): Promise<{ data: T }> {
  const upload = await requestJson<{
    data: {
      url: string;
      key: string;
      expiresInSeconds: number;
      headers: Record<string, string>;
    };
  }>(uploadPath, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
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
    throw new AdminApiError(
      "STOREFRONT_BRANDING_UPLOAD_NETWORK_ERROR",
      "The browser could not upload the branding image to object storage.",
      0,
    );
  }

  if (!put.ok) {
    throw new AdminApiError(
      "STOREFRONT_BRANDING_UPLOAD_FAILED",
      "Object storage rejected the branding image upload.",
      put.status,
    );
  }

  return requestJson<{ data: T }>(confirmPath, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      storageKey: upload.data.key,
    }),
  });
}

export async function getAdminPlatformStorefrontBranding() {
  return requestJson<{ data: AdminPlatformStorefrontBranding }>(
    "/api/admin/storefront-branding",
  );
}

export async function uploadAdminPlatformStorefrontBranding(
  kind: "logo" | "cover",
  file: File,
) {
  return uploadAdminBrandingFile<{
    kind: "logo" | "cover";
    storageKey: string | null;
    url: string | null;
  }>(
    "/api/admin/storefront-branding/upload-url",
    "/api/admin/storefront-branding",
    { kind },
    file,
  );
}

export async function removeAdminPlatformStorefrontBranding(
  kind: "logo" | "cover",
) {
  return requestJson<{ data: { kind: "logo" | "cover"; removed: boolean } }>(
    "/api/admin/storefront-branding",
    {
      method: "DELETE",
      body: JSON.stringify({ kind }),
    },
  );
}

export async function getAdminBusinessCategoryBranding(categoryId: string) {
  return requestJson<{ data: AdminBusinessCategoryBranding }>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/branding",
  );
}

export async function uploadAdminBusinessCategoryCover(
  categoryId: string,
  file: File,
) {
  return uploadAdminBrandingFile<AdminBusinessCategoryBranding>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/branding/upload-url",
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/branding",
    {},
    file,
  );
}

export async function removeAdminBusinessCategoryCover(categoryId: string) {
  return requestJson<{ data: { removed: boolean } }>(
    "/api/admin/business-categories/" +
      encodeURIComponent(categoryId) +
      "/branding",
    { method: "DELETE" },
  );
}


export async function getAdminReferralSettings() {
  return requestJson<{ data: AdminReferralSettings }>(
    "/api/admin/referrals/settings",
  );
}

export async function updateAdminReferralSettings(payload: {
  isEnabled: boolean;
  commissionMode: AdminReferralCommissionMode;
  monthlyCommission: number;
  yearlyCommission: number;
}) {
  return requestJson<{ data: AdminReferralSettings }>(
    "/api/admin/referrals/settings",
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function getAdminReferralPartners(
  status?: AdminReferralPartnerStatus,
  options?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 100));

  return requestJson<{
    items: AdminReferralPartner[];
    options: Array<{
      id: string;
      referralCode?: string | null;
      status: AdminReferralPartnerStatus;
      user: { name: string };
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>("/api/admin/referrals/partners?" + params.toString());
}

export async function updateAdminReferralPartnerStatus(
  partnerId: string,
  status: Exclude<AdminReferralPartnerStatus, "PENDING">,
  note?: string,
  regenerateCode = false,
) {
  return requestJson<{
    data: {
      id: string;
      referralCode?: string | null;
      status: AdminReferralPartnerStatus;
      approvedAt?: string | null;
      updatedAt: string;
      user: { name: string; email: string; mobile?: string | null };
    };
  }>(
    "/api/admin/referrals/partners/" +
      encodeURIComponent(partnerId) +
      "/status",
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        note: note?.trim() || null,
        regenerateCode,
      }),
    },
  );
}

export async function assignAdminShopReferral(
  shopId: string,
  referralPartnerId: string | null,
) {
  return requestJson<{
    data: {
      id: string;
      name: string;
      referralPartnerId?: string | null;
      referralAssignedAt?: string | null;
      referralPartner?: {
        id: string;
        referralCode?: string | null;
        user: { name: string };
      } | null;
    };
  }>(
    "/api/admin/shops/" + encodeURIComponent(shopId) + "/referral",
    {
      method: "PATCH",
      body: JSON.stringify({ referralPartnerId }),
    },
  );
}

export async function getAdminReferralOverview() {
  return requestJson<{ data: AdminReferralOverview }>(
    "/api/admin/referrals/overview",
  );
}

export async function getAdminReferralCommissions(filters?: {
  status?: AdminReferralCommissionStatus;
  partnerId?: string;
  shopId?: string;
  billingCycle?: "MONTHLY" | "YEARLY";
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.partnerId) params.set("partnerId", filters.partnerId);
  if (filters?.shopId) params.set("shopId", filters.shopId);
  if (filters?.billingCycle) params.set("billingCycle", filters.billingCycle);
  params.set("page", String(filters?.page ?? 1));
  params.set("pageSize", String(filters?.pageSize ?? 50));

  return requestJson<{
    items: AdminReferralCommission[];
    summary: {
      count: number;
      amount: string;
      currency: string;
      byStatus: Record<
        AdminReferralCommissionStatus,
        { count: number; amount: string }
      >;
    };
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>("/api/admin/referrals/commissions?" + params.toString());
}

export async function settleAdminReferralCommission(
  commissionId: string,
  payload:
    | {
        action: "PAY";
        payoutMethod: AdminPaymentMethod;
        paidAt?: string;
        reference?: string | null;
        comment?: string | null;
      }
    | { action: "CANCEL"; comment: string },
) {
  return requestJson<{
    data: {
      id: string;
      status: AdminReferralCommissionStatus;
      paidAt?: string | null;
      payoutMethod?: AdminPaymentMethod | null;
      payoutReference?: string | null;
      payoutComment?: string | null;
      cancelledAt?: string | null;
      cancelComment?: string | null;
    };
  }>(
    "/api/admin/referrals/commissions/" +
      encodeURIComponent(commissionId),
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function reconcileAdminReferralCommissions() {
  return requestJson<{
    data: {
      createdCount: number;
      skippedBeforeAttribution: number;
      skippedByRule: number;
      created: Array<{
        commissionId: string;
        shopId: string;
        shopName: string;
        paymentRecordId: string;
        amount: string;
      }>;
      message: string;
    };
  }>("/api/admin/referrals/reconcile", {
    method: "POST",
  });
}


export async function getAdminPaymentSubmissions(filters?: {
  status?: AdminPaymentSubmissionStatus;
  shopId?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.shopId) params.set("shopId", filters.shopId);
  params.set("page", String(filters?.page ?? 1));
  params.set("pageSize", String(filters?.pageSize ?? 100));

  return requestJson<{
    items: AdminPaymentSubmission[];
    summary: {
      total: number;
      currency: string;
      byStatus: Record<
        AdminPaymentSubmissionStatus,
        { count: number; amount: string }
      >;
    };
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>("/api/admin/payment-submissions?" + params.toString());
}

export async function reviewAdminPaymentSubmission(
  submissionId: string,
  payload:
    | {
        action: "APPROVE";
        extendDays?: number;
        activateSubscription?: boolean;
        comment?: string | null;
      }
    | {
        action: "REJECT";
        comment: string;
      },
) {
  return requestJson<{
    data:
      | {
          submissionId: string;
          status: "APPROVED";
          paymentRecordId: string;
          paymentAmount: string;
          billingCycle: AdminBillingCycle;
          subscription: AdminSubscription;
          referralCommission?: {
            id: string;
            amount: string;
            status: "EARNED" | "PAID" | "CANCELLED";
          } | null;
        }
      | {
          id: string;
          status: "REJECTED";
          reviewedAt?: string | null;
          reviewComment?: string | null;
          paymentRecordId?: string | null;
        };
  }>(
    "/api/admin/payment-submissions/" + encodeURIComponent(submissionId),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
