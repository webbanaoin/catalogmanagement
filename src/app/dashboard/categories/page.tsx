"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
} from "@/components/ui";
import {
  CatalogApiError,
  createShopCategory,
  deleteShopCategory,
  getCurrentMerchantShop,
  getShopCategories,
  updateShopCategory,
  type ShopCategory,
} from "@/lib/catalog-api";

interface CategoryDraft {
  name: string;
  parentId: string;
  displayOrder: string;
  status: "ACTIVE" | "INACTIVE";
}

const emptyDraft: CategoryDraft = {
  name: "",
  parentId: "",
  displayOrder: "0",
  status: "ACTIVE",
};

export default function CategoriesPage() {
  const [shopId, setShopId] = useState("");
  const [items, setItems] = useState<ShopCategory[]>([]);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => new Map(items.map((category) => [category.id, category.name])),
    [items],
  );

  async function refreshCategories(id: string) {
    const response = await getShopCategories(id);
    setItems(response.items);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const shop = await getCurrentMerchantShop();
        if (!active) return;
        setShopId(shop.id);
        const response = await getShopCategories(shop.id);
        if (active) setItems(response.items);
      } catch (error) {
        if (active) {
          setFeedback({
            variant: "error",
            message: error instanceof CatalogApiError ? error.message : "Unable to load categories.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function startEdit(category: ShopCategory) {
    setEditingId(category.id);
    setDraft({
      name: category.name,
      parentId: category.parentId ?? "",
      displayOrder: String(category.displayOrder),
      status: category.status,
    });
    setFieldError("");
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFieldError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setFieldError("Category name is required.");
      return;
    }
    if (!shopId) {
      setFeedback({ variant: "error", message: "No approved shop is available for this account." });
      return;
    }

    setSaving(true);
    setFieldError("");
    setFeedback(null);

    const payload = {
      name,
      parentId: draft.parentId || null,
      displayOrder: Number(draft.displayOrder) || 0,
      status: draft.status,
    };

    try {
      if (editingId) {
        await updateShopCategory(shopId, editingId, payload);
        setFeedback({ variant: "success", message: "Category updated successfully." });
      } else {
        await createShopCategory(shopId, payload);
        setFeedback({ variant: "success", message: "Category created successfully." });
      }
      setEditingId(null);
      setDraft(emptyDraft);
      await refreshCategories(shopId);
    } catch (error) {
      if (error instanceof CatalogApiError) {
        setFieldError(error.fields.name ?? "");
        setFeedback({ variant: "error", message: error.message });
      } else {
        setFeedback({ variant: "error", message: "Unable to save category." });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: ShopCategory) {
    if (!shopId) return;
    if (!window.confirm(`Delete category "${category.name}"? This is allowed only when it has no child categories or active products.`)) return;

    setDeletingId(category.id);
    setFeedback(null);
    try {
      await deleteShopCategory(shopId, category.id);
      setFeedback({ variant: "success", message: "Category deleted successfully." });
      if (editingId === category.id) cancelEdit();
      await refreshCategories(shopId);
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof CatalogApiError ? error.message : "Unable to delete category.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <LoadingState title="Loading shop categories" description="Fetching categories for your authenticated merchant shop." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 2"
        title="Shop categories"
        description="Create and organize catalogue categories for this shop."
        actions={<Badge variant="success">API connected</Badge>}
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit category" : "Add category"}</CardTitle>
          <CardDescription>Categories are scoped to the authenticated shop and support parent-child organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <Field label="Category name" htmlFor="category-name" error={fieldError} required>
              <Input
                id="category-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                required
              />
            </Field>

            <Field label="Parent category" htmlFor="category-parent">
              <Select
                id="category-parent"
                value={draft.parentId}
                onChange={(event) => setDraft((current) => ({ ...current, parentId: event.target.value }))}
              >
                <option value="">No parent</option>
                {items.filter((item) => item.id !== editingId).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Display order" htmlFor="category-order">
              <Input
                id="category-order"
                type="number"
                min={0}
                max={100000}
                value={draft.displayOrder}
                onChange={(event) => setDraft((current) => ({ ...current, displayOrder: event.target.value }))}
              />
            </Field>

            <Field label="Status" htmlFor="category-status">
              <Select
                id="category-status"
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Update category" : "Add category"}</Button>
              {editingId ? <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="No categories yet" description="Add the first catalogue category for this shop." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Catalogue categories</CardTitle>
            <CardDescription>{items.length} categor{items.length === 1 ? "y" : "ies"} configured.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((category) => (
              <div key={category.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{category.name}</p>
                    <Badge variant={category.status === "ACTIVE" ? "success" : "neutral"}>{category.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {category.parentId ? `Parent: ${categoryNames.get(category.parentId) ?? "Unknown"} · ` : ""}
                    Order: {category.displayOrder} · Slug: {category.slug}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(category)}>Edit</Button>
                  <Button size="sm" variant="danger" disabled={deletingId === category.id} onClick={() => void handleDelete(category)}>
                    {deletingId === category.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Alert title="Tenant boundary">
        Business categories remain platform-level verticals. These catalogue categories belong only to the authenticated merchant shop.
      </Alert>
    </div>
  );
}
