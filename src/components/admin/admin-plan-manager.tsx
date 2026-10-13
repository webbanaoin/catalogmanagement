"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  AdminApiError,
  createAdminPlan,
  getAdminPlans,
  updateAdminPlan,
  restartAdminPlanOffer,
  type AdminPlan,
  type AdminPlanPayload,
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
  description: string;
  monthlyPrice: string;
  quarterlyPrice: string;
  halfYearlyPrice: string;
  annualPrice: string;
  regularMonthlyPrice: string;
  regularQuarterlyPrice: string;
  regularHalfYearlyPrice: string;
  regularAnnualPrice: string;
  offerEnabled: boolean;
  offerDurationDays: string;
  productLimit: string;
  imageLimitPerProduct: string;
  trialDays: string;
  graceDays: string;
  analyticsEnabled: boolean;
  excelImportEnabled: boolean;
  customBrandingEnabled: boolean;
  isDefaultTrial: boolean;
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  monthlyPrice: "0",
  quarterlyPrice: "0",
  halfYearlyPrice: "0",
  annualPrice: "0",
  regularMonthlyPrice: "",
  regularQuarterlyPrice: "",
  regularHalfYearlyPrice: "",
  regularAnnualPrice: "",
  offerEnabled: false,
  offerDurationDays: "7",
  productLimit: "100",
  imageLimitPerProduct: "5",
  trialDays: "0",
  graceDays: "0",
  analyticsEnabled: false,
  excelImportEnabled: false,
  customBrandingEnabled: false,
  isDefaultTrial: false,
  status: "ACTIVE",
};

function fromPlan(plan: AdminPlan): FormState {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    monthlyPrice: plan.monthlyPrice,
    quarterlyPrice: plan.quarterlyPrice,
    halfYearlyPrice: plan.halfYearlyPrice,
    annualPrice: plan.annualPrice,
    regularMonthlyPrice: plan.regularMonthlyPrice ?? "",
    regularQuarterlyPrice: plan.regularQuarterlyPrice ?? "",
    regularHalfYearlyPrice: plan.regularHalfYearlyPrice ?? "",
    regularAnnualPrice: plan.regularAnnualPrice ?? "",
    offerEnabled: plan.offerEnabled,
    offerDurationDays: String(plan.offerDurationDays),
    productLimit: String(plan.productLimit),
    imageLimitPerProduct: String(plan.imageLimitPerProduct),
    trialDays: String(plan.trialDays),
    graceDays: String(plan.graceDays),
    analyticsEnabled: plan.analyticsEnabled,
    excelImportEnabled: plan.excelImportEnabled,
    customBrandingEnabled: plan.customBrandingEnabled,
    isDefaultTrial: plan.isDefaultTrial,
    status: plan.status,
  };
}

function toPayload(form: FormState): AdminPlanPayload {
  return {
    name: form.name.trim(),
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    description: form.description.trim() || null,
    monthlyPrice: Number(form.monthlyPrice),
    quarterlyPrice: Number(form.quarterlyPrice),
    halfYearlyPrice: Number(form.halfYearlyPrice),
    annualPrice: Number(form.annualPrice),
    regularMonthlyPrice: form.regularMonthlyPrice.trim() ? Number(form.regularMonthlyPrice) : null,
    regularQuarterlyPrice: form.regularQuarterlyPrice.trim() ? Number(form.regularQuarterlyPrice) : null,
    regularHalfYearlyPrice: form.regularHalfYearlyPrice.trim() ? Number(form.regularHalfYearlyPrice) : null,
    regularAnnualPrice: form.regularAnnualPrice.trim() ? Number(form.regularAnnualPrice) : null,
    offerEnabled: form.offerEnabled,
    offerDurationDays: Number(form.offerDurationDays),
    productLimit: Number(form.productLimit),
    imageLimitPerProduct: Number(form.imageLimitPerProduct),
    trialDays: Number(form.trialDays),
    graceDays: Number(form.graceDays),
    analyticsEnabled: form.analyticsEnabled,
    excelImportEnabled: form.excelImportEnabled,
    customBrandingEnabled: form.customBrandingEnabled,
    isDefaultTrial: form.isDefaultTrial,
    status: form.status,
  };
}

function PlanForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (value: AdminPlanPayload) => Promise<void>;
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
      setMessage("Saved.");
      if (!onCancel) setForm(emptyForm);
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to save plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium text-foreground">Name
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label className="text-sm font-medium text-foreground">Slug
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Description
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Monthly offer price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Quarterly offer price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" value={form.quarterlyPrice} onChange={(event) => setForm({ ...form, quarterlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Half-Yearly offer price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" value={form.halfYearlyPrice} onChange={(event) => setForm({ ...form, halfYearlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Yearly offer price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" value={form.annualPrice} onChange={(event) => setForm({ ...form, annualPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Monthly regular price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" placeholder="499" value={form.regularMonthlyPrice} onChange={(event) => setForm({ ...form, regularMonthlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Quarterly regular price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" placeholder="1299" value={form.regularQuarterlyPrice} onChange={(event) => setForm({ ...form, regularQuarterlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Half-yearly regular price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" placeholder="2499" value={form.regularHalfYearlyPrice} onChange={(event) => setForm({ ...form, regularHalfYearlyPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Yearly regular price (₹)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" step="0.01" placeholder="4999" value={form.regularAnnualPrice} onChange={(event) => setForm({ ...form, regularAnnualPrice: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Offer duration (days)
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="1" max="365" step="1" value={form.offerDurationDays} onChange={(event) => setForm({ ...form, offerDurationDays: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Product limit
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="1" value={form.productLimit} onChange={(event) => setForm({ ...form, productLimit: event.target.value })} required />
        </label>
        <label className="text-sm font-medium text-foreground">Images per product
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="1" value={form.imageLimitPerProduct} onChange={(event) => setForm({ ...form, imageLimitPerProduct: event.target.value })} required />
        </label>
        <label className="text-sm font-medium text-foreground">Trial days
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" value={form.trialDays} onChange={(event) => setForm({ ...form, trialDays: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Grace days
          <input className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" type="number" min="0" value={form.graceDays} onChange={(event) => setForm({ ...form, graceDays: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-foreground">Status
          <select className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"><input type="checkbox" checked={form.analyticsEnabled} onChange={(event) => setForm({ ...form, analyticsEnabled: event.target.checked })} /> Analytics</label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"><input type="checkbox" checked={form.excelImportEnabled} onChange={(event) => setForm({ ...form, excelImportEnabled: event.target.checked })} /> Excel import/export</label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"><input type="checkbox" checked={form.customBrandingEnabled} onChange={(event) => setForm({ ...form, customBrandingEnabled: event.target.checked })} /> Custom branding</label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"><input type="checkbox" checked={form.offerEnabled} onChange={(event) => setForm({ ...form, offerEnabled: event.target.checked })} /> Enable limited-time offer</label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"><input type="checkbox" checked={form.isDefaultTrial} onChange={(event) => setForm({ ...form, isDefaultTrial: event.target.checked })} /> Default trial</label>
      </div>

      <p className="text-xs leading-5 text-muted">Offer price fields are the amounts charged while an offer is active. Regular prices apply after expiry or when the offer is disabled. Enabling starts a real shared countdown; changing duration later requires Restart offer to reset the timer.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button> : null}
      </div>
      {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}
    </form>
  );
}

export function AdminPlanManager() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getAdminPlans()
      .then((response) => {
        if (!active) return;
        setPlans(response.items);
        setError(null);
      })
      .catch((error) => {
        if (active) setError(error instanceof AdminApiError ? error.message : "Unable to load plans.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  function refresh() {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  async function create(value: AdminPlanPayload) {
    await createAdminPlan(value);
    refresh();
  }

  async function update(id: string, value: AdminPlanPayload) {
    await updateAdminPlan(id, value);
    setEditing(null);
    refresh();
  }

  async function restartOffer(plan: AdminPlan) {
    if (!window.confirm(`Restart the ${plan.offerDurationDays}-day offer for ${plan.name} from now? This changes prices shown to all merchants.`)) return;
    setRestartingId(plan.id);
    setError(null);
    try {
      await restartAdminPlanOffer(plan.id);
      refresh();
    } catch (problem) {
      setError(problem instanceof AdminApiError ? problem.message : "Could not restart offer.");
    } finally {
      setRestartingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create plan</CardTitle>
          <CardDescription>Pricing, limits and features are database-driven. Monthly, Quarterly, Half-Yearly and Yearly amounts flow to landing, merchant and payment screens.</CardDescription>
        </CardHeader>
        <CardContent><PlanForm initial={emptyForm} submitLabel="Create plan" onSubmit={create} /></CardContent>
      </Card>

      {loading ? <LoadingState title="Loading plans" /> : null}
      {!loading && error ? <ErrorState title="Unable to load plans" description={error} /> : null}
      {!loading && !error && plans.length === 0 ? <EmptyState title="No plans configured" /> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.slug}</CardDescription></div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={plan.status === "ACTIVE" ? "info" : "neutral"}>{plan.status}</Badge>
                    {plan.isDefaultTrial ? <Badge variant="warning">Default trial</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editing === plan.id ? (
                  <PlanForm initial={fromPlan(plan)} submitLabel="Save plan" onSubmit={(value) => update(plan.id, value)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="space-y-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div><dt className="text-muted">Monthly</dt><dd className="mt-1 font-medium text-foreground">₹{plan.monthlyPrice}</dd></div>
                      <div><dt className="text-muted">Quarterly</dt><dd className="mt-1 font-medium text-foreground">₹{plan.quarterlyPrice}</dd></div>
                      <div><dt className="text-muted">Half-Yearly</dt><dd className="mt-1 font-medium text-foreground">₹{plan.halfYearlyPrice}</dd></div>
                      <div><dt className="text-muted">Yearly</dt><dd className="mt-1 font-medium text-foreground">₹{plan.annualPrice}</dd></div>
                      <div><dt className="text-muted">Monthly list</dt><dd className="mt-1 font-medium text-foreground">{plan.regularMonthlyPrice ? `₹${plan.regularMonthlyPrice}` : "—"}</dd></div>
                      <div><dt className="text-muted">Quarterly list</dt><dd className="mt-1 font-medium text-foreground">{plan.regularQuarterlyPrice ? `₹${plan.regularQuarterlyPrice}` : "—"}</dd></div>
                      <div><dt className="text-muted">Half-yearly list</dt><dd className="mt-1 font-medium text-foreground">{plan.regularHalfYearlyPrice ? `₹${plan.regularHalfYearlyPrice}` : "—"}</dd></div>
                      <div><dt className="text-muted">Yearly list</dt><dd className="mt-1 font-medium text-foreground">{plan.regularAnnualPrice ? `₹${plan.regularAnnualPrice}` : "—"}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-muted">Limited-time offer</dt><dd className="mt-1 font-medium text-foreground">{plan.offerEnabled ? `Enabled · ${plan.offerDurationDays} days` : "Disabled"}{plan.offerEndsAt ? ` · Ends ${new Date(plan.offerEndsAt).toLocaleString("en-IN")}` : ""}</dd></div>
                      <div><dt className="text-muted">Products</dt><dd className="mt-1 font-medium text-foreground">{plan.productLimit}</dd></div>
                      <div><dt className="text-muted">Images/product</dt><dd className="mt-1 font-medium text-foreground">{plan.imageLimitPerProduct}</dd></div>
                      <div><dt className="text-muted">Trial / grace</dt><dd className="mt-1 font-medium text-foreground">{plan.trialDays} / {plan.graceDays} days</dd></div>
                    </dl>
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <span>Analytics: {plan.analyticsEnabled ? "Yes" : "No"}</span><span>·</span>
                      <span>Excel: {plan.excelImportEnabled ? "Yes" : "No"}</span><span>·</span>
                      <span>Branding: {plan.customBrandingEnabled ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(plan.id)}>Edit plan</Button>
                      {plan.offerEnabled ? <Button type="button" variant="secondary" size="sm" disabled={restartingId !== null} onClick={() => void restartOffer(plan)}>{restartingId === plan.id ? "Restarting…" : "Restart offer countdown"}</Button> : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Alert title="Phase 1 boundary">
        Plan administration changes limits and feature flags only. Offline payments require Webbanao admin verification.
      </Alert>
    </div>
  );
}
