import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { listBusinessCategoryDefaults } from "@/server/catalog/business-category-defaults";
import { normalizeCategoryName } from "@/server/catalog/category-name";
import { validateDefaultCategoryParent } from "@/server/catalog/default-category-tree";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminDefaultCategoryCreateSchema } from "@/validation/admin";

async function requireBusinessType(tx: Prisma.TransactionClient, id: string) {
  const category = await tx.businessCategory.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
  if (!category) throw new AppError({
    code: "BUSINESS_CATEGORY_NOT_FOUND", message: "Business type not found", status: 404,
  });
  return category;
}

export async function GET(_request: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const data = await prisma.$transaction(async (tx) => {
      const category = await requireBusinessType(tx, categoryId);
      return {
        businessCategory: category,
        items: await listBusinessCategoryDefaults(tx, category),
      };
    });
    return NextResponse.json(data);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { categoryId } = await context.params;
    const input = adminDefaultCategoryCreateSchema.parse(await readJsonBody(request));
    const slug = toSlug(input.name);
    const data = await prisma.$transaction(async (tx) => {
      const category = await requireBusinessType(tx, categoryId);
      const current = await listBusinessCategoryDefaults(tx, category);
      const parentError = validateDefaultCategoryParent(current, null, input.parentId ?? null);
      if (parentError) throw new AppError({
        code: "INVALID_DEFAULT_CATEGORY_PARENT", message: parentError, status: 400,
      });
      if (current.some((item) =>
        item.slug === slug ||
        normalizeCategoryName(item.name) === normalizeCategoryName(input.name)
      )) throw new AppError({
        code: "DEFAULT_CATEGORY_CONFLICT",
        message: "A subcategory with this name already exists (possibly inactive).",
        status: 409,
      });
      const created = await tx.businessCategoryDefault.create({
        data: { businessCategoryId: categoryId, slug, ...input, isPreset: false },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_DEFAULT_CATEGORY_CREATED",
          entityType: "BusinessCategoryDefault",
          entityId: created.id,
          metadata: { businessCategoryId: categoryId, name: created.name, slug: created.slug },
        },
      });
      return created;
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError({
        code: "DEFAULT_CATEGORY_CONFLICT", message: "This subcategory already exists.", status: 409,
      }));
    }
    return errorResponse(error);
  }
}
