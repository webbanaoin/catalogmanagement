"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AdminApiError,
  assignAdminShopBusinessCategory,
  assignAdminShopReferral,
  getAdminBusinessCategories,
  getAdminReferralPartners,
  getAdminPlans,
  getAdminShops,
  getAdminSubscription,
  updateAdminShopStatus,
  updateAdminSubscription,
  type AdminBusinessCategory,
  type AdminPlan,
  type AdminReferralPartner,
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
      const payload: Parameters<typeof updateAdminSubscription>[1] = {};
      if (planId !== subscription.plan.id) payload.planId = planId;
      if (status !== subscription.storedStatus) payload.status = status;
      if (paymentStatus !== subscription.paymentStatus) {
        payload.paymentStatus = paymentStatus;
      }
      if (extendDays) payload.extendDays = Number(extendDays);

      if (Object.keys(payload).length === 0) {
        setMessage("No subscription changes to save.");
        return;
      }

      const response = await updateAdminSubscription(shop.id, payload);
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
                    {["NOT_REQUIRED", "PENDING", "WAIVED"].map((value) => (
                      <option key={value} value={value}>{titleCase(value)}</option>
                    ))}
                    <option value="PAID" disabled>
                      Paid (record through Payments)
                    </option>
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

function ShopCard({
  shop,
  plans,
  businessCategories,
  referralPartners,
  onChanged,
}: {
  shop: AdminShop;
  plans: AdminPlan[];
  businessCategories: AdminBusinessCategory[];
  referralPartners: AdminReferralPartner[];
  onChanged: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [businessCategoryId, setBusinessCategoryId] = useState(
    shop.businessCategory?.id ?? "",
  );
  const [referralPartnerId, setReferralPartnerId] = useState(
    shop.referralPartner?.id ?? "",
  );
  const owner = shop.owners[0];
  const location = [shop.city, shop.state].filter(Boolean).join(", ");

  async function saveReferralPartner() {
    setWorking(true);
    setMessage(null);
    try {
      await assignAdminShopReferral(
        shop.id,
        referralPartnerId || null,
      );
      setMessage(
        referralPartnerId
          ? "Referral partner assigned."
          : "Referral attribution removed.",
      );
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to update referral attribution.",
      );
    } finally {
      setWorking(false);
    }
  }

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Referred / onboarded by
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {shop.referralPartner?.user.name ?? "Direct / No referral"}
                </span>
                {shop.referralPartner?.referralCode ? (
                  <Badge variant="info">
                    {shop.referralPartner.referralCode}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {shop.referralAssignedAt
                  ? `Assigned ${formatDate(shop.referralAssignedAt)}. Attribution locks after the first earned commission.`
                  : "Assign an approved marketing partner before the first eligible paid subscription."}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <select
                className="h-10 min-w-60 rounded-lg border border-border bg-surface px-3 text-sm"
                value={referralPartnerId}
                onChange={(event) => setReferralPartnerId(event.target.value)}
                disabled={working}
              >
                <option value="">Direct / No referral</option>
                {referralPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.user.name}
                    {partner.referralCode ? ` · ${partner.referralCode}` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={
                  working ||
                  referralPartnerId === (shop.referralPartner?.id ?? "")
                }
                onClick={() => void saveReferralPartner()}
              >
                Save referral
              </Button>
            </div>
          </div>
        </div>

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

        <div className="flex flex-wrap gap-2">
          {["PENDING", "APPROVED", "ACTIVE"].includes(shop.status) ? (
            <Link
              href={`/admin/shops/${shop.id}/onboarding`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-primary-soft hover:text-primary"
            >
              Onboard products
            </Link>
          ) : null}

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

        {message ? <Alert title="Status update">{message}</Alert> : null}
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
  const [referralPartners, setReferralPartners] = useState<
    AdminReferralPartner[]
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
      getAdminReferralPartners("ACTIVE"),
    ])
      .then(([
        shopResponse,
        planResponse,
        businessCategoryResponse,
        referralPartnerResponse,
      ]) => {
        if (!active) return;
        setShops(shopResponse.items);
        setPlans(planResponse.items);
        setBusinessCategories(businessCategoryResponse.items);
        setReferralPartners(referralPartnerResponse.items);
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
              referralPartners={referralPartners}
              onChanged={reload}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
