import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { listBusinessCategoryDefaults } from "@/server/catalog/business-category-defaults";
import { normalizeCategoryName } from "@/server/catalog/category-name";
import { validateDefaultCategoryParent } from "@/server/catalog/default-category-tree";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminDefaultCategoryUpdateSchema } from "@/validation/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string; defaultId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId, defaultId } = await context.params;
    const input = adminDefaultCategoryUpdateSchema.parse(await readJsonBody(request));
    const data = await prisma.$transaction(async (tx) => {
      const category = await tx.businessCategory.findUnique({
        where: { id: categoryId }, select: { id: true, name: true, slug: true },
      });
      if (!category) throw new AppError({
        code: "BUSINESS_CATEGORY_NOT_FOUND", message: "Business type not found", status: 404,
      });
      const defaults = await listBusinessCategoryDefaults(tx, category);
      const current = defaults.find((item) => item.id === defaultId);
      if (!current) throw new AppError({
        code: "DEFAULT_CATEGORY_NOT_FOUND", message: "Subcategory not found", status: 404,
      });
      if (input.status === "INACTIVE" &&
        defaults.some((item) => item.parentId === defaultId && item.status === "ACTIVE")) {
        throw new AppError({
          code: "DEFAULT_CATEGORY_HAS_ACTIVE_CHILDREN",
          message: "Deactivate its child categories first before disabling a parent category.",
          status: 409,
        });
      }
      if (input.parentId !== undefined) {
        const parentError = validateDefaultCategoryParent(defaults, defaultId, input.parentId);
        if (parentError) throw new AppError({
          code: "INVALID_DEFAULT_CATEGORY_PARENT", message: parentError, status: 400,
        });
      }
      if (input.name && defaults.some((item) =>
        item.id !== defaultId &&
        normalizeCategoryName(item.name) === normalizeCategoryName(input.name!)
      )) throw new AppError({
        code: "DEFAULT_CATEGORY_CONFLICT", message: "A subcategory with this name already exists.",
        status: 409,
      });
      const updated = await tx.businessCategoryDefault.update({
        where: { id: defaultId }, data: input,
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_DEFAULT_CATEGORY_UPDATED",
          entityType: "BusinessCategoryDefault",
          entityId: defaultId,
          metadata: {
            businessCategoryId: categoryId,
            previousName: current.name, name: updated.name,
            previousStatus: current.status, status: updated.status,
            previousDisplayOrder: current.displayOrder, displayOrder: updated.displayOrder,
          },
        },
      });
      return updated;
    });
    return NextResponse.json({ data });
  } catch (error) { return errorResponse(error); }
}
