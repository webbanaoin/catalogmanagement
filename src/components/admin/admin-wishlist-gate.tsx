"use client";

import { useState } from "react";

import { AdminApiError, updateAdminWishlistPermission } from "@/lib/admin-api";
import { Button } from "@/components/ui";

export function AdminWishlistGate({
  shopId, allowed, merchantEnabled, onChanged,
}: {
  shopId: string;
  allowed: boolean;
  merchantEnabled: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      await updateAdminWishlistPermission(shopId, !allowed);
      onChanged();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : "Unable to update permission.");
    } finally { setSaving(false); }
  }
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">WhatsApp wishlist enquiries</p>
          <p className="mt-1 text-sm text-muted">
            Admin permission: <strong>{allowed ? "Allowed" : "Blocked"}</strong> · Merchant setting:{" "}
            <strong>{merchantEnabled ? "On" : "Off"}</strong>
          </p>
          <p className="mt-1 text-xs text-muted">
            Wishlist appears only when both switches are on and a WhatsApp number is configured.
          </p>
        </div>
        <Button type="button" size="sm" variant={allowed ? "secondary" : "primary"}
          disabled={saving} onClick={() => void toggle()}>
          {saving ? "Saving…" : allowed ? "Revoke wishlist permission" : "Allow wishlist"}
        </Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
