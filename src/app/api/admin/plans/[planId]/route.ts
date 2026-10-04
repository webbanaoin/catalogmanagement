import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminPlanUpdateSchema } from "@/validation/subscriptions";

function serializePlan<T extends { monthlyPrice: { toString(): string }; annualPrice: { toString(): string } }>(
  plan: T,
) {
  return {
    ...plan,
    monthlyPrice: plan.monthlyPrice.toString(),
    annualPrice: plan.annualPrice.toString(),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { planId } = await context.params;
    const input = adminPlanUpdateSchema.parse(await readJsonBody(request));

    const current = await prisma.plan.findUnique({ where: { id: planId } });
    if (!current) {
      throw new AppError({
        code: "PLAN_NOT_FOUND",
        message: "Plan not found",
        status: 404,
      });
    }

    const nextSlug =
      input.slug !== undefined ? toSlug(input.slug) : current.slug;
    const nextTrialDays = input.trialDays ?? current.trialDays;
    const nextStatus = input.status ?? current.status;
    const nextDefault = input.isDefaultTrial ?? current.isDefaultTrial;

    if (nextDefault && (nextStatus !== "ACTIVE" || nextTrialDays <= 0)) {
      throw new AppError({
        code: "INVALID_DEFAULT_TRIAL_PLAN",
        message: "The default trial plan must be ACTIVE and have at least one trial day",
        status: 400,
      });
    }

    if (nextSlug !== current.slug) {
      const duplicate = await prisma.plan.findUnique({
        where: { slug: nextSlug },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== current.id) {
        throw new AppError({
          code: "PLAN_SLUG_CONFLICT",
          message: "A plan with this slug already exists",
          status: 409,
        });
      }
    }

    const data = await prisma.$transaction(async (tx) => {
      if (nextDefault) {
        await tx.plan.updateMany({
          where: { isDefaultTrial: true, id: { not: planId } },
          data: { isDefaultTrial: false },
        });
      }

      const plan = await tx.plan.update({
        where: { id: planId },
        data: {
          ...input,
          ...(input.slug !== undefined ? { slug: nextSlug } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "PLAN_UPDATED",
          entityType: "Plan",
          entityId: plan.id,
          metadata: {
            previousSlug: current.slug,
            slug: plan.slug,
            previousStatus: current.status,
            status: plan.status,
            previousDefaultTrial: current.isDefaultTrial,
            isDefaultTrial: plan.isDefaultTrial,
          },
        },
      });

      return plan;
    });

    return NextResponse.json({ data: serializePlan(data) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(
        new AppError({
          code: "PLAN_SLUG_CONFLICT",
          message: "A plan with this slug already exists",
          status: 409,
        }),
      );
    }

    return errorResponse(error);
  }
}
