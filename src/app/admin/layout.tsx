import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";

export const metadata: Metadata = {
  title: "Platform Admin | Digital Showroom",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdminPageAccess();

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
