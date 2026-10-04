"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import {
  CatalogApiError,
  getCurrentMerchantShop,
  getShopSubscription,
  type MerchantShop,
  type MerchantSubscription,
} from "@/lib/catalog-api";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function statusVariant(status: MerchantSubscription["status"]) {
  if (status === "ACTIVE" || status === "TRIAL") return "success" as const;
  if (status === "GRACE") return "warning" as const;
  return "danger" as const;
}

export default function SubscriptionPage() {
  const [shop, setShop] = useState<MerchantShop | null>(null);
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentShop = await getCurrentMerchantShop();
        const response = await getShopSubscription(currentShop.id);
        if (!active) return;
        setShop(currentShop);
        setSubscription(response.data);
      } catch (error) {
        if (!active) return;
        setFeedback(
          error instanceof CatalogApiError
            ? error.message
            : "Unable to load subscription details.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <LoadingState
        title="Loading subscription"
        description="Checking the current plan, limits and usage for your shop."
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Subscription"
        description="Review your current plan, validity, catalogue limits and enabled features."
        actions={
          subscription ? (
            <Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge>
          ) : null
        }
      />

      {feedback ? <Alert variant="error">{feedback}</Alert> : null}

      {!subscription ? (
        <EmptyState
          title="No subscription assigned"
          description="Your shop does not currently have a subscription. Contact the platform administrator to activate or assign a plan."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{subscription.plan.name}</CardTitle>
                  <CardDescription>
                    {subscription.plan.description ?? "Current Digital Showroom plan"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge>
                  <Badge variant="info">Payment: {subscription.paymentStatus.replaceAll("_", " ")}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted">Shop</dt>
                  <dd className="mt-1 font-medium text-foreground">{shop?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Start date</dt>
                  <dd className="mt-1 font-medium text-foreground">{formatDate(subscription.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Valid until</dt>
                  <dd className="mt-1 font-medium text-foreground">{formatDate(subscription.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Grace until</dt>
                  <dd className="mt-1 font-medium text-foreground">{formatDate(subscription.graceEndsAt)}</dd>
                </div>
              </dl>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Products used</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {subscription.usage.products ?? 0} / {subscription.plan.productLimit}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Images / product</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{subscription.plan.imageLimitPerProduct}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monthly price</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">₹{subscription.plan.monthlyPrice}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Annual price</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">₹{subscription.plan.annualPrice}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Included features</CardTitle>
              <CardDescription>These feature flags are enforced by the server for this shop.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Analytics</p>
                <Badge className="mt-2" variant={subscription.plan.analyticsEnabled ? "success" : "neutral"}>
                  {subscription.plan.analyticsEnabled ? "Included" : "Not included"}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Excel import / export</p>
                <Badge className="mt-2" variant={subscription.plan.excelImportEnabled ? "success" : "neutral"}>
                  {subscription.plan.excelImportEnabled ? "Included" : "Not included"}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">Custom branding</p>
                <Badge className="mt-2" variant={subscription.plan.customBrandingEnabled ? "success" : "neutral"}>
                  {subscription.plan.customBrandingEnabled ? "Included" : "Not included"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Alert title="Renewal management">
            Sprint 6 includes subscription visibility, plan limits and server-side enforcement. Plan changes, extensions and payment-status updates are controlled by the platform administrator; an online payment gateway is not part of this release.
          </Alert>
        </>
      )}
    </div>
  );
}
