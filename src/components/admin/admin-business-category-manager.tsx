"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AdminCategoryMediaLibrary } from "@/components/admin/admin-category-media-library";

import {
  AdminApiError,
  createAdminBusinessCategory,
  getAdminBusinessCategories,
  updateAdminBusinessCategory,
  type AdminBusinessCategory,
  type AdminBusinessCategoryPayload,
} from "@/lib/admin-api";
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
  ErrorState,
  LoadingState,
} from "@/components/ui";

interface FormState {
  name: string;
  slug: string;
  icon: string;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: string;
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  icon: "",
  status: "ACTIVE",
  displayOrder: "0",
};

function fromCategory(category: AdminBusinessCategory): FormState {
  return {
    name: category.name,
    slug: category.slug,
    icon: category.icon ?? "",
    status: category.status,
    displayOrder: String(category.displayOrder),
  };
}

function toPayload(form: FormState): AdminBusinessCategoryPayload {
  return {
    name: form.name.trim(),
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    icon: form.icon.trim() || null,
    status: form.status,
    displayOrder: Number(form.displayOrder),
  };
}

function CategoryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (value: AdminBusinessCategoryPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onSubmit(toPayload(form));
      if (!onCancel) setForm(emptyForm);
      setMessage("Saved.");
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to save business category.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium text-foreground">
          Name
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={2}
            maxLength={120}
            required
          />
        </label>

        <label className="text-sm font-medium text-foreground">
          Slug
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            maxLength={160}
            placeholder="Auto from name"
          />
        </label>

        <label className="text-sm font-medium text-foreground">
          Icon
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
            value={form.icon}
            onChange={(event) => setForm({ ...form, icon: event.target.value })}
            maxLength={255}
            placeholder="Optional icon name"
          />
        </label>

        <label className="text-sm font-medium text-foreground">
          Display order
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
            type="number"
            min="0"
            max="100000"
            value={form.displayOrder}
            onChange={(event) =>
              setForm({ ...form, displayOrder: event.target.value })
            }
            required
          />
        </label>

        <label className="text-sm font-medium text-foreground">
          Status
          <select
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as FormState["status"],
              })
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function AdminBusinessCategoryManager() {
  const [categories, setCategories] = useState<AdminBusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [mediaCategory, setMediaCategory] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getAdminBusinessCategories()
      .then((response) => {
        if (!active) return;
        setCategories(response.items);
        setError(null);
      })
      .catch((error) => {
        if (!active) return;
        setError(
          error instanceof AdminApiError
            ? error.message
            : "Unable to load business categories.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function refresh() {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  async function create(value: AdminBusinessCategoryPayload) {
    await createAdminBusinessCategory(value);
    refresh();
  }

  async function update(
    id: string,
    value: AdminBusinessCategoryPayload,
  ) {
    await updateAdminBusinessCategory(id, value);
    setEditing(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create business category</CardTitle>
          <CardDescription>
            Add a global merchant vertical. Slugs are normalized and uniqueness is
            enforced by the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm
            initial={emptyForm}
            submitLabel="Create category"
            onSubmit={create}
          />
        </CardContent>
      </Card>

      {loading ? <LoadingState title="Loading business categories" /> : null}
      {!loading && error ? (
        <ErrorState
          title="Unable to load business categories"
          description={error}
        />
      ) : null}
      {!loading && !error && categories.length === 0 ? (
        <EmptyState title="No business categories configured" />
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.slug}</CardDescription>
                  </div>
                  <Badge
                    variant={category.status === "ACTIVE" ? "info" : "neutral"}
                  >
                    {category.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {editing === category.id ? (
                  <CategoryForm
                    initial={fromCategory(category)}
                    submitLabel="Save category"
                    onSubmit={(value) => update(category.id, value)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="space-y-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted">Display order</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {category.displayOrder}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Assigned shops</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {category.shopCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Icon</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {category.icon || "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(category.id)}
                      >
                        Edit category
                      </Button>
                      <Button
                        type="button"
                        variant={mediaCategory === category.id ? "primary" : "secondary"}
                        size="sm"
                        onClick={() =>
                          setMediaCategory((current) =>
                            current === category.id ? null : category.id,
                          )
                        }
                      >
                        {mediaCategory === category.id
                          ? "Hide category images"
                          : "Manage category images"}
                      </Button>
                    </div>

                    {mediaCategory === category.id ? (
                      <div className="border-t border-border pt-4">
                        <AdminCategoryMediaLibrary
                          businessCategoryId={category.id}
                          businessCategoryName={category.name}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Alert title="Safe category lifecycle">
        Sprint 6 supports create and update, including activation/inactivation.
        Permanent deletion is intentionally not exposed because categories may
        already be referenced by merchant shops.
      </Alert>
    </div>
  );
}
