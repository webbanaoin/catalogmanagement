import Link from "next/link";
import type { ReactNode } from "react";

import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { Badge, Container } from "@/components/ui";
import { cn } from "@/lib/cn";

interface DashboardNavigationItem {
  label: string;
  href?: string;
  badge?: string;
}

const navigationItems: DashboardNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/dashboard/products", badge: "Ready" },
  { label: "Categories", href: "/dashboard/categories", badge: "Ready" },
  { label: "Excel Import", href: "/dashboard/import", badge: "Sprint 4" },
  { label: "QR", href: "/dashboard/qr", badge: "Sprint 4" },
  { label: "Shop Profile", href: "/dashboard/shop", badge: "Ready" },
  { label: "Analytics", href: "/dashboard/analytics", badge: "Ready" },
  { label: "Subscription", href: "/dashboard/subscription", badge: "Ready" },
];

function DashboardNavigation({ compact = false }: { compact?: boolean }) {
  return (
    <nav aria-label="Merchant dashboard" className={cn(compact ? "grid gap-1" : "space-y-1")}>
      {navigationItems.map((item) => {
        const itemClasses = cn(
          "flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium",
          item.href
            ? "text-foreground hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            : "text-muted",
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className={itemClasses}>
            <span>{item.label}</span>
            {item.badge ? <Badge variant="info">{item.badge}</Badge> : null}
          </Link>
        ) : (
          <span key={item.label} className={itemClasses}>
            <span>{item.label}</span>
            <Badge>{item.badge ?? "Later sprint"}</Badge>
          </span>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur lg:hidden">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Digital Showroom</p>
            <p className="text-xs text-muted">Merchant dashboard</p>
          </div>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-2 shadow-lg">
              <DashboardNavigation compact />
            </div>
          </details>
        </Container>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="border-b border-border px-6 py-6">
            <p className="text-base font-semibold text-foreground">Digital Showroom</p>
            <p className="mt-1 text-xs text-muted">Merchant dashboard</p>
          </div>
          <div className="flex-1 p-4">
            <DashboardNavigation />
          </div>
          <div className="border-t border-border p-4 text-xs leading-5 text-muted">
            Sprint 6 release candidate: merchant catalogue, sharing, analytics and subscription workflows are connected for final validation.
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <PwaInstallPrompt
            mode="merchant"
            className="mx-4 mt-4 sm:mx-6 lg:mx-8"
          />
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
