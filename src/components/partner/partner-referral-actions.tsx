"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

export function PartnerReferralActions({
  referralCode,
  referralLink,
}: {
  referralCode: string;
  referralLink: string;
}) {
  const [message, setMessage] = useState("");

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(label + " copied.");
    } catch {
      setMessage("Copy failed. Select and copy it manually.");
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `Create your Webbanao Digital Showroom using my referral link: ${referralLink}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void copy(referralLink, "Referral link")}
        >
          Copy referral link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void copy(referralCode, "Referral code")}
        >
          Copy code
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={shareWhatsApp}
        >
          Share on WhatsApp
        </Button>
      </div>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
