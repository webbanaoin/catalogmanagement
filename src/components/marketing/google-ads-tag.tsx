"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { GOOGLE_ADS_TAG_ID } from "@/lib/google-ads";

/**
 * Only load Google Ads on the public production storefront.
 * The same Next.js code also runs on staging and local development; test
 * registrations must never pollute paid campaign measurement.
 */
export function GoogleAdsTag() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.location.hostname === "digishowroom.webbanao.in");
  }, []);

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
