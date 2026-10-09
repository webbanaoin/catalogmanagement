"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminApiError,
  getAdminReferralCommissions,
  getAdminReferralOverview,
  getAdminReferralPartners,
  getAdminReferralSettings,
  settleAdminReferralCommission,
  updateAdminReferralPartnerStatus,
  updateAdminReferralSettings,
  type AdminPaymentMethod,
  type AdminReferralCommission,
  type AdminReferralCommissionMode,
  type AdminReferralCommissionStatus,
  type AdminReferralOverview,
  type AdminReferralPartner,
  type AdminReferralSettings,
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

const payoutMethods: AdminPaymentMethod[] = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
];

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadge(status: string) {
  if (status === "ACTIVE" || status === "PAID") return "success" as const;
  if (status === "PENDING" || status === "EARNED") return "warning" as const;
  if (status === "SUSPENDED") return "warning" as const;
  if (status === "REJECTED" || status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AdminReferralManager() {
  const [overview, setOverview] = useState<AdminReferralOverview | null>(null);
  const [settings, setSettings] = useState<AdminReferralSettings | null>(null);
  const [partners, setPartners] = useState<AdminReferralPartner[]>([]);
  const [commissions, setCommissions] = useState<AdminReferralCommission[]>([]);
  const [commissionStatus, setCommissionStatus] = useState<
    AdminReferralCommissionStatus | ""
  >("EARNED");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [settingsMode, setSettingsMode] =
    useState<AdminReferralCommissionMode>("FIRST_PAID_SUBSCRIPTION");
  const [monthlyCommission, setMonthlyCommission] = useState("0");
  const [yearlyCommission, setYearlyCommission] = useState("0");

  useEffect(() => {
    let active = true;

    Promise.all([
      getAdminReferralOverview(),
      getAdminReferralSettings(),
      getAdminReferralPartners(),
      getAdminReferralCommissions({
        status: commissionStatus || undefined,
        partnerId: partnerFilter || undefined,
        pageSize: 100,
      }),
    ])
      .then(([overviewResponse, settingsResponse, partnerResponse, commissionResponse]) => {
        if (!active) return;
        setOverview(overviewResponse.data);
        setSettings(settingsResponse.data);
        setPartners(partnerResponse.items);
        setCommissions(commissionResponse.items);
        setSettingsEnabled(settingsResponse.data.isEnabled);
        setSettingsMode(settingsResponse.data.commissionMode);
        setMonthlyCommission(settingsResponse.data.monthlyCommission);
        setYearlyCommission(settingsResponse.data.yearlyCommission);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load referral management.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey, commissionStatus, partnerFilter]);

  const activePartners = useMemo(
    () => partners.filter((partner) => partner.status === "ACTIVE"),
    [partners],
  );

  function reload(successMessage?: string) {
    setLoading(true);
    setError(null);
    if (successMessage) setMessage(successMessage);
    setReloadKey((value) => value + 1);
  }

  async function saveSettings() {
    const monthly = Number(monthlyCommission);
    const yearly = Number(yearlyCommission);
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) {
      setMessage("Commission amounts must be zero or positive.");
      return;
    }

    setWorking("settings");
    setMessage(null);
    try {
      await updateAdminReferralSettings({
        isEnabled: settingsEnabled,
        commissionMode: settingsMode,
        monthlyCommission: monthly,
        yearlyCommission: yearly,
      });
      reload("Referral commission settings saved.");
    } catch (saveError) {
      setMessage(
        saveError instanceof AdminApiError
          ? saveError.message
          : "Unable to save referral settings.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function changePartnerStatus(
    partner: AdminReferralPartner,
    next: "ACTIVE" | "SUSPENDED" | "REJECTED",
  ) {
    const labels: Record<typeof next, string> = {
      ACTIVE: partner.status === "PENDING" ? "approve" : "reactivate",
      SUSPENDED: "suspend",
      REJECTED: "reject",
    };
    const verb = labels[next];

    if (
      !window.confirm(
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${partner.user.name}?`,
      )
    ) {
      return;
    }

    setWorking("partner:" + partner.id);
    setMessage(null);
    try {
      await updateAdminReferralPartnerStatus(partner.id, next);
      reload(
        next === "ACTIVE"
          ? `${partner.user.name} is active. Referral code is ready.`
          : `${partner.user.name} status updated to ${titleCase(next)}.`,
      );
    } catch (statusError) {
      setMessage(
        statusError instanceof AdminApiError
          ? statusError.message
          : "Unable to update partner status.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function payCommission(commission: AdminReferralCommission) {
    const method = (
      document.getElementById(
        "payout-method-" + commission.id,
      ) as HTMLSelectElement | null
    )?.value as AdminPaymentMethod | undefined;
    const reference = (
      document.getElementById(
        "payout-reference-" + commission.id,
      ) as HTMLInputElement | null
    )?.value;
    const comment = (
      document.getElementById(
        "payout-comment-" + commission.id,
      ) as HTMLInputElement | null
    )?.value;

    if (!method) {
      setMessage("Select payout method before marking commission paid.");
      return;
    }

    if (
      !window.confirm(
        `Mark ${money(commission.commissionAmount)} commission for ${commission.partnerNameSnapshot} as paid?`,
      )
    ) {
      return;
    }

    setWorking("commission:" + commission.id);
    setMessage(null);
    try {
      await settleAdminReferralCommission(commission.id, {
        action: "PAY",
        payoutMethod: method,
        reference: reference?.trim() || null,
        comment: comment?.trim() || null,
      });
      reload("Commission marked as paid.");
    } catch (settleError) {
      setMessage(
        settleError instanceof AdminApiError
          ? settleError.message
          : "Unable to mark commission paid.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function cancelCommission(commission: AdminReferralCommission) {
    const reason = window.prompt(
      "Reason for cancelling this pending commission:",
    );
    if (!reason?.trim()) return;

    setWorking("commission:" + commission.id);
    setMessage(null);
    try {
      await settleAdminReferralCommission(commission.id, {
        action: "CANCEL",
        comment: reason.trim(),
      });
      reload("Commission cancelled with audit history preserved.");
    } catch (settleError) {
      setMessage(
        settleError instanceof AdminApiError
          ? settleError.message
          : "Unable to cancel commission.",
      );
    } finally {
      setWorking(null);
    }
  }

  if (loading && !overview) {
    return <LoadingState title="Loading referrals and commissions" />;
  }

  if (error && !overview) {
    return <ErrorState title="Unable to load referrals" description={error} />;
  }

  return (
    <div className="space-y-8">
      {message ? <Alert title="Referral management">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {overview ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Financial overview</h2>
            <p className="mt-1 text-sm text-muted">
              Gross collections, referral liability and Webbanao net revenue.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Total customer collection"
              value={money(overview.revenue.totalCollections)}
            />
            <Metric
              label="Commission earned"
              value={money(overview.revenue.commissionEarned)}
              hint="Paid + pending referral liability"
            />
            <Metric
              label="Commission pending"
              value={money(overview.revenue.commissionPending)}
            />
            <Metric
              label="Commission paid"
              value={money(overview.revenue.commissionPaid)}
            />
            <Metric
              label="Net revenue after commission"
              value={money(overview.revenue.netRevenueAfterCommission)}
              hint="Collection minus all earned commission"
            />
            <Metric
              label="Realized net cash"
              value={money(overview.revenue.realizedNetCash)}
              hint="Collection minus commission actually paid"
            />
            <Metric
              label="Referred shops"
              value={String(overview.counts.referredShops)}
              hint={`${overview.counts.paidReferredShops} have payment history`}
            />
            <Metric
              label="Marketing partners"
              value={String(overview.counts.activePartners)}
              hint={`${overview.counts.pendingPartners} pending approval`}
            />
          </div>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Commission settings</CardTitle>
          <CardDescription>
            Amounts are admin-managed. Historical commission records keep the rate
            that was active when the shop payment was recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-foreground">
              Monthly commission
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                type="number"
                min="0"
                step="0.01"
                value={monthlyCommission}
                onChange={(event) => setMonthlyCommission(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Yearly commission
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                type="number"
                min="0"
                step="0.01"
                value={yearlyCommission}
                onChange={(event) => setYearlyCommission(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Eligibility rule
              <select
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                value={settingsMode}
                onChange={(event) =>
                  setSettingsMode(
                    event.target.value as AdminReferralCommissionMode,
                  )
                }
              >
                <option value="FIRST_PAID_SUBSCRIPTION">
                  First paid subscription only
                </option>
                <option value="EVERY_ELIGIBLE_PAYMENT">
                  Every eligible payment / renewal
                </option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={settingsEnabled}
                onChange={(event) => setSettingsEnabled(event.target.checked)}
              />
              Commission program enabled
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void saveSettings()}
              disabled={working === "settings"}
            >
              {working === "settings" ? "Saving…" : "Save commission settings"}
            </Button>
            {settings?.updatedAt ? (
              <span className="text-xs text-muted">
                Last updated {date(settings.updatedAt)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Marketing partners</h2>
          <p className="mt-1 text-sm text-muted">
            Approve registrations, manage access and review partner-wise shops,
            collections, commission and Webbanao net revenue.
          </p>
        </div>

        {partners.length === 0 ? (
          <EmptyState title="No marketing partner registrations yet" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {partners.map((partner) => (
              <Card key={partner.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{partner.user.name}</CardTitle>
                      <CardDescription>
                        {partner.user.email}
                        {partner.user.mobile ? " · " + partner.user.mobile : ""}
                      </CardDescription>
                    </div>
                    <Badge variant={statusBadge(partner.status)}>
                      {titleCase(partner.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {partner.referralCode ? (
                      <Badge variant="info">{partner.referralCode}</Badge>
                    ) : (
                      <Badge variant="neutral">Code after approval</Badge>
                    )}
                    {partner.city ? <Badge>{partner.city}</Badge> : null}
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <dt className="text-muted">Shops referred</dt>
                      <dd className="mt-1 font-semibold">{partner.shopCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Paid shops</dt>
                      <dd className="mt-1 font-semibold">{partner.paidShopCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Customer collection</dt>
                      <dd className="mt-1 font-semibold">
                        {money(partner.financials.totalCollections)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Commission earned</dt>
                      <dd className="mt-1 font-semibold">
                        {money(partner.financials.commissionEarned)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Paid / Pending</dt>
                      <dd className="mt-1 font-semibold">
                        {money(partner.financials.commissionPaid)} /{" "}
                        {money(partner.financials.commissionPending)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Webbanao net</dt>
                      <dd className="mt-1 font-semibold">
                        {money(partner.financials.netRevenue)}
                      </dd>
                    </div>
                  </dl>

                  {partner.marketingArea ? (
                    <p className="text-sm text-muted">
                      Marketing area: {partner.marketingArea}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {partner.status === "PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={working === "partner:" + partner.id}
                          onClick={() => void changePartnerStatus(partner, "ACTIVE")}
                        >
                          Approve & generate code
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={working === "partner:" + partner.id}
                          onClick={() => void changePartnerStatus(partner, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {partner.status === "ACTIVE" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={working === "partner:" + partner.id}
                          onClick={() => void changePartnerStatus(partner, "SUSPENDED")}
                        >
                          Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={working === "partner:" + partner.id}
                          onClick={() => void changePartnerStatus(partner, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {partner.status === "SUSPENDED" ||
                    partner.status === "REJECTED" ? (
                      <Button
                        size="sm"
                        disabled={working === "partner:" + partner.id}
                        onClick={() => void changePartnerStatus(partner, "ACTIVE")}
                      >
                        Reactivate
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPartnerFilter(partner.id);
                        setCommissionStatus("");
                      }}
                    >
                      View commission history
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Commission & payout ledger
            </h2>
            <p className="mt-1 text-sm text-muted">
              Pending, paid and cancelled commission remains auditable against the
              original shop payment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
              value={commissionStatus}
              onChange={(event) => {
                setLoading(true);
                setCommissionStatus(
                  event.target.value as AdminReferralCommissionStatus | "",
                );
              }}
            >
              <option value="">All statuses</option>
              <option value="EARNED">Pending payout</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
              value={partnerFilter}
              onChange={(event) => {
                setLoading(true);
                setPartnerFilter(event.target.value);
              }}
            >
              <option value="">All partners</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.user.name}
                  {partner.referralCode ? " · " + partner.referralCode : ""}
                </option>
              ))}
            </select>
            {partnerFilter ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setLoading(true);
                  setPartnerFilter("");
                }}
              >
                Clear partner
              </Button>
            ) : null}
          </div>
        </div>

        {commissions.length === 0 ? (
          <EmptyState title="No commission records for this filter" />
        ) : (
          <div className="space-y-3">
            {commissions.map((commission) => (
              <Card key={commission.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-foreground">
                          {commission.partnerNameSnapshot}
                        </p>
                        <Badge variant="info">
                          {commission.partnerCodeSnapshot}
                        </Badge>
                        <Badge variant={statusBadge(commission.status)}>
                          {commission.status === "EARNED"
                            ? "Pending payout"
                            : titleCase(commission.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {commission.shopNameSnapshot} ·{" "}
                        {titleCase(commission.billingCycle)} ·{" "}
                        {commission.planNameSnapshot}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Customer paid {money(commission.paymentAmountSnapshot)} ·
                        Earned {date(commission.earnedAt)}
                      </p>
                    </div>

                    <div className="text-left xl:text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">
                        Commission
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {money(commission.commissionAmount)}
                      </p>
                    </div>
                  </div>

                  {commission.status === "EARNED" ? (
                    <div className="mt-4 grid gap-2 border-t border-border pt-4 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                      <select
                        id={"payout-method-" + commission.id}
                        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
                        defaultValue="UPI"
                      >
                        {payoutMethods.map((method) => (
                          <option key={method} value={method}>
                            {titleCase(method)}
                          </option>
                        ))}
                      </select>
                      <input
                        id={"payout-reference-" + commission.id}
                        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
                        placeholder="UTR / reference (optional)"
                        maxLength={191}
                      />
                      <input
                        id={"payout-comment-" + commission.id}
                        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
                        placeholder="Payout comment (optional)"
                        maxLength={500}
                      />
                      <Button
                        disabled={working === "commission:" + commission.id}
                        onClick={() => void payCommission(commission)}
                      >
                        Mark paid
                      </Button>
                      <Button
                        variant="danger"
                        disabled={working === "commission:" + commission.id}
                        onClick={() => void cancelCommission(commission)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : commission.status === "PAID" ? (
                    <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
                      Paid {date(commission.paidAt)}
                      {commission.payoutMethod
                        ? " via " + titleCase(commission.payoutMethod)
                        : ""}
                      {commission.payoutReference
                        ? " · Ref " + commission.payoutReference
                        : ""}
                      {commission.paidByUser
                        ? " · Recorded by " + commission.paidByUser.name
                        : ""}
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
                      Cancelled {date(commission.cancelledAt)}
                      {commission.cancelComment
                        ? " · " + commission.cancelComment
                        : ""}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
