"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  deletedAt: string | null;
};
type RecoveryData = { deleted: Product[]; activeCount: number; truncated: boolean };

export function AdminProductRecovery({ shopId }: { shopId: string }) {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const endpoint = `/api/admin/shops/${encodeURIComponent(shopId)}/products/recovery`;

  async function load() {
    setBusy(true);
    try {
      const response = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load deleted products");
      setData(payload.data);
      setSelection([]);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load recovery list");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restore() {
    if (!selection.length || busy) return;
    if (!window.confirm(`Restore ${selection.length} selected deleted products and make them visible? This will affect the live storefront.`)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selection }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Restore failed");
      const count: number = payload.data.restored;
      const next = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      if (next.ok) setData((await next.json()).data);
      setSelection([]);
      setNotice(`Restored ${count} products. Verify product details and storefront visibility.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Deleted product recovery</h2>
        <p className="text-sm text-muted-foreground">
          Shop-scoped soft-deleted products. No permanent deletion. Restoring makes selected products visible.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">
          Refresh
        </button>
        <span className="text-sm">{data ? `${data.activeCount} active · ${data.deleted.length} deleted shown` : "Loading…"}</span>
        <button type="button" onClick={() => void restore()} disabled={busy || selection.length === 0}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Restore selected ({selection.length})
        </button>
      </div>
      {notice ? <p role="status" className="text-sm">{notice}</p> : null}
      {data?.truncated ? <p className="text-sm text-amber-700">Only the 200 most recently deleted products are shown.</p> : null}
      {data?.deleted.length ? (
        <div className="max-h-96 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Select</th><th className="p-2">Product</th><th className="p-2">SKU</th><th className="p-2">Deleted at</th></tr></thead>
            <tbody>{data.deleted.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2"><input type="checkbox" aria-label={`Select ${row.name}`} checked={selection.includes(row.id)}
                  onChange={(event) => setSelection((previous) => event.target.checked ? [...previous, row.id] : previous.filter((id) => id !== row.id))} /></td>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.sku ?? "—"}</td>
                <td className="p-2">{row.deletedAt ? new Date(row.deletedAt).toLocaleString() : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : data ? <p className="text-sm text-muted-foreground">No deleted products found for this shop.</p> : null}
    </section>
  );
}
