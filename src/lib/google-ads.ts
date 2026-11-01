// Google Ads identifiers are public conversion configuration, not credentials.
export const GOOGLE_ADS_TAG_ID = "AW-18550421830";
const GOOGLE_ADS_MERCHANT_SIGNUP_SEND_TO = "AW-18550421830/l0zLCKX4nLAdEMbyw41F";

type GoogleAdsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/**
 * Called only after /api/auth/register confirms a new merchant was created.
 * Never call on form submit, OTP verification, or /pending-approval page view.
 */
export function reportMerchantSignupConversion() {
  if (typeof window === "undefined" || window.location.hostname !== "digishowroom.webbanao.in") {
    return;
  }

  const google = window as GoogleAdsWindow;
  // Queue the conversion if gtag.js is still loading. Google consumes the
  // existing dataLayer after the script loads.
  if (typeof google.gtag !== "function") {
    google.dataLayer ??= [];
    google.gtag = (...args: unknown[]) => {
      google.dataLayer?.push(args);
    };
  }
  google.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_MERCHANT_SIGNUP_SEND_TO,
  });
}
