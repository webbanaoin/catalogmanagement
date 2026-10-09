import Link from "next/link";

import { PartnerReferralActions } from "@/components/partner/partner-referral-actions";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { requireReferralPartnerPageAccess } from "@/server/auth/partner-page-access";
import { prisma } from "@/server/database/prisma";
import { getAppEnvironment } from "@/server/env";

function money(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badge(status: string) {
  if (status === "ACTIVE" || status === "PAID") return "success" as const;
  if (status === "EARNED" || status === "TRIAL" || status === "PENDING") {
    return "warning" as const;
  }
  if (status === "CANCELLED" || status === "REJECTED" || status === "EXPIRED") {
    return "danger" as const;
  }
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
        <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function PartnerDashboardPage() {
  const current = await requireReferralPartnerPageAccess();
  const partnerId = current.partner.id;
  const referralCode = current.partner.referralCode;

  if (!referralCode) {
    return (
      <EmptyState
        title="Referral code is not available"
        description="Please contact Webbanao admin."
      />
    );
  }

  const [shops, commissions, settings, commissionGroups] = await Promise.all([
    prisma.shop.findMany({
      where: { referralPartnerId: partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            paymentStatus: true,
            endDate: true,
            plan: { select: { name: true } },
          },
        },
        _count: { select: { payments: true } },
      },
    }),
    prisma.referralCommission.findMany({
      where: { referralPartnerId: partnerId },
      orderBy: [{ earnedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        billingCycle: true,
        commissionAmount: true,
        paymentAmountSnapshot: true,
        planNameSnapshot: true,
        shopNameSnapshot: true,
        earnedAt: true,
        paidAt: true,
        payoutMethod: true,
        payoutReference: true,
        cancelledAt: true,
        cancelComment: true,
      },
    }),
    prisma.referralProgramSettings.findUnique({
      where: { id: "default" },
      select: {
        isEnabled: true,
        commissionMode: true,
        monthlyCommission: true,
        yearlyCommission: true,
      },
    }),
    prisma.referralCommission.groupBy({
      by: ["status"],
      where: { referralPartnerId: partnerId },
      orderBy: { status: "asc" },
      _sum: { commissionAmount: true },
      _count: { _all: true },
    }),
  ]);

  const shopIds = shops.map((shop) => shop.id);
  const collections = await prisma.paymentRecord.aggregate({
    where:
      shopIds.length > 0
        ? { shopId: { in: shopIds } }
        : { id: "__none__" },
    _sum: { amount: true },
  });

  let totalEarned = 0;
  let paid = 0;
  let pending = 0;
  for (const group of commissionGroups) {
    const amount = Number(group._sum.commissionAmount ?? 0);
    if (group.status === "PAID") {
      paid += amount;
      totalEarned += amount;
    } else if (group.status === "EARNED") {
      pending += amount;
      totalEarned += amount;
    }
  }

  const paidShops = shops.filter((shop) => shop._count.payments > 0).length;
  const referralLink = new URL(
    `/register?ref=${encodeURIComponent(referralCode)}`,
    getAppEnvironment().APP_URL,
  ).toString();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partner dashboard"
        title={`Welcome, ${current.name}`}
        description="Track your referred shops, commission earnings and payout status in one place."
      />

      <Card>
        <CardHeader>
          <CardTitle>Your referral code</CardTitle>
          <CardDescription>
            Share the code or link with merchants. A shop must register with your
            active referral code before its eligible paid subscription can generate
            commission.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-xl border border-border bg-primary-soft/40 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">
                Referral code
              </p>
              <p className="mt-2 whitespace-nowrap text-2xl font-black tracking-tight text-primary">
                {referralCode}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">
                Referral link
              </p>
              <p className="mt-2 break-all text-sm font-medium text-foreground">
                {referralLink}
              </p>
            </div>
          </div>
          <PartnerReferralActions
            referralCode={referralCode}
            referralLink={referralLink}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Shops referred" value={String(shops.length)} />
          <Metric
            label="Paid shops"
            value={String(paidShops)}
            hint="Shops with recorded customer payment"
          />
          <Metric label="Total commission earned" value={money(totalEarned)} />
          <Metric label="Pending payout" value={money(pending)} />
          <Metric label="Commission paid" value={money(paid)} />
          <Metric
            label="Customer collections"
            value={money(Number(collections._sum.amount ?? 0))}
            hint="Payments from your referred shops"
          />
          <Metric
            label="Current monthly commission"
            value={money(settings?.monthlyCommission.toString() ?? "0")}
            hint={settings?.isEnabled ? "Current admin rule" : "Program disabled"}
          />
          <Metric
            label="Current yearly commission"
            value={money(settings?.yearlyCommission.toString() ?? "0")}
            hint={
              settings?.commissionMode === "EVERY_ELIGIBLE_PAYMENT"
                ? "Eligible on renewals too"
                : "First paid subscription rule"
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Referred shops</h2>
          <p className="mt-1 text-sm text-muted">
            Only shop-level referral progress is shown. Merchant private account
            details are not exposed.
          </p>
        </div>
        {shops.length === 0 ? (
          <EmptyState
            title="No referred shops yet"
            description="Share your referral link to start onboarding merchants."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {shops.map((shop) => (
              <Card key={shop.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{shop.name}</CardTitle>
                      <CardDescription>
                        Referred {date(shop.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant={badge(shop.status)}>
                      {titleCase(shop.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {shop.subscription ? (
                      <>
                        <Badge variant="info">{shop.subscription.plan.name}</Badge>
                        <Badge variant={badge(shop.subscription.status)}>
                          {titleCase(shop.subscription.status)}
                        </Badge>
                        <Badge>
                          Payment {titleCase(shop.subscription.paymentStatus)}
                        </Badge>
                      </>
                    ) : (
                      <Badge>No subscription yet</Badge>
                    )}
                  </div>
                  <p className="text-muted">
                    Recorded payments: {shop._count.payments}
                    {shop.subscription
                      ? " · Valid until " + date(shop.subscription.endDate)
                      : ""}
                  </p>
                  {shop.status === "ACTIVE" ? (
                    <Link
                      href={"/s/" + shop.slug}
                      className="font-medium text-primary hover:underline"
                    >
                      View public showroom
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Commission & payout history
          </h2>
          <p className="mt-1 text-sm text-muted">
            Commission appears only after an eligible customer payment is recorded
            by Webbanao admin.
          </p>
        </div>
        {commissions.length === 0 ? (
          <EmptyState title="No commission earned yet" />
        ) : (
          <div className="space-y-3">
            {commissions.map((commission) => (
              <Card key={commission.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground">
                        {commission.shopNameSnapshot}
                      </p>
                      <Badge variant={badge(commission.status)}>
                        {commission.status === "EARNED"
                          ? "Pending payout"
                          : titleCase(commission.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {titleCase(commission.billingCycle)} ·{" "}
                      {commission.planNameSnapshot} · Customer paid{" "}
                      {money(commission.paymentAmountSnapshot.toString())}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Earned {date(commission.earnedAt)}
                      {commission.status === "PAID"
                        ? ` · Paid ${date(commission.paidAt)}${commission.payoutMethod ? " via " + titleCase(commission.payoutMethod) : ""}`
                        : ""}
                      {commission.payoutReference
                        ? " · Ref " + commission.payoutReference
                        : ""}
                      {commission.status === "CANCELLED" && commission.cancelComment
                        ? " · " + commission.cancelComment
                        : ""}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {money(commission.commissionAmount.toString())}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
