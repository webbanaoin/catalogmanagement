"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { currentTrackingSource, trackPublicEvent } from "@/lib/public-analytics";

function shareUrl(shopSlug: string, productSlug?: string): string {
  const path = productSlug
    ? `/s/${encodeURIComponent(shopSlug)}/p/${encodeURIComponent(productSlug)}`
    : `/s/${encodeURIComponent(shopSlug)}`;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("src", "share");
  return url.toString();
}

export function ShareButton({
  title,
  shopSlug,
  productSlug,
}: {
  title: string;
  shopSlug: string;
  productSlug?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  async function share() {
    const url = shareUrl(shopSlug, productSlug);

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 2000);
      }

      void trackPublicEvent({
        shopSlug,
        productSlug,
        eventType: "SHARE",
        source: currentTrackingSource(shopSlug),
      });
    } catch {
      // The user may cancel the native share dialog. Do not count cancelled shares.
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={share}>
      {status === "copied" ? "Link copied" : "Share"}
    </Button>
  );
}
