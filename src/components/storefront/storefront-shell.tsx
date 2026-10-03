import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui";

export function StorefrontShell({
  children,
  homeHref = "/",
  label = "Digital Showroom",
}: {
  children: ReactNode;
  homeHref?: string;
  label?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <Container className="flex min-h-14 items-center justify-between gap-4">
          <Link
            href={homeHref}
            className="text-sm font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {label}
          </Link>
          <p className="text-xs text-muted">Public catalogue</p>
        </Container>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-surface py-6">
        <Container>
          <p className="text-center text-xs text-muted">
            Browse this shop&apos;s current Digital Showroom catalogue.
          </p>
        </Container>
      </footer>
    </div>
  );
}

export function StorefrontHeroSkeleton() {
  return (
    <section aria-label="Loading storefront header" className="border-b border-border bg-surface">
      <Container className="py-4 sm:py-6">
        <div className="aspect-[16/6] w-full animate-pulse rounded-2xl bg-surface-muted sm:aspect-[16/5]" />
        <div className="relative -mt-7 flex items-end gap-4 px-3 sm:-mt-9 sm:px-5">
          <div className="size-16 shrink-0 animate-pulse rounded-2xl border-4 border-surface bg-surface-muted shadow-sm sm:size-20" />
          <div className="min-w-0 flex-1 pb-1">
            <div className="h-5 w-40 max-w-full animate-pulse rounded bg-surface-muted" />
            <div className="mt-2 h-3 w-56 max-w-[75%] animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      </Container>
    </section>
  );
}

export interface StorefrontSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function StorefrontSection({ title, description, action, children }: StorefrontSectionProps) {
  return (
    <section className="py-6 sm:py-8">
      <Container>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
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
    <div className="space-y-8" aria-label="Loading storefront products">
      <div>
        <div className="h-11 w-full animate-pulse rounded-lg bg-surface-muted" />
        <div className="mt-4 flex gap-2 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-surface-muted" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="aspect-square animate-pulse bg-surface-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
