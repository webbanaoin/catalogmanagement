"use client";

import { ShareButton } from "@/components/storefront/share-button";
import { buttonClassName } from "@/components/ui";
import {
  currentTrackingSource,
  trackPublicEvent,
  type PublicAnalyticsEventType,
} from "@/lib/public-analytics";
import { telephoneHref, whatsappHref } from "@/lib/storefront";

export function StorefrontActions({
  title,
  shopSlug,
  productSlug,
  phone,
  whatsapp,
  directionsUrl,
  whatsappMessage,
  whatsappLabel = "WhatsApp",
}: {
  title: string;
  shopSlug: string;
  productSlug?: string;
  phone: string | null;
  whatsapp: string | null;
  directionsUrl: string | null;
  whatsappMessage?: string;
  whatsappLabel?: string;
}) {
  const whatsAppLink = whatsapp ? whatsappHref(whatsapp, whatsappMessage) : null;
  const callLink = phone ? telephoneHref(phone) : null;

  function track(eventType: PublicAnalyticsEventType) {
    void trackPublicEvent({
      shopSlug,
      productSlug,
      eventType,
      source: currentTrackingSource(shopSlug),
    });
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 [&>button]:w-full sm:[&>button]:w-auto"
      aria-label="Shop actions"
    >
      {whatsAppLink ? (
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName(
            "primary",
            "md",
            "w-full rounded-xl px-4 shadow-[0_8px_24px_rgba(23,79,67,0.14)] sm:w-auto",
          )}
          onClick={() => track("WHATSAPP")}
        >
          {whatsappLabel}
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
      {callLink ? (
        <a
          href={callLink}
          className={buttonClassName(
            "secondary",
            "md",
            "w-full rounded-xl bg-surface/95 sm:w-auto",
          )}
          onClick={() => track("CALL")}
        >
          Call shop
        </a>
      ) : null}
      {directionsUrl ? (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName(
            "secondary",
            "md",
            "w-full rounded-xl bg-surface/95 sm:w-auto",
          )}
          onClick={() => track("DIRECTIONS")}
        >
          Directions
        </a>
      ) : null}
      <ShareButton title={title} shopSlug={shopSlug} productSlug={productSlug} />
    </div>
  );
}
