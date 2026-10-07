"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminApiError,
  getAdminPayments,
  getAdminShops,
  recordAdminPayment,
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
  Select,
  Textarea,
} from "@/components/ui";

const shopStatuses: AdminShopStatus[] = ["APPROVED", "ACTIVE", "SUSPENDED"];
const methods: Array<{ value: AdminPaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
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

export function AdminPaymentManager() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [summary, setSummary] = useState<AdminPaymentSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filterShopId, setFilterShopId] = useState("");
  const [filterMethod, setFilterMethod] = useState<AdminPaymentMethod | "">("");

  const [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<AdminPaymentMethod>("UPI");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [receivedAt, setReceivedAt] = useState(localDateTimeInput);
  const [extendDays, setExtendDays] = useState("30");
  const [activateSubscription, setActivateSubscription] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all(shopStatuses.map((status) => getAdminShops(status)))
      .then((responses) => {
        if (!active) return;
        const values = responses.flatMap((response) => response.items);
        const unique = Array.from(
          new Map(values.map((item) => [item.id, item])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name));
        setShops(unique);
        setShopId((current) => current || unique[0]?.id || "");
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load payment shops.",
        );
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAdminPayments({
      ...(filterShopId ? { shopId: filterShopId } : {}),
      ...(filterMethod ? { method: filterMethod } : {}),
      pageSize: 100,
    })
      .then((response) => {
        if (!active) return;
        setPayments(response.items);
        setSummary(response.summary);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load payment history.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterMethod, filterShopId, reloadKey]);

  const selectedShop = useMemo(
    () => shops.find((item) => item.id === shopId) ?? null,
    [shopId, shops],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await recordAdminPayment({
        shopId,
        amount: Number(amount),
        method,
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
        "Payment recorded successfully. Payment history and subscription status were updated.",
      );
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      setError(
        saveError instanceof AdminApiError
          ? saveError.message
          : "Unable to record payment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total received", formatMoney(summary.amount)],
          ["Payments", String(summary.count)],
          ["Cash", formatMoney(summary.byMethod.CASH.amount)],
          ["UPI", formatMoney(summary.byMethod.UPI.amount)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
          <CardDescription>
            Save the actual amount received. Early renewals extend from the existing expiry date, so remaining subscription time is not lost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-foreground">
                Shop
                <Select className="mt-1" value={shopId} onChange={(event) => setShopId(event.target.value)} required>
                  {shops.length === 0 ? <option value="">No eligible shops</option> : null}
                  {shops.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Amount received (₹)
                <Input className="mt-1" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </label>

              <label className="text-sm font-medium text-foreground">
                Payment method
                <Select className="mt-1" value={method} onChange={(event) => setMethod(event.target.value as AdminPaymentMethod)}>
                  {methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Payment date
                <Input className="mt-1" type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required />
              </label>

              <label className="text-sm font-medium text-foreground">
                Renewal / extension days
                <Input className="mt-1" type="number" min="0" max="3660" value={extendDays} onChange={(event) => setExtendDays(event.target.value)} />
                <span className="mt-1 block text-xs font-normal text-muted">
                  Use 0 when recording money without changing expiry.
                </span>
              </label>

              <label className="text-sm font-medium text-foreground">
                Reference / transaction ID
                <Input className="mt-1" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UPI ref, bank ref, receipt no." />
              </label>
            </div>

            <label className="block text-sm font-medium text-foreground">
              Comment / payment note
              <Textarea
                className="mt-1"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Example: October renewal received from owner; mention any special adjustment or reason here."
                required={method === "OTHER"}
              />
            </label>

            {selectedShop ? (
              <div className="rounded-xl border border-border bg-surface-muted/40 p-4 text-sm">
                <p className="font-semibold text-foreground">{selectedShop.name}</p>
                <p className="mt-1 text-muted">
                  {selectedShop.subscription
                    ? `${selectedShop.subscription.planName} · ${selectedShop.subscription.status} · valid until ${formatDate(selectedShop.subscription.endDate)} · payment ${selectedShop.subscription.paymentStatus}`
                    : "No subscription assigned. Payment cannot be recorded until a subscription exists."}
                </p>
              </div>
            ) : null}

            <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
              <input type="checkbox" checked={activateSubscription} onChange={(event) => setActivateSubscription(event.target.checked)} />
              Mark subscription Active after payment
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={saving || !shopId || !amount || !selectedShop?.subscription || (method === "OTHER" && !comment.trim())}
              >
                {saving ? "Saving payment…" : activateSubscription ? "Save Payment & Activate" : "Save Payment"}
              </Button>
              <p className="text-xs text-muted">
                Received payments are append-only and cannot be edited or deleted from the admin UI.
              </p>
            </div>
          </form>

          {message ? <div className="mt-4"><Alert title="Payment saved">{message}</Alert></div> : null}
          {error ? <div className="mt-4"><ErrorState title="Payment action failed" description={error} /></div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>
            Filter the ledger by shop or payment method. Historical rows are never overwritten by a later renewal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Filter by shop
              <Select className="mt-1" value={filterShopId} onChange={(event) => setFilterShopId(event.target.value)}>
                <option value="">All shops</option>
                {shops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </label>
            <label className="text-sm font-medium text-foreground">
              Filter by method
              <Select className="mt-1" value={filterMethod} onChange={(event) => setFilterMethod(event.target.value as AdminPaymentMethod | "")}>
                <option value="">All methods</option>
                {methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </label>
          </div>

          {loading ? <LoadingState title="Loading payment history" /> : null}
          {!loading && !error && payments.length === 0 ? (
            <EmptyState title="No payments recorded" description="Recorded shop payments will appear here with amount, method, reference, notes and renewal history." />
          ) : null}

          {!loading && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{formatMoney(payment.amount)}</p>
                      <p className="text-sm font-medium text-foreground">{payment.shop.name}</p>
                      <p className="text-xs text-muted">{payment.planName} · {formatDateTime(payment.receivedAt)}</p>
                    </div>
                    <Badge variant="info">{methodLabel(payment.method)}</Badge>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-muted">Reference</dt><dd className="mt-1 break-all text-foreground">{payment.reference || "—"}</dd></div>
                    <div><dt className="text-muted">Renewal</dt><dd className="mt-1 text-foreground">{payment.extendDays > 0 ? `${payment.extendDays} days` : "No expiry change"}</dd></div>
                    <div><dt className="text-muted">New validity</dt><dd className="mt-1 text-foreground">{formatDate(payment.newEndDate)}</dd></div>
                    <div><dt className="text-muted">Recorded by</dt><dd className="mt-1 text-foreground">{payment.recordedBy?.name ?? "Former administrator"}</dd></div>
                  </dl>

                  {payment.comment ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Comment</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{payment.comment}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
