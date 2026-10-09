import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { WebbanaoLogo } from "@/components/brand/webbanao-logo";
import { Container } from "@/components/ui";
import { prisma } from "@/server/database/prisma";
import {
  PAID_BILLING_CYCLES,
  SUBSCRIPTION_CYCLE_CONFIG,
  effectiveMonthlyPrice,
  planPriceForCycle,
  savingsAgainstMonthly,
  type PaidBillingCycle,
} from "@/lib/subscription-cycles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webbanao Digital Showroom | Take Your Shop Online",
  description:
    "Launch your shop's own digital showroom. Share products by QR, link and WhatsApp, get onboarding support, and start your first month free.",
};

const whatsappUrl =
  "https://wa.me/919168720245?text=Hi%20Webbanao%2C%20I%20want%20to%20know%20more%20about%20the%20Digital%20Showroom.";

const shopTypes = [
  { icon: "💍", label: "Jewellery" },
  { icon: "👕", label: "Garments" },
  { icon: "🧸", label: "Toys & Gifts" },
  { icon: "🖥️", label: "Electronics" },
  { icon: "🛒", label: "Grocery" },
  { icon: "👟", label: "Footwear" },
  { icon: "🧴", label: "Beauty & Personal Care" },
  { icon: "🛋️", label: "Home & Furniture" },
  { icon: "🛠️", label: "Hardware" },
  { icon: "⚙️", label: "Auto Parts" },
  { icon: "📚", label: "Books & Stationery" },
  { icon: "•••", label: "And many more" },
];

const features = [
  {
    title: "Your own digital showroom",
    text: "A branded public catalogue for your shop with products, categories, opening hours and a shareable customer link.",
  },
  {
    title: "QR + link sharing",
    text: "Customers open your showroom instantly from a QR code or link, with no customer app required.",
  },
  {
    title: "Smart bulk onboarding",
    text: "Smart Excel gives you shop-specific categories, dropdowns and Quick Defaults so bulk onboarding takes far less effort.",
  },
  {
    title: "WhatsApp enquiries",
    text: "Customers can enquire directly from a product page, including Request Price when you do not want to display a fixed price.",
  },
  {
    title: "Built for different businesses",
    text: "Jewellery, garments, toys, electronics and other shops get relevant product groups, categories and product details.",
  },
  {
    title: "Easy daily management",
    text: "Add or edit products from mobile, upload multiple images, control visibility and keep the catalogue current.",
  },
];

const pricingMeta: Record<
  PaidBillingCycle,
  {
    label: string;
    description: string;
    cta: string;
    featured: boolean;
  }
> = {
  MONTHLY: {
    label: "FLEXIBLE",
    description:
      "Keep the commitment low and continue your Digital Showroom one month at a time.",
    cta: "Choose monthly",
    featured: false,
  },
  QUARTERLY: {
    label: "LOW COMMITMENT",
    description:
      "A practical three-month option for merchants who want savings without a long commitment.",
    cta: "Choose quarterly",
    featured: false,
  },
  HALF_YEARLY: {
    label: "SMART VALUE",
    description:
      "Six months gives your shop a better effective monthly rate while keeping the commitment manageable.",
    cta: "Choose half-yearly",
    featured: false,
  },
  YEARLY: {
    label: "BEST VALUE",
    description:
      "The strongest long-term value for merchants ready to keep their Digital Showroom active throughout the year.",
    cta: "Choose yearly",
    featured: true,
  },
};

const faqs = [
  {
    question: "What is a Webbanao Digital Showroom?",
    answer:
      "It is your shop's own public online catalogue. Customers browse products through your link or QR code and contact your shop directly for enquiries.",
  },
  {
    question: "Do customers need to install an app?",
    answer:
      "No. The showroom opens directly in the browser, so customers can browse without installing anything or creating an account.",
  },
  {
    question: "What if I have hundreds of products?",
    answer:
      "Use Smart Excel for bulk onboarding. Shop-specific dropdowns and reusable defaults reduce repetitive data entry, and our team also supports first-time onboarding.",
  },
  {
    question: "Can I hide product prices?",
    answer:
      "Yes. Price visibility can be controlled at shop or product level. When price is hidden, customers can use the Request Price WhatsApp flow.",
  },
  {
    question: "Will Webbanao help with first-time setup?",
    answer:
      "Yes. Your first month is free and includes shop onboarding plus initial product onboarding assistance.",
  },
];

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ light = false }: { light?: boolean }) {
  return (
    <svg className={light ? "h-5 w-5 shrink-0 text-emerald-300" : "h-5 w-5 shrink-0 text-emerald-600"} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".13" />
      <path d="m6.3 10.1 2.2 2.2 5.2-5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.3-4A8.4 8.4 0 1 1 20.5 11.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.9.9c.3.1.4.3.4.5 0 .3-.1 1.3-.8 1.8-.5.5-1.3.8-2.1.7-1.1-.1-2.7-.6-4.6-2.2-2.2-1.9-3.5-4.4-3.6-5.7 0-.6.1-1 .5-1.5Z" fill="currentColor" />
    </svg>
  );
}

async function loadLandingCommerce() {
  try {
    const referralSettings = await prisma.referralProgramSettings.findUnique({
      where: { id: "default" },
      select: {
        isEnabled: true,
        commissionMode: true,
        monthlyCommission: true,
        quarterlyCommission: true,
        halfYearlyCommission: true,
        yearlyCommission: true,
      },
    });

    let plan = await prisma.plan.findFirst({
      where: {
        status: "ACTIVE",
        isDefaultTrial: true,
        monthlyPrice: { gt: 0 },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        trialDays: true,
        monthlyPrice: true,
        quarterlyPrice: true,
        halfYearlyPrice: true,
        annualPrice: true,
      },
    });

    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: {
          status: "ACTIVE",
          monthlyPrice: { gt: 0 },
        },
        orderBy: [{ monthlyPrice: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          trialDays: true,
          monthlyPrice: true,
          quarterlyPrice: true,
          halfYearlyPrice: true,
          annualPrice: true,
        },
      });
    }

    return { referralSettings, plan };
  } catch {
    return { referralSettings: null, plan: null };
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function Home() {
  const { referralSettings, plan: commercialPlan } =
    await loadLandingCommerce();

  const pricingPlans = commercialPlan
    ? PAID_BILLING_CYCLES.map((cycle) => {
        const meta = pricingMeta[cycle];
        const priceSource = {
          monthlyPrice: commercialPlan.monthlyPrice.toString(),
          quarterlyPrice: commercialPlan.quarterlyPrice.toString(),
          halfYearlyPrice: commercialPlan.halfYearlyPrice.toString(),
          annualPrice: commercialPlan.annualPrice.toString(),
        };
        const price = planPriceForCycle(priceSource, cycle);
        const effective = effectiveMonthlyPrice(priceSource, cycle);
        const saving = savingsAgainstMonthly(priceSource, cycle);

        return {
          cycle,
          ...meta,
          name: SUBSCRIPTION_CYCLE_CONFIG[cycle].label,
          price,
          suffix:
            cycle === "MONTHLY"
              ? "per month"
              : cycle === "YEARLY"
                ? "per year"
                : `every ${SUBSCRIPTION_CYCLE_CONFIG[cycle].months} months`,
          effective,
          saving,
          features: [
            "Your own digital showroom",
            "Product & category management",
            "QR and shareable shop link",
            "Smart Excel bulk upload",
            "Multiple product images",
            "WhatsApp product enquiries",
          ],
        };
      })
    : [];

  const referralRates = [
    {
      label: "Monthly",
      amount: Number(referralSettings?.monthlyCommission ?? 0),
    },
    {
      label: "Quarterly",
      amount: Number(referralSettings?.quarterlyCommission ?? 0),
    },
    {
      label: "Half-Yearly",
      amount: Number(referralSettings?.halfYearlyCommission ?? 0),
    },
    {
      label: "Yearly",
      amount: Number(referralSettings?.yearlyCommission ?? 0),
    },
  ];

  const referralProgramEnabled = referralSettings?.isEnabled ?? true;
  const referralRule =
    referralSettings?.commissionMode === "EVERY_ELIGIBLE_PAYMENT"
      ? "Eligible paid subscriptions and renewals can earn commission under the current program rule."
      : "Commission is earned on the first eligible paid subscription of each referred shop under the current program rule.";
  return (
    <main className="overflow-hidden bg-[#f8fbff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl">
        <Container className="flex min-h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="Webbanao home">
            <WebbanaoLogo compact />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex" aria-label="Main navigation">
            <a href="#features" className="transition hover:text-indigo-700">Features</a>
            <a href="#how-it-works" className="transition hover:text-indigo-700">How it works</a>
            <a href="#pricing" className="transition hover:text-indigo-700">Pricing</a>
            <a href="#earn-with-us" className="transition hover:text-indigo-700">Earn with us</a>
            <a href="#faq" className="transition hover:text-indigo-700">FAQs</a>
            <a href="#contact" className="transition hover:text-indigo-700">Contact</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 sm:inline-flex">
              Merchant login
            </Link>
            <Link href="/register" className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5">
              Register shop
            </Link>
          </div>
        </Container>
      </header>

      <section className="relative border-b border-slate-200/80 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(56,189,248,.18),transparent_25%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,.18),transparent_24%),linear-gradient(to_bottom,#ffffff,#f3f7ff)]" />
        <Container className="relative grid items-center gap-9 py-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-8 lg:py-14 xl:gap-10 xl:py-16">
          <div>
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-800">
              For local shops, boutiques and retailers
            </span>

            <h1 className="mt-6 max-w-2xl text-[2.75rem] font-black tracking-[-0.055em] text-[#07152f] sm:text-5xl lg:text-[3.3rem] lg:leading-[1.02] xl:text-[3.55rem]">
              Take your shop online with its own
              <span className="mt-1 block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Digital Showroom
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-800">
              Share products by link, QR and WhatsApp — without building a full e-commerce website.
            </p>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Give your physical shop a branded digital showroom where customers can browse products, enquire directly and explore your catalogue anytime.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-extrabold text-white shadow-[0_16px_35px_rgba(5,150,105,.20)] transition hover:-translate-y-0.5">
                Start your free month <ArrowIcon />
              </Link>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700">
                <WhatsAppIcon />
                Chat on WhatsApp
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
              {["Shop onboarding support", "Initial product onboarding", "No customer app required"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckIcon />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[820px] lg:w-[106%] lg:-mr-[6%]">
            <div className="absolute -inset-7 rounded-[2.8rem] bg-gradient-to-br from-cyan-200/55 via-indigo-200/50 to-violet-200/40 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2.5 shadow-[0_34px_90px_rgba(15,23,42,.20)] ring-1 ring-slate-200/70">
              <Image
                src="/images/webbanao-showroom-hero.svg"
                alt="Premium Webbanao digital showroom example on laptop and mobile with QR, catalogue browsing and WhatsApp enquiries"
                width={1200}
                height={720}
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="h-auto w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </div>
        </Container>

        <Container className="relative pb-5 pt-2 lg:-mt-8 lg:pt-0">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,.08)] sm:grid-cols-4 lg:grid-cols-12">
            {shopTypes.map((item) => (
              <div key={item.label} className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 border-b border-r border-slate-100 px-2 py-3 text-center last:border-r-0 lg:border-b-0">
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-bold leading-4 text-slate-650">{item.label}</span>
              </div>
            ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="relative overflow-hidden bg-[#06172f] py-12 text-white sm:py-14">
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <Container className="relative grid gap-8 lg:grid-cols-[.78fr_1.72fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300">Get started in minutes</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              From shop registration to customer-ready in three simple steps.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              We help with setup and initial product onboarding so you can focus on your business.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Register your shop",
                text: "Tell us your business type. Your showroom gets relevant catalogue categories and product structure.",
              },
              {
                step: "2",
                title: "We help with onboarding",
                text: "Our team supports shop setup and product onboarding, including Smart Excel bulk upload.",
              },
              {
                step: "3",
                title: "Share and grow",
                text: "Share your QR or showroom link. Customers browse products and enquire directly on WhatsApp.",
              },
            ].map((item) => (
              <article key={item.step} className="rounded-[1.6rem] border border-white/15 bg-white/[0.055] p-6 shadow-xl backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 text-lg font-black text-white shadow-lg">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="pricing" className="bg-white py-16 sm:py-20">
        <Container className="grid gap-10 xl:grid-cols-[.68fr_1.82fr] xl:items-start">
          <div className="xl:sticky xl:top-28">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">Simple & transparent pricing</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#07152f] sm:text-4xl">
              Start free. Continue with the plan that fits your shop.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              {commercialPlan?.trialDays
                ? `Your first ${commercialPlan.trialDays} days are designed to get your showroom live with onboarding support before you choose a paid billing cycle.`
                : "Get your showroom live with onboarding support, then choose the billing cycle that fits your shop."}
            </p>
          </div>

          <div>
            <div className="mb-5 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                Start free
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {commercialPlan?.trialDays
                  ? `${commercialPlan.trialDays}-day free trial + onboarding support`
                  : "Free onboarding support"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Try the Digital Showroom first, then continue with Monthly,
                Quarterly, Half-Yearly or Yearly billing.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.cycle}
                className={
                  plan.featured
                    ? "relative flex min-h-[590px] flex-col rounded-[1.65rem] border border-indigo-500 bg-gradient-to-br from-[#07152f] via-[#11184f] to-[#28227c] p-6 text-white shadow-[0_24px_65px_rgba(49,46,129,.26)]"
                    : "flex min-h-[590px] flex-col rounded-[1.65rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.06)]"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={plan.featured ? "rounded-full bg-violet-500 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-white" : "rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-indigo-700"}>
                    {plan.label}
                  </span>
                  {plan.saving > 0 ? (
                    <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-[10px] font-black text-emerald-950">
                      Save {formatMoney(plan.saving)}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-5 text-2xl font-black">{plan.name}</h3>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-[-0.04em]">
                    {plan.price > 0 ? formatMoney(plan.price) : "Contact us"}
                  </span>
                  <span className={plan.featured ? "pb-1 text-sm text-slate-300" : "pb-1 text-sm text-slate-500"}>{plan.suffix}</span>
                </div>
                <p className={plan.featured ? "mt-4 min-h-[96px] text-sm leading-6 text-slate-300" : "mt-4 min-h-[96px] text-sm leading-6 text-slate-600"}>
                  {plan.description}
                </p>
                {plan.price > 0 && plan.cycle !== "MONTHLY" ? (
                  <p className={plan.featured ? "mt-2 text-sm font-bold text-emerald-300" : "mt-2 text-sm font-bold text-emerald-700"}>
                    Effective {formatMoney(plan.effective)}/month
                  </p>
                ) : null}

                <div className={plan.featured ? "my-5 h-px bg-white/15" : "my-5 h-px bg-slate-200"} />

                <div className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon light={plan.featured} />
                      <span className={plan.featured ? "font-medium text-slate-200" : "font-medium text-slate-700"}>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/register"
                  className={
                    plan.featured
                      ? "mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 text-sm font-black !text-[#07152f] shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                      : "mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5"
                  }
                >
                  {plan.cta} <ArrowIcon />
                </Link>
              </article>
            ))}
          </div>
        </Container>

        <Container className="mt-8">
          <div className="grid gap-3 border-y border-slate-200 py-5 text-center text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <span>🤝 Built for local retailers</span>
            <span>⚡ Quick setup with support</span>
            <span>👥 No technical knowledge needed</span>
            <span>↗ Focus on your business, we handle the tech</span>
          </div>
        </Container>
      </section>

      <section id="earn-with-us" className="relative overflow-hidden border-t border-slate-200 bg-[#effcf7] py-16 sm:py-20">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
        <Container className="relative">
          <div className="grid gap-10 xl:grid-cols-[.92fr_1.08fr] xl:items-center">
            <div>
              <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
                Earn with Webbanao
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-[-0.045em] text-[#07152f] sm:text-4xl">
                Refer local shops. Earn when they become eligible paid Digital Showroom customers.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Join as a Webbanao Marketing Partner, get your own short referral code and link,
                refer shop owners, and track every referred shop, commission and payout from your dashboard.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {referralRates.map((rate) => (
                  <div
                    key={rate.label}
                    className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-[0_12px_35px_rgba(5,150,105,.08)]"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      {rate.label} referral earning
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                      {rate.amount > 0 ? formatMoney(rate.amount) : "Admin-set rate"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      For an eligible {rate.label.toLowerCase()} paid subscription
                      under the active referral rule.
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-600">
                <strong className="text-slate-900">
                  {referralProgramEnabled ? "Current earning rule:" : "Referral program status:"}
                </strong>{" "}
                {referralProgramEnabled
                  ? referralRule
                  : "The referral earning program is currently paused. Registration remains available for future activation."}
                {" "}Current rates and payout status are always visible in the approved partner dashboard.
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/partner/register"
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-black text-white shadow-[0_16px_35px_rgba(5,150,105,.18)] transition hover:-translate-y-0.5"
                >
                  Register as Marketing Partner <ArrowIcon />
                </Link>
                <Link
                  href="/partner/login"
                  className="inline-flex h-[52px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  Partner Login
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_65px_rgba(15,23,42,.10)] sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-indigo-600">
                How referral earning works
              </p>
              <div className="mt-6 space-y-4">
                {[
                  {
                    step: "1",
                    title: "Register as a marketing partner",
                    text: "Create your partner account with your basic details. Registration is separate from merchant registration.",
                  },
                  {
                    step: "2",
                    title: "Get approved & receive your code",
                    text: "Webbanao admin reviews your account. After approval, you receive a short code like WB-48271 plus a ready-to-share referral link.",
                  },
                  {
                    step: "3",
                    title: "Refer shop owners",
                    text: "Share your code or link. When a merchant registers through it, that shop is automatically connected to your partner account.",
                  },
                  {
                    step: "4",
                    title: "Track earning & payout",
                    text: "After an eligible customer payment is recorded, commission appears in your dashboard as Pending. Once Webbanao pays you, it moves to Paid history.",
                  },
                ].map((item) => (
                  <article
                    key={item.step}
                    className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[48px_1fr]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-base font-black text-white shadow-md">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
                {[
                  "Short referral code + link",
                  "Partner-wise shop tracking",
                  "Pending & paid commission history",
                  "Transparent payout records",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CheckIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="features" className="border-t border-slate-200 bg-[#f8fbff] py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">Everything your shop needs</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#07152f] sm:text-4xl">
              More than a catalogue. A simpler digital sales experience for your shop.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Customers get a clean showroom. You stay in control of products, prices, images and enquiries.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article key={feature.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.05)] transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_45px_rgba(79,70,229,.10)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-[-0.02em] text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#0284c7] py-16 text-white sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_.88fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-200">Onboarding without the headache</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Hundreds of products? You do not have to enter them one by one.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-100">
              Smart Excel reduces repetitive typing using business-specific categories, dropdowns and reusable defaults. During your free first month, our team can also support initial product onboarding.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur">
            {[
              "Business-specific categories ready for your shop",
              "Smart Excel for fast bulk product onboarding",
              "Common values set once using Quick Defaults",
              "Single products can still be added or edited from mobile",
              "Webbanao onboarding support during the free first month",
            ].map((item) => (
              <div key={item} className="flex gap-3 border-b border-white/10 py-3.5 last:border-b-0">
                <CheckIcon light />
                <span className="text-sm font-semibold text-white">{item}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section id="faq" className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">Frequently asked questions</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#07152f] sm:text-4xl">
              Questions shop owners usually want answered.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              The product is designed to stay simple for merchants and customers. For anything else, contact Webbanao directly.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:border-indigo-200 open:shadow-md">
                <summary className="cursor-pointer list-none font-extrabold text-slate-950">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 pr-10 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section id="contact" className="bg-white py-16 sm:py-20">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07152f] via-[#0d163b] to-[#211968] px-6 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,.22)] sm:px-10 sm:py-12 lg:px-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative grid gap-9 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300">Ready to launch your shop?</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Start your first month free and let us help build your initial digital showroom.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                  Register your shop now, or contact Webbanao if you want to discuss your catalogue and onboarding first.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Contact us</p>
                <a href="tel:+919168720245" className="mt-2 block text-2xl font-black text-white transition hover:text-cyan-300">
                  +91 9168720245
                </a>

                <div className="mt-5 grid gap-3">
                  <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 text-sm font-black !text-[#07152f] shadow-lg transition hover:bg-slate-100">
                    Register your shop <ArrowIcon />
                  </Link>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20">
                    <WhatsAppIcon />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <WebbanaoLogo compact />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
            <a href="#features" className="hover:text-indigo-700">Features</a>
            <a href="#pricing" className="hover:text-indigo-700">Pricing</a>
            <a href="#earn-with-us" className="hover:text-indigo-700">Earn with us</a>
            <Link href="/partner/register" className="hover:text-indigo-700">Partner register</Link>
            <Link href="/partner/login" className="hover:text-indigo-700">Partner login</Link>
            <a href="#faq" className="hover:text-indigo-700">FAQs</a>
            <a href="#contact" className="hover:text-indigo-700">Contact</a>
            <Link href="/login" className="hover:text-indigo-700">Merchant login</Link>
          </div>
          <p className="text-xs font-medium text-slate-400">© 2026 Webbanao. Digital Showroom.</p>
        </Container>
      </footer>

      <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat with Webbanao on WhatsApp" className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500 px-5 text-sm font-black text-white shadow-[0_16px_40px_rgba(5,150,105,.28)] transition hover:-translate-y-0.5 hover:bg-emerald-600">
        <WhatsAppIcon />
        WhatsApp
      </a>
    </main>
  );
}
