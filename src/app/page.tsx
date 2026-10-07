import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { WebbanaoLogo } from "@/components/brand/webbanao-logo";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Webbanao Digital Showroom | Take Your Shop Online",
  description:
    "Launch your shop's own digital showroom. Share products through QR, link and WhatsApp, get onboarding support, and start your first month free.",
};

const whatsappUrl =
  "https://wa.me/919168720245?text=Hi%20Webbanao%2C%20I%20want%20to%20know%20more%20about%20the%20Digital%20Showroom.";

const features = [
  {
    number: "01",
    title: "Your own digital showroom",
    description:
      "A branded public catalogue for your shop with products, categories, opening hours and a shareable customer link.",
  },
  {
    number: "02",
    title: "QR, link & WhatsApp",
    description:
      "Customers can open your showroom instantly, browse products and send enquiries directly on WhatsApp.",
  },
  {
    number: "03",
    title: "Smart bulk onboarding",
    description:
      "Smart Excel gives you shop-specific categories, dropdowns and Quick Defaults so hundreds of products take less effort.",
  },
  {
    number: "04",
    title: "Flexible price visibility",
    description:
      "Show prices, hide them, or use Request Price for products where rates change frequently.",
  },
  {
    number: "05",
    title: "Built for your business type",
    description:
      "Jewellery, garments, toys, electronics and other shops get relevant catalogue groups, categories and product details.",
  },
  {
    number: "06",
    title: "Easy daily management",
    description:
      "Add or edit products from mobile, upload multiple images, control visibility and keep your catalogue fresh.",
  },
];

const shopTypes = [
  "Jewellery",
  "Garments",
  "Toys & Gifts",
  "Electronics",
  "Grocery",
  "Footwear",
  "Beauty",
  "Furniture",
  "Hardware",
  "Auto Parts",
  "Books & Stationery",
  "Sports & Fitness",
];

const plans = [
  {
    name: "Launch Free",
    tag: "FIRST MONTH FREE",
    price: "₹0",
    suffix: "first month",
    description:
      "Launch with guided support so your shop and initial catalogue are not left for you to configure alone.",
    features: [
      "1 month free trial",
      "Shop setup & onboarding support",
      "Initial product onboarding assistance",
      "Smart Excel bulk import support",
      "Digital showroom setup",
      "WhatsApp enquiry flow",
    ],
    cta: "Start free month",
    featured: false,
  },
  {
    name: "Monthly",
    tag: "FLEXIBLE",
    price: "₹299",
    suffix: "per month",
    description:
      "Keep your digital showroom active month by month with complete day-to-day catalogue management.",
    features: [
      "Your own digital showroom",
      "Product & category management",
      "QR and shareable shop link",
      "Smart Excel bulk upload",
      "Multiple product images",
      "WhatsApp product enquiries",
    ],
    cta: "Choose monthly",
    featured: false,
  },
  {
    name: "Yearly",
    tag: "BEST VALUE",
    price: "₹2,988",
    suffix: "per year",
    description:
      "Best value for shops that want a long-term digital presence at an effective ₹249 per month.",
    features: [
      "Everything in Monthly",
      "Effective cost ₹249/month",
      "Save ₹600/year vs monthly",
      "Smart catalogue management",
      "QR + WhatsApp customer journey",
      "Ongoing product management",
    ],
    cta: "Choose yearly",
    featured: true,
  },
];

const faqs = [
  {
    question: "What is a Webbanao Digital Showroom?",
    answer:
      "It is your shop's own public online catalogue. Customers browse products through your link or QR code and can contact your shop directly for enquiries.",
  },
  {
    question: "Do customers need to install an app?",
    answer:
      "No. The showroom opens directly in the browser, so customers can browse without installing anything or creating an account.",
  },
  {
    question: "What if I have hundreds of products?",
    answer:
      "Use Smart Excel for bulk onboarding. Shop-specific dropdowns and reusable defaults reduce repetitive data entry, and we also support initial onboarding during your free first month.",
  },
  {
    question: "Can I hide product prices?",
    answer:
      "Yes. Price visibility can be controlled at shop or product level. When a price is hidden, customers can use the Request Price WhatsApp flow.",
  },
  {
    question: "Will Webbanao help with first-time setup?",
    answer:
      "Yes. Your free first month includes shop onboarding and initial product onboarding assistance so you can get live faster.",
  },
];

function CheckIcon({ light = false }: { light?: boolean }) {
  return (
    <svg
      className={light ? "h-5 w-5 shrink-0 text-emerald-300" : "h-5 w-5 shrink-0 text-emerald-600"}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".13" />
      <path
        d="m6.25 10.1 2.25 2.25 5.25-5.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L4 20.5l1.3-4A8.4 8.4 0 1 1 20.5 11.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.9.9c.3.1.4.3.4.5 0 .3-.1 1.3-.8 1.8-.5.5-1.3.8-2.1.7-1.1-.1-2.7-.6-4.6-2.2-2.2-1.9-3.5-4.4-3.6-5.7 0-.6.1-1 .5-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#fbfcff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl">
        <Container className="flex min-h-[72px] items-center justify-between gap-4">
          <Link href="/" aria-label="Webbanao home">
            <WebbanaoLogo compact />
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex"
            aria-label="Main navigation"
          >
            <a className="transition hover:text-indigo-700" href="#features">
              Features
            </a>
            <a className="transition hover:text-indigo-700" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-indigo-700" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-indigo-700" href="#faq">
              FAQs
            </a>
            <a className="transition hover:text-indigo-700" href="#contact">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 sm:inline-flex"
            >
              Merchant login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Register shop
            </Link>
          </div>
        </Container>
      </header>

      <section className="relative isolate border-b border-slate-200/80 bg-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,.17),transparent_27%),radial-gradient(circle_at_88%_13%,rgba(99,102,241,.15),transparent_28%),linear-gradient(to_bottom,#ffffff,#f8fbff)]" />
        <Container className="grid items-center gap-12 py-14 sm:py-18 lg:grid-cols-[.92fr_1.08fr] lg:gap-14 lg:py-20 xl:py-24">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-800">
                For local shops, boutiques & retailers
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                First month free
              </span>
            </div>

            <h1 className="mt-6 max-w-2xl text-[2.75rem] font-black tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-[3.7rem] lg:leading-[1.02] xl:text-[4rem]">
              Take your shop online with its own
              <span className="mt-1 block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Digital Showroom.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-700">
              Share products by link, QR and WhatsApp — without building a full e-commerce website.
            </p>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Give your physical shop a branded digital showroom where customers can browse your products anytime and enquire directly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-base font-bold text-white shadow-xl shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                Start your free month
                <ArrowIcon />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-lg"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm font-medium text-slate-600 sm:grid-cols-3">
              {[
                "Shop onboarding support",
                "Initial product onboarding",
                "No customer app required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[760px]">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-cyan-200/50 via-indigo-200/45 to-violet-200/35 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/90 bg-white p-2.5 shadow-[0_30px_80px_rgba(15,23,42,.18)] ring-1 ring-slate-200/70">
              <Image
                src="/images/webbanao-premium-showroom.jpg"
                alt="Premium Webbanao digital showroom example displayed on laptop and mobile with QR and WhatsApp customer journey"
                width={800}
                height={410}
                priority
                className="h-auto w-full rounded-[1.45rem] object-cover"
              />
            </div>

            <div className="absolute -bottom-6 left-5 right-5 grid gap-2 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:left-10 sm:right-10 sm:grid-cols-3">
              {[
                ["QR ready", "Share anywhere"],
                ["WhatsApp", "Direct enquiries"],
                ["Smart setup", "We help onboard"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-extrabold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>

        <Container className="pb-8 pt-3 sm:pb-10">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
            {shopTypes.slice(0, 6).map((type) => (
              <div
                key={type}
                className="rounded-xl px-3 py-3 text-center text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
              >
                {type}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#07152f] py-5 text-white">
        <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-200">
            Built for local retailers who want a professional digital presence without managing a complex e-commerce website.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-white"
          >
            See simple pricing <ArrowIcon />
          </a>
        </Container>
      </section>

      <section id="features" className="py-18 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Everything your shop needs"
            title="A smarter way to showcase products and stay connected with customers."
            description="Your customer gets a clean showroom experience. You keep control of your catalogue, images, prices and enquiries."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_50px_rgba(79,70,229,.10)]"
              >
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-gradient-to-bl from-indigo-50 to-transparent blur-2xl" />
                <span className="relative inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-indigo-50 px-2 text-xs font-black text-indigo-700">
                  {feature.number}
                </span>
                <h3 className="relative mt-6 text-xl font-extrabold tracking-[-0.02em] text-slate-950">
                  {feature.title}
                </h3>
                <p className="relative mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200/80 bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">
                Designed around real shop needs
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                One platform. A catalogue structure that adapts to the business.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-600">
                Jewellery needs Gold, Silver, Diamond and Purity. Garments need Men, Women, Kids and Size.
                Webbanao adapts instead of forcing every merchant into the same generic product form.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {shopTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="py-18 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Get started in minutes"
            title="From shop registration to customer-ready in three simple steps."
            description="We help with the first setup so you can focus on your shop instead of learning another complicated system."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Register your shop",
                text: "Tell us your business type. Your showroom gets relevant catalogue categories and product structure.",
              },
              {
                step: "02",
                title: "We help with onboarding",
                text: "During your free first month, we support shop setup and initial product onboarding, including Smart Excel bulk upload.",
              },
              {
                step: "03",
                title: "Share and grow",
                text: "Share your unique QR or showroom link. Customers browse products and enquire directly on WhatsApp.",
              },
            ].map((item) => (
              <article
                key={item.step}
                className="relative overflow-hidden rounded-[1.7rem] border border-slate-800 bg-gradient-to-br from-[#07152f] to-[#101a3b] p-7 text-white shadow-xl"
              >
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl" />
                <span className="relative text-5xl font-black tracking-tighter text-white/10">
                  {item.step}
                </span>
                <h3 className="relative mt-5 text-xl font-extrabold">{item.title}</h3>
                <p className="relative mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#0284c7] py-16 text-white sm:py-20">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-300/10 blur-3xl" />
        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-[1fr_.86fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-200">
                Onboarding without the headache
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                Hundreds of products? You do not have to enter them one by one.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-100">
                Smart Excel reduces repetitive typing with business-specific dropdowns and reusable defaults.
                During your free first month, our team can also support the initial product onboarding.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
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
          </div>
        </Container>
      </section>

      <section id="pricing" className="bg-white py-18 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Simple & transparent pricing"
            title="Start free. Continue with the plan that fits your shop."
            description="Your first month is focused on getting the showroom live with onboarding support before you choose a paid plan."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.featured
                    ? "relative flex h-full flex-col rounded-[1.8rem] border border-indigo-500 bg-gradient-to-br from-[#07152f] via-[#10164a] to-[#24207a] p-7 text-white shadow-[0_24px_70px_rgba(49,46,129,.28)] ring-1 ring-indigo-400/40"
                    : "flex h-full flex-col rounded-[1.8rem] border border-slate-200 bg-white p-7 shadow-[0_10px_35px_rgba(15,23,42,.06)]"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={
                      plan.featured
                        ? "rounded-full bg-violet-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                        : "rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700"
                    }
                  >
                    {plan.tag}
                  </span>
                  {plan.featured ? (
                    <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-[10px] font-black text-emerald-950">
                      Save ₹600/year
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-6 text-2xl font-extrabold tracking-tight">{plan.name}</h3>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-[-0.04em]">{plan.price}</span>
                  <span className={plan.featured ? "pb-1 text-sm text-slate-300" : "pb-1 text-sm text-slate-500"}>
                    {plan.suffix}
                  </span>
                </div>
                <p className={plan.featured ? "mt-4 min-h-20 text-sm leading-6 text-slate-300" : "mt-4 min-h-20 text-sm leading-6 text-slate-600"}>
                  {plan.description}
                </p>

                <div className={plan.featured ? "my-6 h-px bg-white/15" : "my-6 h-px bg-slate-200"} />

                <div className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon light={plan.featured} />
                      <span className={plan.featured ? "font-medium text-slate-200" : "font-medium text-slate-700"}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/register"
                  className={
                    plan.featured
                      ? "mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black !text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                      : "mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5"
                  }
                >
                  {plan.cta}
                  <ArrowIcon />
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-7 text-center text-sm font-medium text-slate-500">
            After the free first month, choose monthly or yearly billing to continue your Digital Showroom.
          </p>
        </Container>
      </section>

      <section id="faq" className="border-y border-slate-200/80 bg-slate-50 py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-indigo-600">
                Frequently asked questions
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                Questions shop owners usually want answered.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-slate-600">
                The product is designed to stay simple for merchants and customers. For anything else, you can contact Webbanao directly.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:border-indigo-200 open:shadow-md"
                >
                  <summary className="cursor-pointer list-none font-bold text-slate-950">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="contact" className="bg-white py-16 sm:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-[#07152f] via-[#0c1734] to-[#17164b] px-6 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,.22)] sm:px-10 sm:py-12 lg:px-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid gap-9 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300">
                  Ready to launch your shop?
                </p>
                <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                  Start your first month free and let us help build your initial digital showroom.
                </h2>
                <p className="mt-5 max-w-2xl leading-7 text-slate-300">
                  Register your shop now, or contact Webbanao if you want to discuss your catalogue and onboarding first.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Contact us</p>
                <a
                  href="tel:+919168720245"
                  className="mt-2 block text-2xl font-black tracking-tight text-white transition hover:text-cyan-300"
                >
                  +91 9168720245
                </a>

                <div className="mt-5 grid gap-3">
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black !text-slate-950 shadow-lg transition hover:bg-slate-100"
                  >
                    Register your shop
                    <ArrowIcon />
                  </Link>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
                  >
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
            <a href="#faq" className="hover:text-indigo-700">FAQs</a>
            <a href="#contact" className="hover:text-indigo-700">Contact</a>
            <Link href="/login" className="hover:text-indigo-700">Merchant login</Link>
          </div>
          <p className="text-xs font-medium text-slate-400">© 2026 Webbanao. Digital Showroom.</p>
        </Container>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Webbanao on WhatsApp"
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500 px-5 text-sm font-black text-white shadow-[0_16px_40px_rgba(5,150,105,.28)] transition hover:-translate-y-0.5 hover:bg-emerald-600"
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
    </main>
  );
}
