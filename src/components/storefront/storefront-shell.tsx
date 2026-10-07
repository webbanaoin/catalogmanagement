import Link from "next/link";
import type { ReactNode } from "react";

import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { Container } from "@/components/ui";

export function StorefrontShell({
  children,
  homeHref = "/",
  label = "Digital Showroom",
  shopSlug,
}: {
  children: ReactNode;
  homeHref?: string;
  label?: string;
  shopSlug?: string;
}) {
  return (
    <div className="storefront-theme min-h-screen bg-background">
      <a
        href="#storefront-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-xl"
      >
        Skip to catalogue
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 shadow-[0_1px_0_rgba(23,32,29,0.02)] backdrop-blur-xl">
        <Container className="flex min-h-16 items-center justify-between gap-3 sm:min-h-[4.5rem]">
          <Link
            href={homeHref}
            className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-surface shadow-sm transition-transform group-hover:-translate-y-0.5 sm:size-10">
              {label.trim().charAt(0).toUpperCase() || "D"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-[-0.02em] text-foreground sm:text-[15px]">
                {label}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:text-[11px]">
                Digital Showroom
              </span>
            </span>
          </Link>

          <Link
            href={homeHref}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary sm:px-4 sm:text-sm"
          >
            Browse collection
          </Link>
        </Container>
      </header>

      <main id="storefront-main">{children}</main>

      <footer className="mt-8 border-t border-border bg-surface/90 py-8 sm:mt-12 sm:py-10">
        <Container>
          {shopSlug ? (
            <PwaInstallPrompt
              mode="shop"
              shopSlug={shopSlug}
              className="mx-auto mb-7 max-w-2xl"
            />
          ) : null}

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-surface">
              {label.trim().charAt(0).toUpperCase() || "D"}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                A curated digital showroom designed for effortless product discovery.
              </p>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Powered by Digital Showroom
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}

export function StorefrontHeroSkeleton() {
  return (
    <section aria-label="Loading storefront header" className="storefront-theme bg-background">
      <Container className="py-4 sm:py-6">
        <div className="aspect-[4/3] w-full animate-pulse rounded-[1.75rem] bg-surface-muted sm:aspect-[16/7] lg:aspect-[16/6]" />
        <div className="relative -mt-8 mx-3 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:-mt-12 sm:mx-6 sm:p-5">
          <div className="flex items-end gap-4">
            <div className="size-16 shrink-0 animate-pulse rounded-2xl bg-surface-muted sm:size-20" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 max-w-full animate-pulse rounded bg-surface-muted" />
              <div className="mt-2 h-3 w-56 max-w-[75%] animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export interface StorefrontSectionProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  tone?: "default" | "soft";
  children: ReactNode;
}

export function StorefrontSection({
  title,
  description,
  eyebrow,
  action,
  tone = "default",
  children,
}: StorefrontSectionProps) {
  return (
    <section
      className={
        tone === "soft"
          ? "border-y border-border/70 bg-surface/55 py-8 sm:py-12"
          : "py-8 sm:py-12"
      }
    >
      <Container>
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary sm:text-xs">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="storefront-heading text-xl font-bold text-foreground sm:text-2xl lg:text-[1.7rem]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children}
      </Container>
    </section>
  );
}

export function StorefrontContentSkeleton() {
  return (
    <div className="storefront-theme space-y-8" aria-label="Loading storefront products">
      <div>
        <div className="h-14 w-full animate-pulse rounded-2xl bg-surface-muted" />
        <div className="mt-4 flex gap-2 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-surface-muted" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="aspect-square animate-pulse bg-surface-muted" />
            <div className="space-y-2 p-3.5 sm:p-4">
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
