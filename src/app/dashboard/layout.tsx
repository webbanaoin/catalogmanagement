import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { requireCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  let user;

  try {
    user = await requireCurrentUser();
  } catch {
    redirect("/login");
  }

  const hasUsableShop = user.shops.some(
    (shop) => shop.status === "APPROVED" || shop.status === "ACTIVE",
  );

  if (!hasUsableShop) {
    const hasPendingShop = user.shops.some((shop) => shop.status === "PENDING");
    redirect(hasPendingShop ? "/pending-approval" : "/login?reason=shop-unavailable");
  }

  return (
    <>
      <ServiceWorkerRegistration scope="/dashboard" />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
