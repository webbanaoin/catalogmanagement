"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdminPaymentAnalyticsDashboard } from "@/components/admin/admin-payment-analytics-dashboard";
import { AdminPaymentSubmissionQueue } from "@/components/admin/admin-payment-submission-queue";
import {
  AdminApiError,
  getAdminPaymentAnalytics,
  getAdminPayments,
  getAdminShops,
  recordAdminPayment,
  type AdminBillingCycle,
  type AdminPaymentAnalytics,
  type AdminPaymentMethod,
  type AdminPaymentRecord,
  type AdminPaymentSummary,
  type AdminShop,
  type AdminShopStatus,
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
  Input,
  LoadingState,
  PaginationControls,
  Select,
  Textarea,
} from "@/components/ui";
import {
  billingCycleExtensionDays,
  isPaidBillingCycle,
  planPriceForCycle,
} from "@/lib/subscription-cycles";

type HistoryRange =
  | "ALL"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

const shopStatuses: AdminShopStatus[] = ["APPROVED", "ACTIVE", "SUSPENDED"];

const methods: Array<{ value: AdminPaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

const cycles: Array<{
  value: AdminBillingCycle;
  label: string;
  defaultDays: number | null;
}> = [
  { value: "WEEKLY", label: "Weekly", defaultDays: 7 },
  {
    value: "MONTHLY",
    label: "Monthly",
    defaultDays: billingCycleExtensionDays("MONTHLY"),
  },
  {
    value: "QUARTERLY",
    label: "Quarterly",
    defaultDays: billingCycleExtensionDays("QUARTERLY"),
  },
  {
    value: "HALF_YEARLY",
    label: "Half-yearly",
    defaultDays: billingCycleExtensionDays("HALF_YEARLY"),
  },
  {
    value: "YEARLY",
    label: "Yearly",
    defaultDays: billingCycleExtensionDays("YEARLY"),
  },
  { value: "CUSTOM", label: "Custom", defaultDays: null },
];

const emptySummary: AdminPaymentSummary = {
  count: 0,
  amount: "0",
  currency: "INR",
  byMethod: {
    CASH: { count: 0, amount: "0" },
    UPI: { count: 0, amount: "0" },
    BANK_TRANSFER: { count: 0, amount: "0" },
    OTHER: { count: 0, amount: "0" },
  },
};

function localDateTimeInput() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function localDateInput(value = new Date()) {
  const copy = new Date(value);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function formatMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function methodLabel(value: AdminPaymentMethod) {
  return methods.find((item) => item.value === value)?.label ?? value;
}

function cycleLabel(value: AdminBillingCycle) {
  return cycles.find((item) => item.value === value)?.label ?? value;
}

function historyDates(
  range: HistoryRange,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  if (range === "ALL") return {};

  const now = new Date();
  let from: Date | null = null;
  let to: Date = now;

  if (range === "THIS_WEEK") {
    from = new Date(now);
    const weekday = from.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    from.setDate(from.getDate() + mondayOffset);
    from.setHours(0, 0, 0, 0);
  } else if (range === "THIS_MONTH") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === "THIS_QUARTER") {
    const month = Math.floor(now.getMonth() / 3) * 3;
    from = new Date(now.getFullYear(), month, 1);
  } else if (range === "THIS_YEAR") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (range === "CUSTOM") {
    from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    if (customTo) {
      to = new Date(`${customTo}T23:59:59.999`);
    }
  }

  return {
    ...(from && !Number.isNaN(from.getTime())
      ? { from: from.toISOString() }
      : {}),
    ...(!Number.isNaN(to.getTime()) ? { to: to.toISOString() } : {}),
  };
}

export function AdminPaymentManager() {
  const paymentFormRef = useRef<HTMLDivElement | null>(null);

  const [shops, setShops] = useState<AdminShop[]>([]);
  const [analytics, setAnalytics] = useState<AdminPaymentAnalytics | null>(null);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [summary, setSummary] = useState<AdminPaymentSummary>(emptySummary);

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });

  const [filterShopId, setFilterShopId] = useState("");
  const [filterMethod, setFilterMethod] = useState<AdminPaymentMethod | "">("");
  const [filterCycle, setFilterCycle] = useState<AdminBillingCycle | "">("");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("THIS_MONTH");
  const [customFrom, setCustomFrom] = useState(localDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(localDateInput());

  const [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<AdminPaymentMethod>("UPI");
  const [billingCycle, setBillingCycle] =
    useState<AdminBillingCycle>("MONTHLY");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [receivedAt, setReceivedAt] = useState(localDateTimeInput);
  const [extendDays, setExtendDays] = useState("30");
  const [activateSubscription, setActivateSubscription] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      ...shopStatuses.map((status) => getAdminShops(status)),
      getAdminPaymentAnalytics(),
    ])
      .then((responses) => {
        if (!active) return;

        const shopResponses = responses.slice(
          0,
          shopStatuses.length,
        ) as Awaited<ReturnType<typeof getAdminShops>>[];
        const analyticsResponse = responses[
          shopStatuses.length
        ] as Awaited<ReturnType<typeof getAdminPaymentAnalytics>>;

        const values = shopResponses.flatMap((response) => response.items);
        const unique = Array.from(
          new Map(values.map((item) => [item.id, item])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name));

        setShops(unique);
        setShopId((current) => current || unique[0]?.id || "");
        setAmount((current) => {
          if (current || !unique[0]?.subscription) return current;
          return String(
            planPriceForCycle(unique[0].subscription, "MONTHLY"),
          );
        });
        setAnalytics(analyticsResponse.data);
        setAnalyticsError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setAnalyticsError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load payment analytics.",
        );
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;

    const dates = historyDates(historyRange, customFrom, customTo);

    getAdminPayments({
      ...(filterShopId ? { shopId: filterShopId } : {}),
      ...(filterMethod ? { method: filterMethod } : {}),
      ...(filterCycle ? { billingCycle: filterCycle } : {}),
      ...dates,
      page: historyPage,
      pageSize: 25,
    })
      .then((response) => {
        if (!active) return;
        setPayments(response.items);
        setSummary(response.summary);
        setHistoryPagination(response.pagination);
        setHistoryError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setHistoryError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load payment history.",
        );
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    customFrom,
    customTo,
    filterCycle,
    filterMethod,
    filterShopId,
    historyPage,
    historyRange,
    reloadKey,
  ]);

  const selectedShop = useMemo(
    () => shops.find((item) => item.id === shopId) ?? null,
    [shopId, shops],
  );

  function applyConfiguredPrice(shop: AdminShop | null, cycle: AdminBillingCycle) {
    if (!shop?.subscription || !isPaidBillingCycle(cycle)) return;
    setAmount(String(planPriceForCycle(shop.subscription, cycle)));
  }

  function changeBillingCycle(next: AdminBillingCycle) {
    setBillingCycle(next);
    const defaultDays = cycles.find((item) => item.value === next)?.defaultDays;
    if (defaultDays !== null && defaultDays !== undefined) {
      setExtendDays(String(defaultDays));
    }
    applyConfiguredPrice(selectedShop, next);
  }

  function changeShop(nextShopId: string) {
    setShopId(nextShopId);
    const nextShop = shops.find((item) => item.id === nextShopId) ?? null;
    applyConfiguredPrice(nextShop, billingCycle);
  }

  function focusPaymentForm(targetShopId: string) {
    setShopId(targetShopId);
    const targetShop = shops.find((item) => item.id === targetShopId) ?? null;
    applyConfiguredPrice(targetShop, billingCycle);
    setMessage(null);
    setFormError(null);
    paymentFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetHistoryFilters() {
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryPage(1);
    setFilterShopId("");
    setFilterMethod("");
    setFilterCycle("");
    setHistoryRange("THIS_MONTH");
    setCustomFrom(
      localDateInput(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      ),
    );
    setCustomTo(localDateInput());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setFormError(null);

    try {
      await recordAdminPayment({
        shopId,
        amount: Number(amount),
        method,
        billingCycle,
        reference: reference.trim() || null,
        comment: comment.trim() || null,
        receivedAt: new Date(receivedAt).toISOString(),
        extendDays: Number(extendDays || "0"),
        activateSubscription,
      });

      setAmount("");
      setReference("");
      setComment("");
      setReceivedAt(localDateTimeInput());
      setMessage(
        "Payment recorded successfully. Revenue analytics, history and subscription validity were updated.",
      );
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      setHistoryLoading(true);
      setHistoryError(null);
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      setFormError(
        saveError instanceof AdminApiError
          ? saveError.message
          : "Unable to record payment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {analyticsLoading ? (
        <LoadingState
          title="Loading payment intelligence"
          description="Calculating revenue, renewal pipeline and subscription health."
        />
      ) : null}

      {!analyticsLoading && analyticsError ? (
        <ErrorState
          title="Unable to load payment analytics"
          description={analyticsError}
        />
      ) : null}

      {!analyticsLoading && analytics ? (
        <AdminPaymentAnalyticsDashboard
          analytics={analytics}
          onRecordPayment={focusPaymentForm}
        />
      ) : null}

      <AdminPaymentSubmissionQueue
        onOfficialPaymentChanged={() => {
          setAnalyticsLoading(true);
          setHistoryLoading(true);
          setReloadKey((value) => value + 1);
        }}
      />

      <div ref={paymentFormRef} className="scroll-mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Record shop payment</CardTitle>
            <CardDescription>
              Record actual received money with billing cycle, method, reference
              and notes. Renewal time is added after the shop&apos;s current
              validity when it is still active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm font-medium text-foreground">
                  Shop
                  <Select
                    className="mt-1"
                    value={shopId}
                    onChange={(event) => changeShop(event.target.value)}
                    required
                  >
                    {shops.length === 0 ? (
                      <option value="">No eligible shops</option>
                    ) : null}
                    {shops.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Amount received (₹)
                  <Input
                    className="mt-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-foreground">
                  Payment method
                  <Select
                    className="mt-1"
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as AdminPaymentMethod)
                    }
                  >
                    {methods.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Billing cycle
                  <Select
                    className="mt-1"
                    value={billingCycle}
                    onChange={(event) =>
                      changeBillingCycle(
                        event.target.value as AdminBillingCycle,
                      )
                    }
                  >
                    {cycles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Payment date
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={receivedAt}
                    onChange={(event) => setReceivedAt(event.target.value)}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-foreground">
                  Renewal / extension days
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    max="3660"
                    value={extendDays}
                    onChange={(event) => setExtendDays(event.target.value)}
                  />
                  <span className="mt-1 block text-xs font-normal text-muted">
                    Cycle provides a default; you can adjust the exact days.
                  </span>
                </label>

                <label className="text-sm font-medium text-foreground sm:col-span-2">
                  Reference / transaction ID
                  <Input
                    className="mt-1"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="UPI ref, bank ref, receipt number, etc."
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-foreground">
                Comment / payment note
                <Textarea
                  className="mt-1"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Example: Quarterly renewal received from owner. Mention discounts, adjustments, cash receipt details or other context."
                  required={method === "OTHER"}
                />
              </label>

              {selectedShop ? (
                <div className="rounded-xl border border-border bg-surface-muted/40 p-4 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedShop.name}
                      </p>
                      <p className="mt-1 text-muted">
                        {selectedShop.subscription
                          ? `${selectedShop.subscription.planName} · ${selectedShop.subscription.status} · payment ${selectedShop.subscription.paymentStatus}`
                          : "No subscription assigned"}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted">
                        Current validity
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedShop.subscription
                          ? formatDate(selectedShop.subscription.endDate)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={activateSubscription}
                  onChange={(event) =>
                    setActivateSubscription(event.target.checked)
                  }
                />
                Mark subscription Active after payment
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !shopId ||
                    !amount ||
                    !selectedShop?.subscription ||
                    (method === "OTHER" && !comment.trim())
                  }
                >
                  {saving
                    ? "Saving payment…"
                    : activateSubscription
                      ? "Save Payment & Activate"
                      : "Save Payment"}
                </Button>
                <p className="text-xs text-muted">
                  Payment rows are append-only. Historical money records are not
                  overwritten by later renewals.
                </p>
              </div>
            </form>

            {message ? (
              <div className="mt-4">
                <Alert title="Payment saved">{message}</Alert>
              </div>
            ) : null}
            {formError ? (
              <div className="mt-4">
                <ErrorState
                  title="Payment action failed"
                  description={formError}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Payment history & reporting</CardTitle>
              <CardDescription>
                Filter actual payment history by shop, method, billing cycle and
                reporting period.
              </CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={resetHistoryFilters}>
              Reset filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-foreground">
              Shop
              <Select
                className="mt-1"
                value={filterShopId}
                onChange={(event) => {
                  setHistoryLoading(true);
                  setHistoryPage(1);
                  setFilterShopId(event.target.value);
                }}
              >
                <option value="">All shops</option>
                {shops.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm font-medium text-foreground">
              Payment method
              <Select
                className="mt-1"
                value={filterMethod}
                onChange={(event) => {
                  setHistoryLoading(true);
                  setHistoryPage(1);
                  setFilterMethod(
                    event.target.value as AdminPaymentMethod | "",
                  );
                }}
              >
                <option value="">All methods</option>
                {methods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm font-medium text-foreground">
              Billing cycle
              <Select
                className="mt-1"
                value={filterCycle}
                onChange={(event) => {
                  setHistoryLoading(true);
                  setHistoryPage(1);
                  setFilterCycle(
                    event.target.value as AdminBillingCycle | "",
                  );
                }}
              >
                <option value="">All cycles</option>
                {cycles.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="text-sm font-medium text-foreground">
              Reporting period
              <Select
                className="mt-1"
                value={historyRange}
                onChange={(event) => {
                  setHistoryLoading(true);
                  setHistoryPage(1);
                  setHistoryRange(event.target.value as HistoryRange);
                }}
              >
                <option value="ALL">All time</option>
                <option value="THIS_WEEK">This week</option>
                <option value="THIS_MONTH">This month</option>
                <option value="THIS_QUARTER">This quarter</option>
                <option value="THIS_YEAR">This year</option>
                <option value="CUSTOM">Custom dates</option>
              </Select>
            </label>
          </div>

          {historyRange === "CUSTOM" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                From date
                <Input
                  className="mt-1"
                  type="date"
                  value={customFrom}
                  onChange={(event) => {
                    setHistoryLoading(true);
                    setHistoryPage(1);
                    setCustomFrom(event.target.value);
                  }}
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                To date
                <Input
                  className="mt-1"
                  type="date"
                  value={customTo}
                  onChange={(event) => {
                    setHistoryLoading(true);
                    setHistoryPage(1);
                    setCustomTo(event.target.value);
                  }}
                />
              </label>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Filtered collection
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatMoney(summary.amount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Payment records
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {summary.count}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Cash
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatMoney(summary.byMethod.CASH.amount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                UPI
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatMoney(summary.byMethod.UPI.amount)}
              </p>
            </div>
          </div>

          {historyLoading ? (
            <LoadingState title="Loading payment history" />
          ) : null}

          {!historyLoading && historyError ? (
            <ErrorState
              title="Unable to load payment history"
              description={historyError}
            />
          ) : null}

          {!historyLoading && !historyError && payments.length === 0 ? (
            <EmptyState
              title="No matching payments"
              description="Change the filters or record a shop payment."
            />
          ) : null}

          {!historyLoading && !historyError && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {formatMoney(payment.amount)}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {payment.shop.name}
                      </p>
                      <p className="text-xs text-muted">
                        {payment.planName} · {formatDateTime(payment.receivedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info">
                        {methodLabel(payment.method)}
                      </Badge>
                      <Badge variant="neutral">
                        {cycleLabel(payment.billingCycle)}
                      </Badge>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <dt className="text-muted">Reference</dt>
                      <dd className="mt-1 break-all text-foreground">
                        {payment.reference || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Extension</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.extendDays > 0
                          ? `${payment.extendDays} days`
                          : "No expiry change"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Service period</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.periodStartDate || payment.periodEndDate
                          ? `${formatDate(payment.periodStartDate)} – ${formatDate(payment.periodEndDate)}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Previous validity</dt>
                      <dd className="mt-1 text-foreground">
                        {formatDate(payment.previousEndDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">New validity</dt>
                      <dd className="mt-1 text-foreground">
                        {formatDate(payment.newEndDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Recorded by</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.recordedBy?.name ?? "Former administrator"}
                      </dd>
                    </div>
                  </dl>

                  {payment.comment ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        Comment
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                        {payment.comment}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <PaginationControls
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            total={historyPagination.total}
            pageSize={historyPagination.pageSize}
            itemLabel="official payments"
            onPageChange={(page) => {
              setHistoryLoading(true);
              setHistoryPage(page);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
