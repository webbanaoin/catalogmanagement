import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminBusinessCategoryUpdateSchema } from "@/validation/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const input = adminBusinessCategoryUpdateSchema.parse(
      await readJsonBody(request),
    );

    const current = await prisma.businessCategory.findUnique({
      where: { id: categoryId },
    });
    if (!current) {
      throw new AppError({
        code: "BUSINESS_CATEGORY_NOT_FOUND",
        message: "Business category not found",
        status: 404,
      });
    }

    const slug =
      input.slug !== undefined ? toSlug(input.slug) : current.slug;

    if (slug !== current.slug) {
      const duplicate = await prisma.businessCategory.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== current.id) {
        throw new AppError({
          code: "BUSINESS_CATEGORY_SLUG_CONFLICT",
          message: "A business category with this slug already exists",
          status: 409,
        });
      }
    }

    const data = await prisma.$transaction(async (tx) => {
      const category = await tx.businessCategory.update({
        where: { id: categoryId },
        data: {
          ...input,
          ...(input.slug !== undefined ? { slug } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_CATEGORY_UPDATED",
          entityType: "BusinessCategory",
          entityId: category.id,
          metadata: {
            previousSlug: current.slug,
            slug: category.slug,
            previousStatus: current.status,
            status: category.status,
            previousDisplayOrder: current.displayOrder,
            displayOrder: category.displayOrder,
          },
        },
      });

      return category;
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(
        new AppError({
          code: "BUSINESS_CATEGORY_SLUG_CONFLICT",
          message: "A business category with this slug already exists",
          status: 409,
        }),
      );
    }

    return errorResponse(error);
  }
}
