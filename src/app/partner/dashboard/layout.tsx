import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Badge, Container } from "@/components/ui";
import { PartnerLogoutButton } from "@/components/partner/partner-logout-button";
import { requireReferralPartnerPageAccess } from "@/server/auth/partner-page-access";

export const metadata: Metadata = {
  title: "Marketing Partner | Webbanao Digital Showroom",
  robots: { index: false, follow: false },
};

export default async function PartnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireReferralPartnerPageAccess();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Webbanao Marketing Partner
            </p>
            <p className="text-xs text-muted">
              Referrals, earnings and payouts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">PARTNER</Badge>
            <span className="hidden text-sm text-muted sm:inline">
              {user.name}
            </span>
            <PartnerLogoutButton />
          </div>
        </Container>
      </header>
      <main>
        <Container className="py-6 sm:py-8">{children}</Container>
      </main>
    </div>
  );
}
