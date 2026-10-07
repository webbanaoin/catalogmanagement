"use client";

import { useEffect, useState } from "react";

import {
  AdminApiError,
  adminSmartExcelTemplateUrl,
  assignAdminShopBusinessCategory,
  confirmAdminProductImport,
  getAdminBusinessCategories,
  getAdminPlans,
  getAdminShops,
  getAdminSubscription,
  previewAdminProductImport,
  updateAdminShopStatus,
  updateAdminSubscription,
  type AdminBusinessCategory,
  type AdminImportPreview,
  type AdminPlan,
  type AdminShop,
  type AdminShopStatus,
  type AdminSubscription,
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

const statuses: AdminShopStatus[] = [
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "SUSPENDED",
  "REJECTED",
];

const transitions: Record<AdminShopStatus, AdminShopStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "SUSPENDED"],
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  REJECTED: [],
};

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SubscriptionInspector({
  shop,
  plans,
}: {
  shop: AdminShop;
  plans: AdminPlan[];
}) {
  const [open, setOpen] = useState(false);
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<AdminSubscription["storedStatus"]>("TRIAL");
  const [paymentStatus, setPaymentStatus] =
    useState<AdminSubscription["paymentStatus"]>("NOT_REQUIRED");
  const [extendDays, setExtendDays] = useState("");

  async function load() {
    setWorking(true);
    setMessage(null);
    try {
      const response = await getAdminSubscription(shop.id);
      setSubscription(response.data);
      setLoaded(true);
      if (response.data) {
        setPlanId(response.data.plan.id);
        setStatus(response.data.storedStatus);
        setPaymentStatus(response.data.paymentStatus);
      }
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to load subscription.");
    } finally {
      setWorking(false);
    }
  }

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !loaded) await load();
  }

  async function save() {
    if (!subscription) return;
    setWorking(true);
    setMessage(null);
    try {
      const response = await updateAdminSubscription(shop.id, {
        planId,
        status,
        paymentStatus,
        ...(extendDays ? { extendDays: Number(extendDays) } : {}),
      });
      setSubscription(response.data);
      setExtendDays("");
      setMessage("Subscription updated.");
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to update subscription.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <Button type="button" variant="ghost" size="sm" onClick={toggle}>
        {open ? "Hide subscription" : "Inspect subscription"}
      </Button>

      {open ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          {working && !loaded ? <p className="text-sm text-muted">Loading subscription…</p> : null}

          {loaded && !subscription ? (
            <Alert title="No subscription">
              This shop has no subscription record. Approval/activation normally provisions the configured default trial.
            </Alert>
          ) : null}

          {subscription ? (
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted">Effective status</dt>
                  <dd className="mt-1 font-medium text-foreground">{titleCase(subscription.status)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Plan</dt>
                  <dd className="mt-1 font-medium text-foreground">{subscription.plan.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">End date</dt>
                  <dd className="mt-1 font-medium text-foreground">{formatDate(subscription.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Product usage</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {subscription.usage.products ?? 0} / {subscription.plan.productLimit}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-medium text-foreground">
                  Plan
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                    value={planId}
                    onChange={(event) => setPlanId(event.target.value)}
                  >
                    {plans.filter((plan) => plan.status === "ACTIVE").map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Stored status
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as AdminSubscription["storedStatus"])}
                  >
                    {["TRIAL", "ACTIVE", "GRACE", "EXPIRED", "CANCELLED"].map((value) => (
                      <option key={value} value={value}>{titleCase(value)}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Payment status
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                    value={paymentStatus}
                    onChange={(event) =>
                      setPaymentStatus(
                        event.target.value as AdminSubscription["paymentStatus"],
                      )
                    }
                  >
                    {["NOT_REQUIRED", "PENDING", "PAID", "WAIVED"].map((value) => (
                      <option key={value} value={value}>{titleCase(value)}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Extend days
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                    type="number"
                    min="1"
                    max="3660"
                    value={extendDays}
                    onChange={(event) => setExtendDays(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>

              <Button type="button" onClick={save} disabled={working || !planId}>
                {working ? "Saving…" : "Save subscription"}
              </Button>
            </div>
          ) : null}

          {message ? <p className="mt-3 text-sm text-muted" role="status">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function ProductOnboardingPanel({
  shop,
  onImported,
}: {
  shop: AdminShop;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AdminImportPreview | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supportedStatus =
    shop.status === "PENDING" ||
    shop.status === "APPROVED" ||
    shop.status === "ACTIVE";
  const businessReady = Boolean(
    shop.businessCategory && !shop.requestedBusinessType,
  );

  if (!supportedStatus) return null;

  async function checkFile() {
    if (!file) {
      setMessage("Choose the completed Smart Excel file first.");
      return;
    }

    setWorking(true);
    setMessage(null);
    setPreview(null);

    try {
      const response = await previewAdminProductImport(shop.id, file);
      setPreview(response.data);
      if (response.data.job.status === "VALIDATION_FAILED") {
        setMessage(
          "The workbook was checked, but there are no ready rows to import. Review the row errors below.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to check this Excel file.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function importReadyRows() {
    if (!preview || preview.summary.readyWithinPlan <= 0) return;

    setWorking(true);
    setMessage(null);

    try {
      const response = await confirmAdminProductImport(
        shop.id,
        preview.job.id,
      );
      const plural = response.data.importedCount === 1 ? "" : "s";
      const skipped =
        response.data.skippedCount > 0
          ? " " + response.data.skippedCount + " row(s) were skipped."
          : "";
      setMessage(
        "Imported " +
          response.data.importedCount +
          " product" +
          plural +
          " for " +
          shop.name +
          "." +
          skipped,
      );
      setPreview(null);
      setFile(null);
      onImported();
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to import the ready products.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide product onboarding" : "Product onboarding / Smart Excel"}
      </Button>

      {open ? (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                Admin assisted onboarding
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                Bulk upload products for {shop.name}
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                Use the same shop-specific Smart Excel for first-time onboarding
                or later bulk product additions. Admin actions are recorded in
                the audit log.
              </p>
            </div>
            {shop.businessCategory ? (
              <Badge variant="info">{shop.businessCategory.name}</Badge>
            ) : null}
          </div>

          {!businessReady ? (
            <div className="mt-4">
              <Alert title="Business type required">
                Assign the requested/supported business type first. Smart Excel
                is generated from the shop business type, categories and
                catalogue fields.
              </Alert>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={adminSmartExcelTemplateUrl(shop.id)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
                >
                  Download Smart Excel
                </a>
                <span className="text-xs text-muted">
                  Shop-specific categories and business fields are included.
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm font-medium text-foreground">
                  Completed Excel file
                  <input
                    className="mt-1 block h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setPreview(null);
                      setMessage(null);
                    }}
                    disabled={working}
                  />
                </label>
                <Button
                  type="button"
                  onClick={checkFile}
                  disabled={working || !file}
                >
                  {working ? "Checking…" : "Check & preview"}
                </Button>
              </div>

              {preview ? (
                <div className="space-y-4 rounded-xl border border-border bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted">Ready</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {preview.summary.readyRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Duplicates</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {preview.summary.duplicateRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Invalid</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {preview.summary.invalidRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Remaining slots</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {preview.summary.remainingProductSlots}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Capacity plan</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {preview.summary.capacityPlanName}
                      </p>
                    </div>
                  </div>

                  {preview.rows.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-surface-muted/60 text-muted">
                          <tr>
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Group / Type</th>
                            <th className="px-3 py-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(0, 15).map((row) => (
                            <tr
                              key={row.rowNumber}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2">{row.rowNumber}</td>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {row.values["Product Name"] || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {row.values.Category || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {row.values["Product Group"] ||
                                  row.values["Jewellery Type"] ||
                                  "—"}
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant={
                                    row.status === "READY"
                                      ? "success"
                                      : row.status === "DUPLICATE"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {titleCase(row.status)}
                                </Badge>
                                {row.errors[0]?.message ? (
                                  <p className="mt-1 max-w-sm text-[11px] text-muted">
                                    {row.errors[0].message}
                                  </p>
                                ) : row.duplicate?.message ? (
                                  <p className="mt-1 max-w-sm text-[11px] text-muted">
                                    {row.duplicate.message}
                                  </p>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {preview.rows.length > 15 ? (
                        <p className="border-t border-border px-3 py-2 text-xs text-muted">
                          Showing first 15 of {preview.rows.length} checked rows.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={importReadyRows}
                      disabled={
                        working || preview.summary.readyWithinPlan <= 0
                      }
                    >
                      {working
                        ? "Importing…"
                        : "Import " +
                          preview.summary.readyWithinPlan +
                          " ready product" +
                          (preview.summary.readyWithinPlan === 1 ? "" : "s")}
                    </Button>
                    {preview.summary.readyRows >
                    preview.summary.readyWithinPlan ? (
                      <p className="text-xs text-amber-700">
                        Some ready rows exceed the current product limit and will
                        not be imported.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {message ? (
                <Alert title="Product onboarding">{message}</Alert>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ShopCard({
  shop,
  plans,
  businessCategories,
  onChanged,
}: {
  shop: AdminShop;
  plans: AdminPlan[];
  businessCategories: AdminBusinessCategory[];
  onChanged: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [businessCategoryId, setBusinessCategoryId] = useState(
    shop.businessCategory?.id ?? "",
  );
  const owner = shop.owners[0];
  const location = [shop.city, shop.state].filter(Boolean).join(", ");

  async function assignRequestedBusinessType() {
    if (!businessCategoryId) {
      setMessage("Select the supported business type to assign.");
      return;
    }

    setWorking(true);
    setMessage(null);
    try {
      await assignAdminShopBusinessCategory(shop.id, businessCategoryId);
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to assign business type.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function changeStatus(next: AdminShopStatus) {
    setWorking(true);
    setMessage(null);
    try {
      await updateAdminShopStatus(shop.id, next);
      onChanged();
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to update shop status.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{shop.name}</CardTitle>
            <CardDescription>
              {location || "Location not provided"} · /s/{shop.slug}
            </CardDescription>
          </div>
          <Badge variant={shop.status === "ACTIVE" ? "info" : "neutral"}>{titleCase(shop.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted">Owner</dt><dd className="mt-1 font-medium text-foreground">{owner?.name ?? "—"}</dd></div>
          <div><dt className="text-muted">Owner email</dt><dd className="mt-1 break-all text-foreground">{owner?.email ?? "—"}</dd></div>
          <div><dt className="text-muted">Shop contact</dt><dd className="mt-1 text-foreground">{shop.phone ?? shop.email ?? "—"}</dd></div>
          <div><dt className="text-muted">Registered</dt><dd className="mt-1 text-foreground">{formatDate(shop.createdAt)}</dd></div>
        </dl>

        {shop.requestedBusinessType ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              Business type request
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {shop.requestedBusinessType}
            </p>
            <p className="mt-1 text-sm text-muted">
              Review this request before approving the shop. If Webbanao supports it,
              map the shop to an active business type below. If a new global type is
              needed, create it under Business Categories first.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-medium text-foreground">
                Assign supported business type
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3"
                  value={businessCategoryId}
                  onChange={(event) => setBusinessCategoryId(event.target.value)}
                  disabled={working}
                >
                  <option value="">Select business type</option>
                  {businessCategories
                    .filter((category) => category.status === "ACTIVE")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              <Button
                type="button"
                size="sm"
                onClick={assignRequestedBusinessType}
                disabled={working || !businessCategoryId}
              >
                {working ? "Assigning…" : "Accept & assign"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Business type
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {shop.businessCategory?.name ?? "Not selected"}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Subscription
              </p>
              {shop.subscription ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {shop.subscription.planName}
                  </span>
                  <Badge
                    variant={
                      shop.subscription.status === "ACTIVE" ||
                      shop.subscription.status === "TRIAL"
                        ? "success"
                        : shop.subscription.status === "GRACE"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {titleCase(shop.subscription.status)}
                  </Badge>
                  <Badge variant="info">
                    Payment: {titleCase(shop.subscription.paymentStatus)}
                  </Badge>
                </div>
              ) : (
                <p className="mt-2 text-sm font-medium text-muted">
                  No subscription assigned
                </p>
              )}
            </div>
            <div className="text-sm sm:text-right">
              <p className="text-muted">Valid until</p>
              <p className="mt-1 font-medium text-foreground">
                {shop.subscription ? formatDate(shop.subscription.endDate) : "—"}
              </p>
            </div>
          </div>
        </div>

        {transitions[shop.status].length ? (
          <div className="flex flex-wrap gap-2">
            {transitions[shop.status].map((next) => (
              <Button
                key={next}
                type="button"
                size="sm"
                variant={next === "REJECTED" || next === "SUSPENDED" ? "danger" : "secondary"}
                disabled={working}
                onClick={() => changeStatus(next)}
              >
                {titleCase(next)}
              </Button>
            ))}
          </div>
        ) : null}

        {message ? <Alert title="Status update">{message}</Alert> : null}
        <ProductOnboardingPanel shop={shop} onImported={onChanged} />
        <SubscriptionInspector shop={shop} plans={plans} />
      </CardContent>
    </Card>
  );
}

export function AdminShopManager() {
  const [status, setStatus] = useState<AdminShopStatus>("PENDING");
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [businessCategories, setBusinessCategories] = useState<
    AdminBusinessCategory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      getAdminShops(status),
      getAdminPlans(),
      getAdminBusinessCategories(),
    ])
      .then(([shopResponse, planResponse, businessCategoryResponse]) => {
        if (!active) return;
        setShops(shopResponse.items);
        setPlans(planResponse.items);
        setBusinessCategories(businessCategoryResponse.items);
      })
      .catch((error) => {
        if (!active) return;
        setError(error instanceof AdminApiError ? error.message : "Unable to load admin shops.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey, status]);

  function changeFilter(next: AdminShopStatus) {
    setLoading(true);
    setError(null);
    setShops([]);
    setStatus(next);
  }

  function reload() {
    setLoading(true);
    setError(null);
    setShops([]);
    setReloadKey((value) => value + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Shop status filters">
        {statuses.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={status === item ? "primary" : "secondary"}
            onClick={() => changeFilter(item)}
          >
            {titleCase(item)}
          </Button>
        ))}
      </div>

      {loading ? <LoadingState title="Loading shops" description="Fetching platform shops and plans." /> : null}
      {!loading && error ? <ErrorState title="Unable to load shops" description={error} /> : null}
      {!loading && !error && shops.length === 0 ? (
        <EmptyState title={"No " + titleCase(status).toLowerCase() + " shops"} description="There are no shops in this lifecycle state." />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              plans={plans}
              businessCategories={businessCategories}
              onChanged={reload}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
