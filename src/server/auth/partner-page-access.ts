import "server-only";

import { redirect } from "next/navigation";

import { AppError } from "@/server/http/app-error";
import { requireReferralPartner } from "@/server/auth/partner-access";

export async function requireReferralPartnerPageAccess() {
  try {
    return await requireReferralPartner();
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "PARTNER_PENDING_APPROVAL") {
        redirect("/partner/pending");
      }
      if (
        error.code === "UNAUTHENTICATED" ||
        error.code === "PARTNER_ACCESS_UNAVAILABLE"
      ) {
        redirect("/partner/login");
      }
    }
    throw error;
  }
}
