import Link from "next/link";
import type { ReactNode } from "react";

import { MerchantLogoutButton } from "@/components/auth/merchant-logout-button";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { MobileMerchantMenu } from "@/components/dashboard/mobile-merchant-menu";
import { Container } from "@/components/ui";
import { cn } from "@/lib/cn";

interface DashboardNavigationItem {
  label: string;
  href?: string;
}

const navigationItems: DashboardNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/dashboard/products" },
  { label: "Categories", href: "/dashboard/categories" },
  { label: "Excel Import", href: "/dashboard/import" },
  { label: "QR", href: "/dashboard/qr" },
  { label: "Shop Profile", href: "/dashboard/shop" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Subscription", href: "/dashboard/subscription" },
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
          </Link>
        ) : (
          <span key={item.label} className={itemClasses}>
            <span>{item.label}</span>
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
          <MobileMerchantMenu>
            <DashboardNavigation compact />
            <div className="mt-2 border-t border-border pt-2">
              <MerchantLogoutButton className="w-full justify-center" />
            </div>
          </MobileMerchantMenu>
        </Container>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:self-start lg:flex lg:flex-col">
          <div className="border-b border-border px-6 py-6">
            <p className="text-base font-semibold text-foreground">Digital Showroom</p>
            <p className="mt-1 text-xs text-muted">Merchant dashboard</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <DashboardNavigation />
          </div>
          <div className="shrink-0 border-t border-border bg-surface p-4">
            <MerchantLogoutButton className="w-full justify-center" />
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
