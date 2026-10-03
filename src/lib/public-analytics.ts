"use client";

export type PublicAnalyticsEventType =
  | "CATALOG_VISIT"
  | "PRODUCT_VIEW"
  | "WHATSAPP"
  | "CALL"
  | "DIRECTIONS"
  | "SHARE";

export type PublicAnalyticsSource = "direct" | "qr" | "share" | "unknown";

export function currentTrackingSource(): PublicAnalyticsSource {
  if (typeof window === "undefined") return "unknown";

  const value = new URLSearchParams(window.location.search).get("src");
  if (value === "qr" || value === "share") return value;
  return "direct";
}

export async function trackPublicEvent({
  shopSlug,
  eventType,
  productSlug,
  source,
}: {
  shopSlug: string;
  eventType: PublicAnalyticsEventType;
  productSlug?: string;
  source: PublicAnalyticsSource;
}): Promise<void> {
  try {
    await fetch(`/api/public/shops/${encodeURIComponent(shopSlug)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        ...(productSlug ? { productSlug } : {}),
        source,
      }),
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Analytics is best-effort and must never block the storefront action.
  }
}
