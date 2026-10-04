import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminPlanCreateSchema } from "@/validation/subscriptions";

function serializePlan<T extends { monthlyPrice: { toString(): string }; annualPrice: { toString(): string } }>(
  plan: T,
) {
  return {
    ...plan,
    monthlyPrice: plan.monthlyPrice.toString(),
    annualPrice: plan.annualPrice.toString(),
  };
}

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();

    const items = await prisma.plan.findMany({
      orderBy: [{ status: "asc" }, { monthlyPrice: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items: items.map(serializePlan) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const input = adminPlanCreateSchema.parse(await readJsonBody(request));
    const slug = toSlug(input.slug ?? input.name);

    if (input.isDefaultTrial && (input.status !== "ACTIVE" || input.trialDays <= 0)) {
      throw new AppError({
        code: "INVALID_DEFAULT_TRIAL_PLAN",
        message: "The default trial plan must be ACTIVE and have at least one trial day",
        status: 400,
      });
    }

    const duplicate = await prisma.plan.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError({
        code: "PLAN_SLUG_CONFLICT",
        message: "A plan with this slug already exists",
        status: 409,
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      if (input.isDefaultTrial) {
        await tx.plan.updateMany({
          where: { isDefaultTrial: true },
          data: { isDefaultTrial: false },
        });
      }

      const plan = await tx.plan.create({
        data: {
          ...input,
          slug,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "PLAN_CREATED",
          entityType: "Plan",
          entityId: plan.id,
          metadata: {
            slug: plan.slug,
            status: plan.status,
            isDefaultTrial: plan.isDefaultTrial,
          },
        },
      });

      return plan;
    });

    return NextResponse.json({ data: serializePlan(data) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
