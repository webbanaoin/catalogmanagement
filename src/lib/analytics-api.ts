export interface AnalyticsSummary {
  range: {
    from: string;
    to: string;
  };
  totals: {
    catalogVisits: number;
    uniqueVisits: number;
    qrVisits: number;
    productViews: number;
    customerActions: number;
  };
  actions: {
    whatsapp: number;
    call: number;
    directions: number;
    share: number;
    pwaInstall: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    slug: string;
    views: number;
  }>;
  topCategories: Array<{
    categoryId: string;
    name: string;
    slug: string;
    views: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
  }>;
}

interface AnalyticsErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

export class AnalyticsApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AnalyticsApiError";
    this.code = code;
    this.status = status;
  }
}

export async function getShopAnalytics(
  shopId: string,
  range: { from: Date; to: Date },
): Promise<AnalyticsSummary> {
  const params = new URLSearchParams({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  const response = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/analytics?${params.toString()}`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const body = (await response.json().catch(() => null)) as
    | { data?: AnalyticsSummary }
    | AnalyticsErrorEnvelope
    | null;

  if (!response.ok) {
    const envelope = body as AnalyticsErrorEnvelope | null;
    throw new AnalyticsApiError(
      envelope?.error?.code ?? "ANALYTICS_REQUEST_FAILED",
      envelope?.error?.message ?? "Unable to load analytics.",
      response.status,
    );
  }

  const data = (body as { data?: AnalyticsSummary } | null)?.data;
  if (!data) {
    throw new AnalyticsApiError(
      "INVALID_ANALYTICS_RESPONSE",
      "Analytics response was incomplete.",
      500,
    );
  }

  return data;
}
