import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import {
  getAdminOnboardingCapacity,
  requireAdminOnboardingShop,
} from "@/server/admin/shop-onboarding";
import { errorResponse } from "@/server/http/error-response";
import { confirmStoredProductImport } from "@/server/import/confirm-product-import";
import { enforceRateLimit } from "@/server/security/rate-limit";

export async function POST(
  _request: Request,
  context: { params: Promise<{ shopId: string; jobId: string }> },
) {
  let diagnosticStage = "authorization";
  try {
    const admin = await requirePlatformAdmin();
    const { shopId, jobId } = await context.params;
    await requireAdminOnboardingShop(shopId);

    enforceRateLimit(
      `admin:imports:confirm:${shopId}:${admin.id}`,
      30,
      15 * 60 * 1000,
    );

    diagnosticStage = "get-onboarding-capacity";
    const capacity = await getAdminOnboardingCapacity(shopId);
    diagnosticStage = "confirm-import";
    const result = await confirmStoredProductImport({
      shopId,
      jobId,
      productLimit: capacity.limit,
      adminAudit: {
        actorUserId: admin.id,
        onboardingPlanName: capacity.plan.name,
        capacitySource: capacity.capacitySource,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (
      !(error instanceof Error && error.name === "AppError") &&
      diagnosticStage !== "confirm-import"
    ) {
      console.error("[admin/import/confirm] Unexpected failure", {
        stage: diagnosticStage,
        errorType: error instanceof Error ? error.name : typeof error,
        errorCode:
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : null,
      });
    }
    return errorResponse(error);
  }
}
