"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  AdminApiError,
  createAdminBusinessDefault,
  getAdminBusinessDefaults,
  updateAdminBusinessDefault,
  type AdminBusinessDefaultCategory,
} from "@/lib/admin-api";
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState } from "@/components/ui";

type Status = "ACTIVE" | "INACTIVE";

export function AdminBusinessDefaultManager({
  businessCategoryId,
  onChanged,
}: {
  businessCategoryId: string;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<AdminBusinessDefaultCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState("100");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("0");
  const [editStatus, setEditStatus] = useState<Status>("ACTIVE");

  useEffect(() => {
    let active = true;
    getAdminBusinessDefaults(businessCategoryId)
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setError(null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof AdminApiError ? cause.message : "Unable to load subcategories.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessCategoryId, loadKey]);

  function refresh() {
    setLoading(true);
    setLoadKey((current) => current + 1);
    onChanged?.();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await createAdminBusinessDefault(businessCategoryId, {
        name: name.trim(),
        displayOrder: Number(displayOrder),
        status: "ACTIVE",
      });
      setName("");
      setDisplayOrder(String(Math.max(100, Number(displayOrder) + 10)));
      setFeedback("Subcategory added. It will be included for new shops and synced to existing shops when their catalog is next opened.");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create subcategory.");
    } finally { setSaving(false); }
  }

  function edit(item: AdminBusinessDefaultCategory) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditOrder(String(item.displayOrder));
    setEditStatus(item.status);
    setError(null);
    setFeedback(null);
  }

  async function saveEdit(item: AdminBusinessDefaultCategory) {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateAdminBusinessDefault(businessCategoryId, item.id, {
        name: editName.trim(),
        displayOrder: Number(editOrder),
        status: editStatus,
      });
      setEditingId(null);
      setFeedback("Default updated. Existing merchants' category names and linked products are not overwritten.");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update subcategory.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Default shop subcategories</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Add or edit category suggestions for this business type without code changes.
          They become independent categories in each merchant&apos;s catalog.
        </p>
      </div>

      <form onSubmit={(event) => void create(event)} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
        <label className="text-xs font-medium text-foreground">
          New subcategory
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Stationery or Soft Toys"
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <label className="text-xs font-medium text-foreground">
          Display order
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            type="number"
            min="0"
            max="100000"
            value={displayOrder}
            onChange={(event) => setDisplayOrder(event.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={saving || loading}>
          {saving ? "Saving…" : "Add subcategory"}
        </Button>
      </form>
      {feedback ? <Alert title="Subcategory saved">{feedback}</Alert> : null}
      {error ? <ErrorState title="Subcategory action failed" description={error} /> : null}
      {loading ? <LoadingState title="Loading default subcategories" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No subcategories yet" /> : null}
      {!loading && items.length > 0 ? (
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-background p-3">
              {editingId === item.id ? (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_110px_auto] sm:items-end">
                  <label className="text-xs text-muted">
                    Name
                    <input className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={editName} onChange={(event) => setEditName(event.target.value)}
                      minLength={2} maxLength={120} />
                  </label>
                  <label className="text-xs text-muted">
                    Order
                    <input className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      type="number" min="0" max="100000"
                      value={editOrder} onChange={(event) => setEditOrder(event.target.value)} />
                  </label>
                  <label className="text-xs text-muted">
                    Status
                    <select className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as Status)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" disabled={saving || !editName.trim() ||
                      !Number.isInteger(Number(editOrder)) || Number(editOrder) < 0}
                      onClick={() => void saveEdit(item)}>Save</Button>
                    <Button type="button" size="sm" variant="secondary"
                      disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted">{item.slug} · Order {item.displayOrder}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "ACTIVE" ? "info" : "neutral"}>
                      {item.status}
                    </Badge>
                    <Button size="sm" type="button" variant="secondary"
                      disabled={saving} onClick={() => edit(item)}>Edit</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <p className="text-xs leading-5 text-muted">
        Inactive defaults are not added to shops. Changes never delete an existing merchant
        category or affect its products. Slugs remain stable to preserve shared category images.
      </p>
    </div>
  );
}
