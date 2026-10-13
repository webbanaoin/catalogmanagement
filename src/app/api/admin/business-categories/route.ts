import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { toSlug } from "@/server/catalog/slug";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { adminBusinessCategoryCreateSchema } from "@/validation/admin";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const items = await prisma.businessCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            shops: true,
          },
        },
        categoryMedia: {
          select: {
            categorySlug: true,
          },
        },
      },
    });

    return NextResponse.json({
      items: items.map(({ _count, categoryMedia, ...category }) => {
        const preset = getDefaultCategoryPreset(category);
        const presetSlugs = new Set(
          (preset?.categories ?? []).map((name) => toSlug(name)),
        );
        const configuredPresetImages = categoryMedia.filter((item) =>
          presetSlugs.has(item.categorySlug),
        ).length;

        return {
          ...category,
          shopCount: _count.shops,
          defaultCoverConfigured: Boolean(category.defaultCoverStorageKey),
          sharedCategoryImageCount: configuredPresetImages,
          presetCategoryCount: preset?.categories.length ?? 0,
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
