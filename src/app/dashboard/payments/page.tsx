"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import {
  CatalogApiError,
  getCurrentMerchantShop,
  getShopPayments,
  getShopSubscription,
  submitShopPayment,
  type MerchantPaymentMethod,
  type MerchantPaymentRecipientType,
  type MerchantPaymentSubmissionStatus,
  type MerchantPaymentWorkspace,
  type MerchantShop,
  type MerchantSubscription,
} from "@/lib/catalog-api";

const methods: Array<{ value: MerchantPaymentMethod; label: string }> = [
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

function localDateTimeInput() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

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

function submissionVariant(status: MerchantPaymentSubmissionStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "danger" as const;
}

export default function MerchantPaymentsPage() {
  const [shop, setShop] = useState<MerchantShop | null>(null);
  const [subscription, setSubscription] =
    useState<MerchantSubscription | null>(null);
  const [workspace, setWorkspace] =
    useState<MerchantPaymentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] =
    useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [method, setMethod] = useState<MerchantPaymentMethod>("UPI");
  const [paidAt, setPaidAt] = useState(localDateTimeInput);
  const [recipientType, setRecipientType] =
    useState<MerchantPaymentRecipientType>("WEBBANAO");
  const [recipientName, setRecipientName] = useState("");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentShop = await getCurrentMerchantShop();
        const [paymentResponse, subscriptionResponse] = await Promise.all([
          getShopPayments(currentShop.id),
          getShopSubscription(currentShop.id),
        ]);
        if (!active) return;

        setShop(currentShop);
        setWorkspace(paymentResponse.data);
        setSubscription(subscriptionResponse.data);
        setFeedback(null);
      } catch (error) {
        if (!active) return;
        setFeedback(
          error instanceof CatalogApiError
            ? error.message
            : "Unable to load payment information.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const verifiedTotal = useMemo(
    () =>
      workspace?.payments.reduce(
        (total, payment) => total + Number(payment.amount),
        0,
      ) ?? 0,
    [workspace],
  );

  const pendingSubmissions = useMemo(
    () =>
      workspace?.submissions.filter((submission) => submission.status === "PENDING") ??
      [],
    [workspace],
  );

  const pendingTotal = pendingSubmissions.reduce(
    (total, submission) => total + Number(submission.amount),
    0,
  );

  function applyPlanPrice(cycle: "MONTHLY" | "YEARLY") {
    setBillingCycle(cycle);
    if (!subscription) return;
    setAmount(
      cycle === "YEARLY"
        ? subscription.plan.annualPrice
        : subscription.plan.monthlyPrice,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;

    setSaving(true);
    setFeedback(null);
    setSuccess(null);

    try {
      await submitShopPayment(shop.id, {
        amount: Number(amount),
        method,
        billingCycle,
        paidAt: new Date(paidAt).toISOString(),
        recipientType,
        recipientName:
          recipientType === "OTHER" ? recipientName.trim() || null : null,
        reference: reference.trim() || null,
        comment: comment.trim() || null,
      });

      setReference("");
      setComment("");
      setRecipientName("");
      setPaidAt(localDateTimeInput());
      setSuccess(
        "Payment information submitted. It is pending Webbanao verification and will become an official payment only after admin approval.",
      );
      setLoading(true);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setFeedback(
        error instanceof CatalogApiError
          ? error.message
          : "Unable to submit payment information.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !workspace) {
    return (
      <LoadingState
        title="Loading payments"
        description="Checking your verified payment history and submitted payment information."
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Merchant finance"
        title="Payments"
        description="See verified payments recorded by Webbanao and submit payment information for admin verification."
      />

      {feedback ? <Alert variant="error">{feedback}</Alert> : null}
      {success ? <Alert title="Payment submitted">{success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Verified payments
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {money(verifiedTotal)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {workspace?.payments.length ?? 0} official payment records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Pending verification
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {money(pendingTotal)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {pendingSubmissions.length} submitted payment
              {pendingSubmissions.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Current monthly plan
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {subscription ? money(subscription.plan.monthlyPrice) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Current yearly plan
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {subscription ? money(subscription.plan.annualPrice) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>I made a payment</CardTitle>
          <CardDescription>
            Use this when you paid Webbanao directly, through your marketing/referral
            person, or through another agreed medium. This submission does not
            activate your subscription until Webbanao verifies receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-foreground">
                Billing cycle
                <Select
                  className="mt-1"
                  value={billingCycle}
                  onChange={(event) =>
                    applyPlanPrice(event.target.value as "MONTHLY" | "YEARLY")
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </label>

              <label className="text-sm font-medium text-foreground">
                Amount paid (₹)
                <Input
                  className="mt-1"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={
                    subscription
                      ? billingCycle === "YEARLY"
                        ? subscription.plan.annualPrice
                        : subscription.plan.monthlyPrice
                      : "Amount paid"
                  }
                  required
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Payment method
                <Select
                  className="mt-1"
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as MerchantPaymentMethod)
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
                Payment date
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium text-foreground sm:col-span-2">
                Paid to
                <Select
                  className="mt-1"
                  value={recipientType}
                  onChange={(event) =>
                    setRecipientType(
                      event.target.value as MerchantPaymentRecipientType,
                    )
                  }
                >
                  <option value="WEBBANAO">Webbanao / Direct</option>
                  {workspace?.referralPartner ? (
                    <option value="REFERRAL_PARTNER">
                      Marketing partner — {workspace.referralPartner.name} (
                      {workspace.referralPartner.referralCode})
                    </option>
                  ) : null}
                  <option value="OTHER">Other person / medium</option>
                </Select>
              </label>

              {recipientType === "OTHER" ? (
                <label className="text-sm font-medium text-foreground sm:col-span-2">
                  Who received the payment?
                  <Input
                    className="mt-1"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    maxLength={160}
                    placeholder="Person / agency / other payment channel"
                    required
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3 text-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                    Recipient
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {recipientType === "REFERRAL_PARTNER" &&
                    workspace?.referralPartner
                      ? `${workspace.referralPartner.name} (${workspace.referralPartner.referralCode})`
                      : "Webbanao Digital Showroom"}
                  </p>
                </div>
              )}

              <label className="text-sm font-medium text-foreground sm:col-span-2">
                Reference / UTR / receipt
                <Input
                  className="mt-1"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={191}
                  placeholder="Recommended for UPI / bank payments"
                />
              </label>

              <label className="text-sm font-medium text-foreground sm:col-span-2">
                Note
                <Textarea
                  className="mt-1"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={2000}
                  placeholder="Any useful payment detail for Webbanao admin."
                  required={method === "OTHER"}
                />
              </label>
            </div>

            <Alert title="Verification required">
              Your entry will first show as Pending. Webbanao admin will verify the
              payment. Only after approval will it appear in Verified Payment
              History, update your subscription and trigger any applicable referral
              commission.
            </Alert>

            <Button
              type="submit"
              disabled={
                saving ||
                !amount ||
                (recipientType === "OTHER" && !recipientName.trim()) ||
                (method === "OTHER" && !comment.trim())
              }
            >
              {saving ? "Submitting…" : "Submit payment for verification"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My payment submissions</CardTitle>
          <CardDescription>
            Payments you reported yourself, including Pending, Approved and
            Rejected verification status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!workspace || workspace.submissions.length === 0 ? (
            <EmptyState
              title="No payment submissions yet"
              description="If you pay outside the platform, submit the payment information above."
            />
          ) : (
            <div className="space-y-3">
              {workspace.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {money(submission.amount)}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {title(submission.billingCycle)} · {title(submission.method)}
                        {" · "}Paid to {submission.recipientName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Paid {dateTime(submission.paidAt)} · Submitted{" "}
                        {dateTime(submission.submittedAt)}
                      </p>
                    </div>
                    <Badge variant={submissionVariant(submission.status)}>
                      {submission.status === "PENDING"
                        ? "Pending verification"
                        : title(submission.status)}
                    </Badge>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-muted">Reference</dt>
                      <dd className="mt-1 break-all text-foreground">
                        {submission.reference || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Admin review</dt>
                      <dd className="mt-1 text-foreground">
                        {submission.reviewedAt
                          ? dateTime(submission.reviewedAt)
                          : "Waiting for verification"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Official payment</dt>
                      <dd className="mt-1 text-foreground">
                        {submission.paymentRecordId
                          ? "Created after approval"
                          : "Not created yet"}
                      </dd>
                    </div>
                  </dl>

                  {submission.comment || submission.reviewComment ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {submission.comment ? (
                        <div className="rounded-lg bg-surface-muted/40 p-3 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                            Your note
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-foreground">
                            {submission.comment}
                          </p>
                        </div>
                      ) : null}
                      {submission.reviewComment ? (
                        <div className="rounded-lg bg-surface-muted/40 p-3 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                            Webbanao review
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-foreground">
                            {submission.reviewComment}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verified payment history</CardTitle>
          <CardDescription>
            This is the official payment ledger. It includes payments recorded
            directly by Webbanao and merchant submissions approved by admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!workspace || workspace.payments.length === 0 ? (
            <EmptyState
              title="No verified payments yet"
              description="Verified payments will appear here after Webbanao records or approves them."
            />
          ) : (
            <div className="space-y-3">
              {workspace.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {money(payment.amount)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {payment.planName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Verified payment date: {dateTime(payment.receivedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">Verified</Badge>
                      <Badge variant="info">{title(payment.billingCycle)}</Badge>
                      <Badge>{title(payment.method)}</Badge>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-muted">Source</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.source === "MERCHANT_SUBMISSION_APPROVED"
                          ? "Submitted by you · approved by Webbanao"
                          : "Recorded directly by Webbanao"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Reference</dt>
                      <dd className="mt-1 break-all text-foreground">
                        {payment.reference || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Validity extension</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.extendDays > 0
                          ? `${payment.extendDays} days`
                          : "No expiry change"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">New validity</dt>
                      <dd className="mt-1 text-foreground">
                        {payment.newEndDate
                          ? dateTime(payment.newEndDate)
                          : "—"}
                      </dd>
                    </div>
                  </dl>

                  {payment.submittedPayment ? (
                    <p className="mt-3 text-sm text-muted">
                      Paid to {payment.submittedPayment.recipientName}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
