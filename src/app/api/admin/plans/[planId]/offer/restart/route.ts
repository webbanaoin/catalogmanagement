import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { newOfferWindow, validateOfferPrices } from "@/server/subscriptions/plan-offers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { planId } = await context.params;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError({ code: "PLAN_NOT_FOUND", message: "Plan not found.", status: 404 });
    }
    validateOfferPrices(plan, true);
    const window = newOfferWindow(plan.offerDurationDays);
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.plan.update({
        where: { id: planId },
        data: { offerEnabled: true, ...window },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "PLAN_OFFER_RESTARTED",
          entityType: "Plan",
          entityId: planId,
          metadata: {
            previousEndsAt: plan.offerEndsAt?.toISOString() ?? null,
            startsAt: window.offerStartsAt.toISOString(),
            endsAt: window.offerEndsAt.toISOString(),
            durationDays: plan.offerDurationDays,
          },
        },
      });
      return next;
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        offerEnabled: updated.offerEnabled,
        offerDurationDays: updated.offerDurationDays,
        offerStartsAt: updated.offerStartsAt,
        offerEndsAt: updated.offerEndsAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
