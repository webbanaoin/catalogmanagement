"use client";

export type PublicAnalyticsEventType =
  | "CATALOG_VISIT"
  | "PRODUCT_VIEW"
  | "WHATSAPP"
  | "CALL"
  | "DIRECTIONS"
  | "SHARE"
  | "PWA_INSTALL";

export type PublicAnalyticsSource = "direct" | "qr" | "share" | "unknown";

type DeviceType = "MOBILE" | "TABLET" | "DESKTOP" | "OTHER" | "UNKNOWN";

function sourceStorageKey(shopSlug: string) {
  return `catalog-source:${shopSlug}`;
}

function sessionStorageKey(shopSlug: string) {
  return `catalog-session:${shopSlug}`;
}

function analyticsSessionId(shopSlug: string): string {
  if (typeof window === "undefined") return "server-session";

  const key = sessionStorageKey(shopSlug);
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, generated);
  return generated;
}

function deviceType(): DeviceType {
  if (typeof navigator === "undefined") return "UNKNOWN";

  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "TABLET";
  if (/mobi|iphone|ipod|android/.test(ua)) return "MOBILE";
  return "DESKTOP";
}

export function currentTrackingSource(shopSlug: string): PublicAnalyticsSource {
  if (typeof window === "undefined") return "unknown";

  const queryValue = new URLSearchParams(window.location.search).get("src");
  if (queryValue === "qr" || queryValue === "share") {
    window.sessionStorage.setItem(sourceStorageKey(shopSlug), queryValue);
    return queryValue;
  }

  const stored = window.sessionStorage.getItem(sourceStorageKey(shopSlug));
  if (stored === "qr" || stored === "share") return stored;

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
    await fetch(
      `/api/public/shops/${encodeURIComponent(shopSlug)}/analytics/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          sessionId: analyticsSessionId(shopSlug),
          ...(productSlug ? { productSlug } : {}),
          source,
          deviceType: deviceType(),
        }),
        keepalive: true,
        credentials: "same-origin",
      },
    );
  } catch {
    // Analytics is best-effort and must never block storefront actions.
  }
}
