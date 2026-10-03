import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <ServiceWorkerRegistration scope="/dashboard" />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
