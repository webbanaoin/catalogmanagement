"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminApiError,
  getAdminPaymentSubmissions,
  reviewAdminPaymentSubmission,
  type AdminPaymentSubmission,
  type AdminPaymentSubmissionStatus,
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
  Input,
  LoadingState,
  PaginationControls,
  Select,
} from "@/components/ui";
import {
  billingCycleExtensionDays,
  isPaidBillingCycle,
} from "@/lib/subscription-cycles";

function money(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function title(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeVariant(status: AdminPaymentSubmissionStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "danger" as const;
}

function defaultDays(submission: AdminPaymentSubmission) {
  return isPaidBillingCycle(submission.billingCycle)
    ? billingCycleExtensionDays(submission.billingCycle)
    : 0;
}

export function AdminPaymentSubmissionQueue({
  onOfficialPaymentChanged,
}: {
  onOfficialPaymentChanged?: () => void;
}) {
  const [items, setItems] = useState<AdminPaymentSubmission[]>([]);
  const [status, setStatus] = useState<AdminPaymentSubmissionStatus | "">(
    "PENDING",
  );
  const [summary, setSummary] = useState<{
    total: number;
    currency: string;
    byStatus: Record<
      AdminPaymentSubmissionStatus,
      { count: number; amount: string }
    >;
  } | null>(null);
  const [extensionDays, setExtensionDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    let active = true;

    getAdminPaymentSubmissions({
      status: status || undefined,
      page,
      pageSize: 20,
    })
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setSummary(response.summary);
        setPagination(response.pagination);
        setFeedback(null);
        setFeedbackError(false);
      })
      .catch((error) => {
        if (!active) return;
        setFeedback(
          error instanceof AdminApiError
            ? error.message
            : "Unable to load merchant payment submissions.",
        );
        setFeedbackError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey, status]);

  const pendingAmount = summary?.byStatus.PENDING.amount ?? "0";
  const approvedAmount = summary?.byStatus.APPROVED.amount ?? "0";
  const rejectedAmount = summary?.byStatus.REJECTED.amount ?? "0";

  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "PENDING"),
    [items],
  );

  function reload(message?: string) {
    setLoading(true);
    if (message) {
      setFeedback(message);
      setFeedbackError(false);
    }
    setReloadKey((value) => value + 1);
  }

  async function approve(submission: AdminPaymentSubmission) {
    const days = Number(
      extensionDays[submission.id] ?? String(defaultDays(submission)),
    );
    if (!Number.isInteger(days) || days < 0 || days > 3660) {
      setFeedback("Extension days must be between 0 and 3660.");
      setFeedbackError(true);
      return;
    }

    if (
      !window.confirm(
        `Approve ${money(submission.amount)} ${title(submission.billingCycle)} payment from ${submission.shop.name}? This will create the official payment record and extend the subscription by ${days} days.`,
      )
    ) {
      return;
    }

    setWorking(submission.id);
    setFeedback(null);
    try {
      const response = await reviewAdminPaymentSubmission(submission.id, {
        action: "APPROVE",
        extendDays: days,
        activateSubscription: true,
        comment: "Verified by Webbanao admin.",
      });

      const data = response.data;
      const commission =
        "referralCommission" in data && data.referralCommission
          ? ` Referral commission ${money(data.referralCommission.amount)} was also created.`
          : "";

      reload(
        `Payment approved and added to official shop history.${commission}`,
      );
      onOfficialPaymentChanged?.();
    } catch (error) {
      setFeedback(
        error instanceof AdminApiError
          ? error.message
          : "Unable to approve merchant payment.",
      );
      setFeedbackError(true);
    } finally {
      setWorking(null);
    }
  }

  async function reject(submission: AdminPaymentSubmission) {
    const reason = window.prompt(
      `Why are you rejecting the ${money(submission.amount)} payment submission from ${submission.shop.name}?`,
    );
    if (!reason?.trim()) return;

    setWorking(submission.id);
    setFeedback(null);
    try {
      await reviewAdminPaymentSubmission(submission.id, {
        action: "REJECT",
        comment: reason.trim(),
      });
      reload("Payment submission rejected. The merchant can see the reason.");
    } catch (error) {
      setFeedback(
        error instanceof AdminApiError
          ? error.message
          : "Unable to reject merchant payment.",
      );
      setFeedbackError(true);
    } finally {
      setWorking(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Merchant submitted payments</CardTitle>
            <CardDescription>
              Verify payments reported by merchants. Pending submissions do not
              affect revenue, subscription validity or referral commission until
              you approve them.
            </CardDescription>
          </div>
          <Select
            className="w-full lg:w-56"
            value={status}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setStatus(
                event.target.value as AdminPaymentSubmissionStatus | "",
              );
            }}
          >
            <option value="PENDING">Pending verification</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All submissions</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Pending
            </p>
            <p className="mt-2 text-xl font-bold text-foreground">
              {money(pendingAmount)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary?.byStatus.PENDING.count ?? 0} claim
              {(summary?.byStatus.PENDING.count ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Approved
            </p>
            <p className="mt-2 text-xl font-bold text-foreground">
              {money(approvedAmount)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary?.byStatus.APPROVED.count ?? 0} verified
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Rejected
            </p>
            <p className="mt-2 text-xl font-bold text-foreground">
              {money(rejectedAmount)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary?.byStatus.REJECTED.count ?? 0} rejected
            </p>
          </div>
        </div>

        {feedback ? (
          <Alert variant={feedbackError ? "error" : "info"}>{feedback}</Alert>
        ) : null}

        {loading ? <LoadingState title="Loading merchant payment claims" /> : null}

        {!loading && items.length === 0 ? (
          <EmptyState
            title={
              status === "PENDING"
                ? "No pending merchant payments"
                : "No payment submissions for this filter"
            }
            description="Merchant-submitted payment information will appear here for review."
          />
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-foreground">
                        {money(submission.amount)}
                      </p>
                      <Badge variant={badgeVariant(submission.status)}>
                        {submission.status === "PENDING"
                          ? "Pending verification"
                          : title(submission.status)}
                      </Badge>
                      <Badge variant="info">
                        {title(submission.billingCycle)}
                      </Badge>
                      <Badge>{title(submission.method)}</Badge>
                    </div>
                    <p className="mt-2 font-semibold text-foreground">
                      {submission.shop.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Merchant says paid to{" "}
                      <strong className="text-foreground">
                        {submission.recipientName}
                      </strong>{" "}
                      on {dateTime(submission.paidAt)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Submitted by {submission.submittedByUser.name} ·{" "}
                      {submission.submittedByUser.email} ·{" "}
                      {dateTime(submission.submittedAt)}
                    </p>
                  </div>
                  <div className="xl:text-right">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted">
                      Reference / UTR
                    </p>
                    <p className="mt-1 max-w-md break-all font-medium text-foreground">
                      {submission.reference || "Not provided"}
                    </p>
                  </div>
                </div>

                {submission.comment ? (
                  <div className="mt-4 rounded-lg border border-border bg-surface-muted/40 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Merchant note
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">
                      {submission.comment}
                    </p>
                  </div>
                ) : null}

                {submission.status === "PENDING" ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-end lg:justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Subscription extension days
                      <Input
                        className="mt-1 w-48"
                        type="number"
                        min="0"
                        max="3660"
                        value={
                          extensionDays[submission.id] ??
                          String(defaultDays(submission))
                        }
                        onChange={(event) =>
                          setExtensionDays((current) => ({
                            ...current,
                            [submission.id]: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={working === submission.id}
                        onClick={() => void approve(submission)}
                      >
                        {working === submission.id
                          ? "Processing…"
                          : "Approve payment"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={working === submission.id}
                        onClick={() => void reject(submission)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
                    Reviewed {dateTime(submission.reviewedAt)}
                    {submission.reviewedByUser
                      ? " by " + submission.reviewedByUser.name
                      : ""}
                    {submission.reviewComment
                      ? " · " + submission.reviewComment
                      : ""}
                    {submission.paymentRecordId
                      ? " · Official payment created"
                      : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          itemLabel="payment submissions"
          onPageChange={(nextPage) => {
            setLoading(true);
            setPage(nextPage);
          }}
        />

        {status === "PENDING" && pendingItems.length > 0 ? (
          <p className="text-xs leading-5 text-muted">
            Approval is financial confirmation. Verify the actual receipt, UTR,
            person/partner who collected it and amount before approving.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
