"use client";

import { useState } from "react";

import {
  AdminApiError,
  updateAdminShopImageLimit,
  type AdminShop,
} from "@/lib/admin-api";
import { Button } from "@/components/ui";

export function AdminShopImageLimit({
  shop, onChanged,
}: {
  shop: AdminShop;
  onChanged: () => void;
}) {
  const inherited = shop.subscription?.imageLimitPerProduct ?? null;
  const total = shop.subscription?.totalImageLimit ?? null;
  const [selection, setSelection] = useState(
    shop.imageLimitPerProductOverride === null
      ? "default"
      : String(shop.imageLimitPerProductOverride),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const effective = shop.imageLimitPerProductOverride ?? inherited;

  async function save() {
    const override = selection === "default" ? null : Number(selection);
    if (override !== null && (!Number.isInteger(override) || override < 1 || override > 50)) {
      setError("Enter a whole number between 1 and 50.");
      return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateAdminShopImageLimit(shop.id, override);
      setFeedback(override === null ? "Now using the plan's image limit." : `Saved: ${override} images per product.`);
      onChanged();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : "Could not save the image limit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Product image gallery limit
      </p>
      <p className="mt-1 text-sm text-muted">
        Current: <strong>{effective ?? "No subscription"} images / product</strong>
        {inherited !== null ? ` · Plan default: ${inherited}` : ""}
        {total !== null ? ` · Shop total: ${total}` : ""}
      </p>
      <p className="mt-1 text-xs text-muted">
        Override applies to this shop only; all others keep their subscription plan limits.
        Existing images are never deleted if the limit is reduced.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[170px] flex-1 text-xs font-medium text-foreground">
          Mode
          <select className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={selection === "default" ? "default" : "custom"}
            onChange={(event) => setSelection(event.target.value === "default"
              ? "default" : String(shop.imageLimitPerProductOverride ?? inherited ?? 10))}>
            <option value="default">Use plan default</option>
            <option value="custom">Shop-specific limit</option>
          </select>
        </label>
        {selection !== "default" ? (
          <label className="w-32 text-xs font-medium text-foreground">
            Images per product
            <input type="number" min="1" max="50" step="1"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={selection} onChange={(event) => setSelection(event.target.value)} />
          </label>
        ) : null}
        <Button size="sm" type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save limit"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-danger" role="alert">{error}</p> : null}
      {feedback ? <p className="mt-2 text-xs text-muted" role="status">{feedback}</p> : null}
    </div>
  );
}
