import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { AppError } from "@/server/http/app-error";

export const metadata: Metadata = {
  title: "Platform Admin | Digital Showroom",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    const admin = await requirePlatformAdmin();
    return <AdminShell adminName={admin.name}>{children}</AdminShell>;
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      if (error.code === "FORBIDDEN") notFound();
    }
    throw error;
  }
}
