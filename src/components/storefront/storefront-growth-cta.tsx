import Link from "next/link";

import { Container } from "@/components/ui";

/** One optional platform growth banner after shop content; never a popup. */
export function StorefrontGrowthCTA({ shopSlug }: { shopSlug: string }) {
  const query = new URLSearchParams({
    utm_source: "merchant_showroom",
    utm_medium: "storefront_growth",
    utm_campaign: "webbanao_showroom",
    source_shop: shopSlug,
  }).toString();

  return (
    <section aria-labelledby="webbanao-growth-title" className="py-7 sm:py-10">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary-soft via-surface to-surface px-5 py-7 shadow-[0_18px_48px_rgba(23,32,29,0.08)] sm:px-8 sm:py-9 lg:px-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary sm:text-xs">
                ✦ Webbanao Digital Showroom
              </p>
              <h2 id="webbanao-growth-title" className="storefront-heading mt-3 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
                Love this Digital Showroom? Give your business one too!
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-strong sm:text-base">
                Your shop, your products and your own shareable catalogue.
                Reach customers with a simple link, QR code and WhatsApp.
              </p>
              <p className="mt-3 text-xs font-semibold text-primary sm:text-sm">
                Free trial · Easy setup · Onboarding support
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/register?${query}`}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center text-base font-extrabold text-primary-foreground shadow-[0_12px_30px_rgba(23,79,67,0.2)] transition hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_16px_32px_rgba(23,79,67,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                Create My Digital Showroom <span aria-hidden="true">→</span>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/partner/register?${query}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-surface px-3 py-2 text-center text-sm font-bold text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Earn with Us <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href={`/?${query}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Explore Webbanao Digital Showroom <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <p className="text-center text-xs leading-5 text-muted">
                Know a business owner? Share Webbanao or join our marketing partner program.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
