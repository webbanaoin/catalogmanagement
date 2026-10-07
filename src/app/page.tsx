import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { WebbanaoLogo } from "@/components/brand/webbanao-logo";
import { Badge, Container, buttonClassName } from "@/components/ui";

export const metadata: Metadata = {
  title: "Webbanao Digital Showroom | Your Shop, Online",
  description:
    "Give your physical shop its own digital showroom. Share products by QR and link, receive WhatsApp enquiries, manage prices and catalogues, and start with one month free onboarding support.",
};

const whatsappUrl =
  "https://wa.me/919168720245?text=Hi%20Webbanao%2C%20I%20want%20to%20know%20more%20about%20the%20Digital%20Showroom.";

const features = [
  {
    number: "01",
    title: "Your own digital showroom",
    description:
      "Every shop gets its own public catalogue with shop branding, products, categories, opening hours and a shareable link.",
  },
  {
    number: "02",
    title: "QR + link sharing",
    description:
      "Customers can open the showroom from a QR code or direct link. No customer app or account is required to browse.",
  },
  {
    number: "03",
    title: "Smart bulk onboarding",
    description:
      "Upload products using Smart Excel with shop-specific categories, dropdowns and Quick Defaults that reduce repetitive typing.",
  },
  {
    number: "04",
    title: "WhatsApp enquiries",
    description:
      "Hide prices when needed and let customers send a ready-made product enquiry directly to the shop on WhatsApp.",
  },
  {
    number: "05",
    title: "Built for different businesses",
    description:
      "Jewellery, garments, toys, electronics and other shop types get relevant product groups, categories and product details.",
  },
  {
    number: "06",
    title: "Easy day-to-day management",
    description:
      "Add or edit products from mobile, upload multiple images, control visibility, highlight new arrivals and keep the catalogue current.",
  },
];

const shopTypes = [
  "Jewellery",
  "Toys & Gifts",
  "Garments",
  "Footwear",
  "Electronics",
  "Grocery",
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
    eyebrow: "Start here",
    price: "₹0",
    suffix: "first month",
    description:
      "A guided first month to get your shop and initial catalogue online with Webbanao support.",
    features: [
      "1 month free trial",
      "Shop onboarding support",
      "Initial product onboarding assistance",
      "Smart Excel bulk import support",
      "Digital showroom setup",
      "WhatsApp enquiry flow",
    ],
    cta: "Start free month",
    highlighted: false,
  },
  {
    name: "Monthly",
    eyebrow: "Flexible",
    price: "₹299",
    suffix: "per month",
    description:
      "Continue your digital showroom month by month with the core catalogue and customer enquiry experience.",
    features: [
      "Your own digital showroom",
      "Product & category management",
      "QR and shareable shop link",
      "Smart Excel bulk upload",
      "Multiple product images",
      "WhatsApp product enquiries",
    ],
    cta: "Choose monthly",
    highlighted: false,
  },
  {
    name: "Yearly",
    eyebrow: "Best value",
    price: "₹2,988",
    suffix: "per year",
    description:
      "The same digital showroom experience at an effective cost of only ₹249 per month.",
    features: [
      "Equivalent to ₹249/month",
      "Save ₹600 vs monthly plan",
      "Your own digital showroom",
      "Smart catalogue management",
      "QR + WhatsApp customer journey",
      "Ongoing product management",
    ],
    cta: "Choose yearly",
    highlighted: true,
  },
];

const faqs = [
  {
    question: "What is a Webbanao Digital Showroom?",
    answer:
      "It is a public online catalogue dedicated to your shop. Customers browse your products from your shop link or QR code and can contact you directly for enquiries.",
  },
  {
    question: "Do my customers need to install an app?",
    answer:
      "No. The showroom opens in the browser from a link or QR code, so customers can browse without creating an account.",
  },
  {
    question: "What if I have hundreds of products?",
    answer:
      "You can use Smart Excel for bulk onboarding. It provides your shop categories, relevant dropdowns and reusable defaults to reduce manual work.",
  },
  {
    question: "Can I hide product prices?",
    answer:
      "Yes. Price visibility can be controlled at shop or product level. When price is hidden, customers can use the Request Price WhatsApp flow.",
  },
  {
    question: "Will Webbanao help during first-time setup?",
    answer:
      "Yes. The first month includes onboarding support for your shop and initial product catalogue so you are not left to configure everything alone.",
  },
];

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".12" />
      <path d="m6.3 10.1 2.2 2.2 5.2-5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <Container className="flex min-h-18 items-center justify-between gap-4 py-3">
          <Link href="/" aria-label="Webbanao home">
            <WebbanaoLogo compact />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Main navigation">
            <a className="transition hover:text-slate-950" href="#features">Features</a>
            <a className="transition hover:text-slate-950" href="#how-it-works">How it works</a>
            <a className="transition hover:text-slate-950" href="#pricing">Pricing</a>
            <a className="transition hover:text-slate-950" href="#contact">Contact</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClassName("ghost", "sm", "hidden sm:inline-flex")}>
              Merchant login
            </Link>
            <Link href="/register" className={buttonClassName("primary", "sm")}>
              Register shop
            </Link>
          </div>
        </Container>
      </header>

      <section className="relative border-b border-slate-200 bg-[radial-gradient(circle_at_15%_10%,#dbeafe_0,transparent_26%),radial-gradient(circle_at_85%_15%,#ede9fe_0,transparent_24%),linear-gradient(to_bottom,#ffffff,#f8fafc)]">
        <Container className="grid items-center gap-12 py-14 sm:py-18 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Digital Showroom for Physical Shops</Badge>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                First month free
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.04]">
              Your physical shop.
              <span className="block bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Now open digitally.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Give your shop its own branded digital showroom where customers can browse products,
              scan a QR, open your catalogue link and enquire directly on WhatsApp.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className={buttonClassName("primary", "lg", "shadow-lg shadow-teal-900/10")}>
                Start your free month
                <ArrowIcon />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClassName("secondary", "lg")}
              >
                WhatsApp us
                <span className="font-semibold text-emerald-700">9168720245</span>
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {[
                "Shop onboarding support",
                "Product onboarding assistance",
                "No customer app required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-sky-200/50 via-indigo-200/40 to-cyan-100/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-2xl shadow-slate-900/15">
              <Image
                src="/images/webbanao-showroom-hero.svg"
                alt="Webbanao digital showroom displayed on laptop and mobile"
                width={1200}
                height={900}
                priority
                className="h-auto w-full rounded-[1.5rem]"
              />
            </div>

            <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-10 sm:right-auto sm:w-80">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Launch support included</p>
              <p className="mt-1 font-semibold text-slate-950">We help set up your shop and initial products.</p>
              <p className="mt-1 text-sm text-slate-600">You focus on your business. We help you get the first catalogue live.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 py-5 text-white">
        <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-200">
            Built for local retailers who want a digital presence without running a complex e-commerce website.
          </p>
          <a href="#pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            See simple pricing <ArrowIcon />
          </a>
        </Container>
      </section>

      <section id="features" className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Everything your shop needs</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A digital showroom that works like your shop, not like a complicated marketplace.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Your customers browse your shop. You stay in control of products, prices, images and enquiries.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-700">
                    {feature.number}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 transition group-hover:scale-150" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-18">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Made for many shop types</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                One platform. Different catalogue experience for each business.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                A jewellery shop needs Gold, Silver, Diamond and Purity. A garment shop needs Men, Women, Kids and Size.
                Webbanao adapts the catalogue structure to the business instead of forcing every shop into the same form.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {shopTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Simple by design</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From shop registration to customer-ready in three steps.</h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Register your shop",
                text: "Tell us about your business so the showroom can use relevant categories and product structure.",
              },
              {
                step: "02",
                title: "We help with onboarding",
                text: "During the free first month, Webbanao supports initial shop setup and product onboarding, including bulk catalogue assistance.",
              },
              {
                step: "03",
                title: "Share and grow",
                text: "Share your QR or showroom link. Customers browse products and send direct WhatsApp enquiries to your shop.",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-3xl bg-slate-950 p-7 text-white">
                <span className="text-5xl font-black text-white/10">{item.step}</span>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-gradient-to-br from-indigo-700 via-indigo-700 to-sky-600 py-16 text-white sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Onboarding without the headache</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                Hundreds of products? You do not have to start by entering them one by one.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-indigo-100">
                Use Smart Excel with dropdowns and reusable defaults, or take our onboarding support during the first month.
                The goal is simple: reduce typing and get your real catalogue online faster.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
              {[
                "Business-specific categories created for your shop",
                "Smart Excel for fast bulk product onboarding",
                "Common values set once with Quick Defaults",
                "Single products can still be added or edited from mobile",
                "Webbanao onboarding support during the free first month",
              ].map((item) => (
                <div key={item} className="flex gap-3 border-b border-white/10 py-3 last:border-b-0">
                  <CheckIcon />
                  <span className="text-sm font-medium text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="pricing" className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Simple pricing</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Start free. Continue with the plan that fits your shop.</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The first month is designed to get your showroom live with onboarding support before you choose a paid plan.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.highlighted
                    ? "relative rounded-3xl border-2 border-indigo-600 bg-slate-950 p-7 text-white shadow-2xl shadow-indigo-950/20"
                    : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                }
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-white">
                    Best value
                  </span>
                ) : null}
                <p className={plan.highlighted ? "text-xs font-bold uppercase tracking-[0.18em] text-cyan-300" : "text-xs font-bold uppercase tracking-[0.18em] text-indigo-600"}>
                  {plan.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-bold">{plan.name}</h3>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className={plan.highlighted ? "pb-1 text-sm text-slate-300" : "pb-1 text-sm text-slate-500"}>{plan.suffix}</span>
                </div>
                <p className={plan.highlighted ? "mt-4 min-h-20 text-sm leading-6 text-slate-300" : "mt-4 min-h-20 text-sm leading-6 text-slate-600"}>
                  {plan.description}
                </p>

                <div className={plan.highlighted ? "my-6 h-px bg-white/15" : "my-6 h-px bg-slate-200"} />

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon />
                      <span className={plan.highlighted ? "text-slate-200" : "text-slate-700"}>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/register"
                  className={
                    plan.highlighted
                      ? "mt-8 inline-flex h-12 w-full items-center justify-center rounded-lg bg-white px-5 font-semibold text-slate-950 transition hover:bg-slate-100"
                      : buttonClassName("primary", "lg", "mt-8 w-full")
                  }
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            After the free first month, choose monthly or yearly billing to continue using the showroom.
          </p>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Questions before you start?</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">A few things shop owners usually want to know.</h2>
              <p className="mt-4 leading-7 text-slate-600">
                If you need help deciding how your catalogue should work, contact us directly on WhatsApp.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer list-none font-semibold text-slate-950">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-xl text-indigo-600 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="contact" className="py-16 sm:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-14 lg:px-14">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Ready to launch your shop?</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                  Start your first month free and let us help build your initial digital showroom.
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                  Register your shop now, or message Webbanao on WhatsApp if you want to discuss your products and onboarding first.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 font-semibold text-slate-950 transition hover:bg-slate-100">
                  Register your shop
                </Link>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 font-semibold text-white transition hover:bg-white/15"
                >
                  WhatsApp 9168720245
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <WebbanaoLogo compact />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#contact" className="hover:text-slate-900">Contact</a>
            <Link href="/login" className="hover:text-slate-900">Merchant login</Link>
          </div>
          <p className="text-xs text-slate-400">© 2026 Webbanao. Digital Showroom.</p>
        </Container>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Webbanao on WhatsApp"
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-emerald-500 px-5 font-bold text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
      >
        <span className="text-lg">WhatsApp</span>
      </a>
    </main>
  );
}
