import "server-only";

import { redirect } from "next/navigation";

import { AppError } from "@/server/http/app-error";
import { requirePlatformAdmin } from "@/server/auth/admin-access";

export async function requirePlatformAdminPageAccess() {
  try {
    return await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login");
      }
      if (error.code === "FORBIDDEN") {
        redirect("/access-denied?area=admin");
      }
    }

    throw error;
  }
}
