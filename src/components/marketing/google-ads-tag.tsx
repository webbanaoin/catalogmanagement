"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";

import { GOOGLE_ADS_TAG_ID } from "@/lib/google-ads";

/**
 * Only load Google Ads on the public production storefront.
 * The same Next.js code also runs on staging and local development; test
 * registrations must never pollute paid campaign measurement.
 */
// Render no tag during SSR/hydration; enable it on the production host
// immediately after hydration without setting React state in an effect.
const subscribe = () => () => {};
const productionSnapshot = () => window.location.hostname === "digishowroom.webbanao.in";
const serverSnapshot = () => false;

export function GoogleAdsTag() {
  const enabled = useSyncExternalStore(subscribe, productionSnapshot, serverSnapshot);

  if (!enabled) return null;

  return (
    <>
      <Script id="webbanao-google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
          window.gtag('js', new Date());
          window.gtag('config', '${GOOGLE_ADS_TAG_ID}');
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
