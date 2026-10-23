"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Container } from "@/components/ui";

type GrowthEventType = "IMPRESSION" | "CREATE_CLICK" | "PARTNER_CLICK" | "EXPLORE_CLICK";
type GrowthSourcePage = "HOME" | "CATEGORY" | "PRODUCT" | "OTHER";

function pageType(path: string): GrowthSourcePage {
  if (/\/p\/[^/]+\/?$/.test(path)) return "PRODUCT";
  if (/\/c\/[^/]+\/?$/.test(path)) return "CATEGORY";
  if (/^\/s\/[^/]+\/?$/.test(path)) return "HOME";
  return "OTHER";
}

function sessionId(shopSlug: string): string | undefined {
  try {
    const key = `webbanao-growth-session:${shopSlug}`;
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return undefined;
  }
}

function sendGrowthEvent(shopSlug: string, eventType: GrowthEventType) {
  const url = `/api/public/shops/${encodeURIComponent(shopSlug)}/growth/events`;
  const data = JSON.stringify({
    eventType,
    sourcePage: pageType(window.location.pathname),
    ...(sessionId(shopSlug) ? { sessionId: sessionId(shopSlug) } : {}),
  });
  try {
    // Fire-and-forget, even for links that navigate away immediately.
    if (navigator.sendBeacon?.(url, new Blob([data], { type: "application/json" }))) return;
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never interfere with the visitor's navigation.
  }
}

/** Optional, low-interruption growth banner; visible once below shop content. */
export function StorefrontGrowthCTA({ shopSlug }: { shopSlug: string }) {
  const bannerRef = useRef<HTMLElement | null>(null);
  const query = new URLSearchParams({
    utm_source: "merchant_showroom",
    utm_medium: "storefront_growth",
    utm_campaign: "webbanao_showroom",
    source_shop: shopSlug,
  }).toString();

  useEffect(() => {
    const element = bannerRef.current;
    if (!element) return;
    // One impression per shopper session, per originating shop page.
    const key = `webbanao-growth-impression:${shopSlug}:${window.location.pathname}`;
    const recordView = () => {
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Browsers that restrict storage can still record this view.
      }
      sendGrowthEvent(shopSlug, "IMPRESSION");
    };
    if (!("IntersectionObserver" in window)) {
      recordView();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        recordView();
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shopSlug]);

  return (
    <section ref={bannerRef} aria-labelledby="webbanao-growth-title" className="py-5 sm:py-8">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary-soft via-surface to-surface px-5 py-7 shadow-[0_14px_35px_rgba(23,32,29,0.08)] sm:px-8 sm:py-9 lg:px-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] lg:items-center lg:gap-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary sm:text-xs">
                ✦ Webbanao Digital Showroom
              </p>
              <h2 id="webbanao-growth-title" className="storefront-heading mt-3 text-2xl font-black leading-tight tracking-tight text-foreground sm:text-[2rem]">
                Love this Digital Showroom? Create yours today!
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-strong sm:text-base">
                Give your shop its own online identity. Showcase products, share your catalogue with a link and connect with customers on WhatsApp.
              </p>
              <p className="mt-3 text-xs font-bold text-primary sm:text-sm">
                ✓ 30 Days Free · ✓ Onboarding Support · ✓ No Customer App
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <Link
                href={`/register?${query}`}
                onClick={() => sendGrowthEvent(shopSlug, "CREATE_CLICK")}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-3 text-center text-base font-black text-white shadow-[0_14px_30px_rgba(23,79,67,0.25)] transition hover:-translate-y-0.5 hover:from-emerald-800 hover:to-teal-800 hover:shadow-[0_18px_32px_rgba(23,79,67,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-lg"
              >
                Create My Digital Showroom <span aria-hidden="true">→</span>
              </Link>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Link
                  href={`/partner/register?${query}`}
                  onClick={() => sendGrowthEvent(shopSlug, "PARTNER_CLICK")}
                  className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-primary/30 bg-surface px-3 py-2 text-center shadow-sm transition hover:border-primary/50 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="text-sm font-extrabold text-primary">Earn with Us ↗</span>
                  <span className="mt-0.5 text-xs font-medium text-muted">Refer Shops &amp; Earn</span>
                </Link>
                <Link
                  href={`/?${query}`}
                  onClick={() => sendGrowthEvent(shopSlug, "EXPLORE_CLICK")}
                  className="flex min-h-16 items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm font-extrabold leading-snug text-foreground shadow-sm transition hover:border-primary/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Explore Webbanao Digital Showroom ↗
                </Link>
              </div>
              <p className="text-center text-xs leading-5 text-muted">
                Know a shop owner? Share Webbanao or join our marketing partner program.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
