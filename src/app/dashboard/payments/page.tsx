"use client";

import qrcode from "qrcode-generator";

import { useEffect, useState, type FormEvent } from "react";

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
  PaginationControls,
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
  type MerchantPaymentSubmissionStatus,
  type MerchantPaymentWorkspace,
  type MerchantShop,
  type MerchantSubscription,
} from "@/lib/catalog-api";
import {
  PAID_BILLING_CYCLES,
  SUBSCRIPTION_CYCLE_CONFIG,
  planPriceForCycle,
  regularPriceForCycle,
  offerIsActive,
  type PaidBillingCycle,
} from "@/lib/subscription-cycles";

type OfficialReceiver = { id: string; name: string; phone: string; upiId: string | null; cashEnabled: boolean };

const methods: Array<{ value: MerchantPaymentMethod; label: string }> = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
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
  const [paymentPage, setPaymentPage] = useState(1);
  const [submissionPage, setSubmissionPage] = useState(1);

  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] =
    useState<PaidBillingCycle>("MONTHLY");
  const [method, setMethod] = useState<MerchantPaymentMethod>("UPI");
  const [paidAt, setPaidAt] = useState(localDateTimeInput);
  const [receivers, setReceivers] = useState<OfficialReceiver[]>([]);
  const [receiverId, setReceiverId] = useState("");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentShop = await getCurrentMerchantShop();
        const [paymentResponse, subscriptionResponse, receiverResponse] = await Promise.all([
          getShopPayments(currentShop.id, {
            paymentPage,
            submissionPage,
            pageSize: 10,
          }),
          getShopSubscription(currentShop.id),
          fetch("/api/payment-receivers", { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("Unable to load official payment recipients"); return response.json() as Promise<{data:OfficialReceiver[]}>; }),
        ]);
        if (!active) return;

        setShop(currentShop);
        setWorkspace(paymentResponse.data);
        setSubscription(subscriptionResponse.data);
        setReceivers(receiverResponse.data);
        setReceiverId(current => current || receiverResponse.data[0]?.id || "");
        if (subscriptionResponse.data) {
          setAmount((current) =>
            current ||
            String(
              planPriceForCycle(
                subscriptionResponse.data!.plan,
                "MONTHLY",
              ),
            ),
          );
        }
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
  }, [paymentPage, reloadKey, submissionPage]);

  const verifiedTotal = Number(workspace?.summary.verifiedPaymentAmount ?? 0);
  const verifiedCount = workspace?.summary.verifiedPaymentCount ?? 0;
  const pendingCount = workspace?.summary.submissionByStatus.PENDING.count ?? 0;
  const pendingTotal = Number(
    workspace?.summary.submissionByStatus.PENDING.amount ?? 0,
  );

  function applyPlanPrice(cycle: PaidBillingCycle) {
    setBillingCycle(cycle);
    if (!subscription) return;
    setAmount(String(planPriceForCycle(subscription.plan, cycle)));
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
        recipientType: "WEBBANAO",
        paymentReceiverId: receiverId,
        reference: reference.trim() || null,
        comment: comment.trim() || null,
      });

      setReference("");
      setComment("");

      setPaidAt(localDateTimeInput());
      setSuccess(
        "Payment details submitted. Verification may take some time. For urgent confirmation, please call the authorized recipient you paid. Your subscription activates only after Webbanao admin approval.",
      );
      setSubmissionPage(1);
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Verified payments
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {money(verifiedTotal)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {verifiedCount} official payment records
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
              {pendingCount} submitted payment
              {pendingCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        {PAID_BILLING_CYCLES.map((cycle) => (
          <Card key={cycle}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {SUBSCRIPTION_CYCLE_CONFIG[cycle].label} plan
              </p>
              {subscription && offerIsActive(subscription.plan) && regularPriceForCycle(subscription.plan, cycle) > planPriceForCycle(subscription.plan, cycle) ? (
                <p className="mt-1 text-xs text-muted">Regular <del>{money(regularPriceForCycle(subscription.plan, cycle))}</del></p>
              ) : null}
              <p className="mt-2 text-2xl font-bold text-foreground">
                {subscription
                  ? money(planPriceForCycle(subscription.plan, cycle))
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {SUBSCRIPTION_CYCLE_CONFIG[cycle].shortLabel}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>I made a payment</CardTitle>
          <CardDescription>
            Pay only to the authorized Webbanao recipients listed below. Payment confirmation can take some time; for urgent help call the person you paid. Only an admin can approve and activate your subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription?.plan.offerEnabled && subscription.plan.offerEndsAt && new Date(subscription.plan.offerEndsAt).getTime() > Date.now() ? (
            <p className="mb-4 text-xs text-muted">Discounted prices apply only until the current offer deadline. Please refresh pricing before making payment if the offer has ended.</p>
          ) : null}
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-foreground">
                Billing cycle
                <Select
                  className="mt-1"
                  value={billingCycle}
                  onChange={(event) =>
                    applyPlanPrice(event.target.value as PaidBillingCycle)
                  }
                >
                  {PAID_BILLING_CYCLES.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {SUBSCRIPTION_CYCLE_CONFIG[cycle].label} ·{" "}
                      {subscription
                        ? money(planPriceForCycle(subscription.plan, cycle))
                        : SUBSCRIPTION_CYCLE_CONFIG[cycle].shortLabel}
                    </option>
                  ))}
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
                      ? String(planPriceForCycle(subscription.plan, billingCycle))
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
                Official payment receiver
                <Select className="mt-1" value={receiverId} onChange={event=>setReceiverId(event.target.value)} required>
                  <option value="">Select Prashant or Parixit</option>
                  {receivers.filter(r=>method==="UPI" ? Boolean(r.upiId) : r.cashEnabled).map(r=><option key={r.id} value={r.id}>{r.name} · {r.phone}</option>)}
                </Select>
              </label>
              {(() => {
                const receiver=receivers.find(r=>r.id===receiverId);
                if(!receiver) return null;
                const upiUrl=method==="UPI" && receiver.upiId
                  ? "upi://pay?pa="+encodeURIComponent(receiver.upiId)+"&pn="+encodeURIComponent(receiver.name)+"&am="+encodeURIComponent(amount)+"&cu=INR&tn="+encodeURIComponent("Webbanao Digital Showroom subscription")
                  : null;
                let svg="";
                if(upiUrl && Number(amount)>0){
                  const qr=qrcode(0,"M");qr.addData(upiUrl);qr.make();svg=qr.createSvgTag({cellSize:5,margin:4,scalable:true});
                }
                return <div className="rounded-xl border p-4 space-y-3 sm:col-span-4">
                  <p className="font-bold">{receiver.name} — Authorized Webbanao receiver</p>
                  <p>Contact: <a className="underline font-semibold" href={`tel:+91${receiver.phone}`}>+91 {receiver.phone}</a></p>
                  {method==="UPI" && upiUrl ? <>
                    <p className="text-sm">UPI ID: <strong>{receiver.upiId}</strong>. Confirm the payee name in your UPI app before paying.</p>
                    {svg?<div className="max-w-52 rounded-lg bg-white p-2" aria-label={`UPI QR for ${receiver.name}`} dangerouslySetInnerHTML={{__html:svg}} />:null}
                    <a className="inline-block rounded-lg border px-4 py-2 font-semibold" href={upiUrl}>Pay with UPI app</a>
                    <p className="text-xs text-muted">The amount is prefilled but some UPI apps allow editing. Verify the amount and payee before confirming.</p>
                  </>:<p className="text-sm">Cash may be given only to {receiver.name}. Request an official receipt/reference number.</p>}
                </div>;
              })()}
              <label className="text-sm font-medium text-foreground sm:col-span-2">
                Reference / UTR / receipt
                <Input
                  className="mt-1"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={191}
                  placeholder="Transaction UTR / official cash receipt"
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
                  required={false}
                />
              </label>
            </div>

            <Alert title="Payment safety — important">Marketing Partners are NOT authorized to collect cash or UPI payments for Webbanao. Pay only Prashant or Parixit using the official details displayed above. Never pay to a partner\u0027s personal QR.</Alert>
            <Alert title="Verification required">
              After submission, approval may take some time while Webbanao confirms actual receipt. For urgent confirmation, call the person you paid at the number shown above. Only an admin can approve a payment and activate the subscription.
            </Alert>

            <Button
              type="submit"
              disabled={
                saving ||
                !amount ||
                !receiverId ||
                (method==="UPI" && !receivers.find(r=>r.id===receiverId)?.upiId) ||
                (method==="CASH" && !receivers.find(r=>r.id===receiverId)?.cashEnabled)
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

          {workspace ? (
            <div className="mt-4">
              <PaginationControls
                page={workspace.pagination.submissions.page}
                totalPages={workspace.pagination.submissions.totalPages}
                total={workspace.pagination.submissions.total}
                pageSize={workspace.pagination.submissions.pageSize}
                itemLabel="payment submissions"
                onPageChange={(page) => {
                  setLoading(true);
                  setSubmissionPage(page);
                }}
              />
            </div>
          ) : null}
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

          {workspace ? (
            <div className="mt-4">
              <PaginationControls
                page={workspace.pagination.payments.page}
                totalPages={workspace.pagination.payments.totalPages}
                total={workspace.pagination.payments.total}
                pageSize={workspace.pagination.payments.pageSize}
                itemLabel="verified payments"
                onPageChange={(page) => {
                  setLoading(true);
                  setPaymentPage(page);
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
