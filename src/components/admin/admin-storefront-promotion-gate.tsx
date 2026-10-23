"use client";

import { useState } from "react";

import { AdminApiError, updateAdminStorefrontPromotion } from "@/lib/admin-api";
import { Button } from "@/components/ui";

export function AdminStorefrontPromotionGate({
  shopId,
  enabled,
  onChanged,
}: {
  shopId: string;
  enabled: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateAdminStorefrontPromotion(shopId, !enabled);
      setFeedback(enabled ? "Promotion disabled." : "Promotion enabled.");
      onChanged();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : "Unable to update the promotion setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Webbanao growth promotion
          </p>
          <p className="mt-1 text-sm text-muted">
            Shop promotion: <strong>{enabled ? "Enabled" : "Disabled"}</strong>
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Show or hide the Create My Digital Showroom, Earn with Us, and Explore
            Webbanao Digital Showroom section. This setting affects this shop only.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={enabled ? "secondary" : "primary"}
          disabled={saving}
          aria-label={enabled ? "Disable growth promotion for this shop" : "Enable growth promotion for this shop"}
          onClick={() => void toggle()}
        >
          {saving ? "Saving…" : enabled ? "Disable promotion" : "Enable promotion"}
        </Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
      {feedback ? <p role="status" className="mt-2 text-xs text-muted">{feedback}</p> : null}
    </div>
  );
}
