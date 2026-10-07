"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  AdminApiError,
  createAdminPayment,
  getAdminPayments,
  type AdminPaymentRecord,
} from "@/lib/admin-api";
import { Alert, Badge, Button } from "@/components/ui";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function todayValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function AdminPaymentManager({
  shopId,
  onSubscriptionChanged,
}: {
  shopId: string;
  onSubscriptionChanged?: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<AdminPaymentRecord["status"]>("PAID");
  const [method, setMethod] = useState<AdminPaymentRecord["method"]>("UPI");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayValue());
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [extendDays, setExtendDays] = useState("");

  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  );

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await getAdminPayments(shopId);
      setPayments(response.items);
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to load payment history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && payments.length === 0 && !loading) {
      void load();
    }
    // load only when the payment panel is first opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await createAdminPayment(shopId, {
        amount: Number(amount || 0),
        status,
        method,
        paymentDate: new Date(`${paymentDate}T12:00:00`).toISOString(),
        ...(referenceId.trim() ? { referenceId: referenceId.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(extendDays ? { extendDays: Number(extendDays) } : {}),
      });

      setAmount("");
      setReferenceId("");
      setNotes("");
      setExtendDays("");
      setMessage("Payment entry recorded. Subscription payment status has been synchronized.");
      await load();
      await onSubscriptionChanged?.();
    } catch (error) {
      setMessage(
        error instanceof AdminApiError
          ? error.message
          : "Unable to record payment.",
      );
    } finally {
      setSaving(false);
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
        {open ? "Hide payments" : "Manage payments"}
      </Button>

      {open ? (
        <div className="mt-4 space-y-5">
          <Alert title="Append-only payment history">
            Record cash, UPI, bank transfer, online or other payments here. Existing
            entries are not edited or deleted; corrections, refunds or failed
            payments should be added as a new auditable entry.
          </Alert>

          <form
            onSubmit={submit}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-foreground">
                Payment status
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as AdminPaymentRecord["status"])
                  }
                >
                  {["PAID", "PENDING", "FAILED", "REFUNDED", "WAIVED"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Payment method
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as AdminPaymentRecord["method"])
                  }
                >
                  {["UPI", "CASH", "BANK_TRANSFER", "ONLINE", "OTHER"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Amount (₹)
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={status === "WAIVED" ? "0" : "299"}
                  required
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Payment date
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Reference / transaction ID
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  value={referenceId}
                  onChange={(event) => setReferenceId(event.target.value)}
                  maxLength={191}
                  placeholder="UPI / bank / receipt reference"
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Extend subscription days
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  type="number"
                  min="1"
                  max="3660"
                  value={extendDays}
                  onChange={(event) => setExtendDays(event.target.value)}
                  placeholder="30 or 365"
                />
              </label>

              <label className="text-sm font-medium text-foreground sm:col-span-2">
                Notes
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000}
                  placeholder="Optional payment or renewal note"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Recording…" : "Record payment"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExtendDays("30")}
              >
                +30 days
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExtendDays("365")}
              >
                +365 days
              </Button>
            </div>
          </form>

          {message ? <p className="text-sm text-muted">{message}</p> : null}

          <div className="rounded-xl border border-border bg-surface-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Payment history
                </p>
                <p className="mt-1 text-sm text-muted">
                  Latest 100 entries · paid total {formatMoney(paidTotal)}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={load}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>

            {loading && payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Loading payments…</p>
            ) : payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No payment entries yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Method</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Reference</th>
                      <th className="px-2 py-2">Received by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border/70">
                        <td className="whitespace-nowrap px-2 py-3">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={
                              payment.status === "PAID"
                                ? "success"
                                : payment.status === "PENDING"
                                  ? "warning"
                                  : payment.status === "WAIVED"
                                    ? "info"
                                    : "danger"
                            }
                          >
                            {titleCase(payment.status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3">
                          {titleCase(payment.method)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 font-semibold">
                          {formatMoney(payment.amount)}
                        </td>
                        <td className="max-w-48 truncate px-2 py-3">
                          {payment.referenceId ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3">
                          {payment.receivedBy?.name ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
