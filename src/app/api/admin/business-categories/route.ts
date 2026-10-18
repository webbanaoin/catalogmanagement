import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { listBusinessCategoryDefaults } from "@/server/catalog/business-category-defaults";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminBusinessCategoryCreateSchema } from "@/validation/admin";

export async function GET() {
  try {
    await requirePlatformAdmin();

    // One-time import of legacy presets; later edits are fully database-driven.
    const pendingBusinessTypes = await prisma.businessCategory.findMany({
      where: { defaultsInitialized: false },
      select: { id: true, name: true, slug: true },
    });
    for (const businessType of pendingBusinessTypes) {
      // This runs only once per business type, and the event hierarchy may
      // need a longer first-run window on remote MySQL than Prisma's default
      // five-second interactive transaction timeout.
      await prisma.$transaction(
        (tx) => listBusinessCategoryDefaults(tx, businessType),
        { maxWait: 10_000, timeout: 20_000 },
      );
    }

    const items = await prisma.businessCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { shops: true } },
        categoryMedia: { select: { categorySlug: true } },
        defaultCategories: {
          where: { status: "ACTIVE" },
          select: { slug: true },
        },
      },
    });

    return NextResponse.json({
      items: items.map(({ _count, categoryMedia, defaultCategories, ...category }) => {
        const activeSlugs = new Set(defaultCategories.map((item) => item.slug));
        return {
          ...category,
          shopCount: _count.shops,
          defaultCoverConfigured: Boolean(category.defaultCoverStorageKey),
          sharedCategoryImageCount: categoryMedia.filter((item) => activeSlugs.has(item.categorySlug)).length,
          presetCategoryCount: defaultCategories.length,
        };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = adminBusinessCategoryCreateSchema.parse(
      await readJsonBody(request),
    );
    const slug = toSlug(input.slug ?? input.name);

    const duplicate = await prisma.businessCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError({
        code: "BUSINESS_CATEGORY_SLUG_CONFLICT",
        message: "A business category with this slug already exists",
        status: 409,
      });
    }

    const data = await prisma.$transaction(async (tx) => {
      const category = await tx.businessCategory.create({
        data: {
          ...input,
          slug,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "BUSINESS_CATEGORY_CREATED",
          entityType: "BusinessCategory",
          entityId: category.id,
          metadata: {
            slug: category.slug,
            status: category.status,
            displayOrder: category.displayOrder,
          },
        },
      });

      return category;
    });

    return NextResponse.json({ data }, { status: 201 });
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
