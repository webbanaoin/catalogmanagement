import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import {
  getAdminOnboardingCapacity,
  requireAdminOnboardingShop,
} from "@/server/admin/shop-onboarding";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { confirmStoredProductImport } from "@/server/import/confirm-product-import";
import { enforceRateLimit } from "@/server/security/rate-limit";

export async function POST(
  _request: Request,
  context: { params: Promise<{ shopId: string; jobId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId, jobId } = await context.params;
    await requireAdminOnboardingShop(shopId);

    enforceRateLimit(
      `admin:imports:confirm:${shopId}:${admin.id}`,
      30,
      15 * 60 * 1000,
    );

    const capacity = await getAdminOnboardingCapacity(shopId);
    const result = await confirmStoredProductImport({
      shopId,
      jobId,
      productLimit: capacity.limit,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        shopId,
        action: "ADMIN_PRODUCT_IMPORT_COMPLETED",
        entityType: "ImportJob",
        entityId: jobId,
        metadata: {
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          onboardingPlanName: capacity.plan.name,
          productLimit: capacity.limit,
        },
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
