import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { Badge, Container } from "@/components/ui";

const items = [
  { label: "Overview", href: "/admin" },
  { label: "Shops", href: "/admin/shops" },
  { label: "Plans", href: "/admin/plans" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Referrals", href: "/admin/referrals" },
  { label: "Business categories", href: "/admin/categories" },
  { label: "Platform analytics", href: "/admin/analytics" },
];

export function AdminShell({
  children,
  adminName,
}: {
  children: ReactNode;
  adminName: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to admin content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Digital Showroom Admin</p>
            <p className="text-xs text-muted">Platform operations</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">ADMIN</Badge>
            <span className="hidden text-sm text-muted sm:inline">{adminName}</span>
            <AdminLogoutButton />
          </div>
        </Container>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
          <nav
            aria-label="Platform administration"
            className="flex gap-1 overflow-x-auto p-3 lg:grid lg:gap-1 lg:p-4"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="admin-main" className="min-w-0">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
