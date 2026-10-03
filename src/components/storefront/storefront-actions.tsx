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
}: {
  title: string;
  shopSlug: string;
  productSlug?: string;
  phone: string | null;
  whatsapp: string | null;
  directionsUrl: string | null;
  whatsappMessage?: string;
}) {
  const whatsAppLink = whatsapp ? whatsappHref(whatsapp, whatsappMessage) : null;
  const callLink = phone ? telephoneHref(phone) : null;

  function track(eventType: PublicAnalyticsEventType) {
    void trackPublicEvent({
      shopSlug,
      productSlug,
      eventType,
      source: currentTrackingSource(),
    });
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Shop actions">
      {whatsAppLink ? (
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("primary", "sm")}
          onClick={() => track("WHATSAPP")}
        >
          WhatsApp
        </a>
      ) : null}
      {callLink ? (
        <a
          href={callLink}
          className={buttonClassName("secondary", "sm")}
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
          className={buttonClassName("secondary", "sm")}
          onClick={() => track("DIRECTIONS")}
        >
          Directions
        </a>
      ) : null}
      <ShareButton title={title} shopSlug={shopSlug} productSlug={productSlug} />
    </div>
  );
}
