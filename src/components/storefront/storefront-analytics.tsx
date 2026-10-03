"use client";

import { useEffect } from "react";

import {
  currentTrackingSource,
  trackPublicEvent,
  type PublicAnalyticsEventType,
} from "@/lib/public-analytics";

const recentEvents = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 1500;

export function StorefrontAnalytics({
  shopSlug,
  productSlug,
  eventType,
}: {
  shopSlug: string;
  productSlug?: string;
  eventType: Extract<PublicAnalyticsEventType, "CATALOG_VISIT" | "PRODUCT_VIEW">;
}) {
  useEffect(() => {
    const key = [
      eventType,
      shopSlug,
      productSlug ?? "",
      window.location.pathname,
      window.location.search,
    ].join(":");
    const now = Date.now();
    const lastTracked = recentEvents.get(key) ?? 0;

    if (now - lastTracked < DUPLICATE_WINDOW_MS) return;
    recentEvents.set(key, now);

    void trackPublicEvent({
      shopSlug,
      productSlug,
      eventType,
      source: currentTrackingSource(),
    });
  }, [eventType, productSlug, shopSlug]);

  return null;
}
