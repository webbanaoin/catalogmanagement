import "server-only";

import type { Prisma } from "@prisma/client";

import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { toSlug } from "@/server/catalog/slug";

const ACTION = "DEFAULT_CATEGORIES_SEEDED";
const ENTITY_TYPE = "CATEGORY_PRESET";

type BusinessCategoryInput = {
  name?: string | null;
  slug?: string | null;
};

function normalizedName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function ensureDefaultShopCategories(
  tx: Prisma.TransactionClient,
  options: {
    shopId: string;
    businessCategory?: BusinessCategoryInput | null;
    actorUserId?: string | null;
  },
): Promise<{
  presetKey: string | null;
  seeded: boolean;
  createdCount: number;
  createdCategories: string[];
}> {
  const preset = getDefaultCategoryPreset(options.businessCategory);

  if (!preset || preset.categories.length === 0) {
    return {
      presetKey: null,
      seeded: false,
      createdCount: 0,
      createdCategories: [],
    };
  }

  const priorSeed = await tx.auditLog.findFirst({
    where: {
      shopId: options.shopId,
      action: ACTION,
      entityType: ENTITY_TYPE,
      entityId: preset.key,
    },
    select: { id: true },
  });

  if (priorSeed) {
    return {
      presetKey: preset.key,
      seeded: false,
      createdCount: 0,
      createdCategories: [],
    };
  }

  const existing = await tx.shopCategory.findMany({
    where: { shopId: options.shopId },
    select: { name: true, slug: true },
  });

  const existingNames = new Set(existing.map((item) => normalizedName(item.name)));
  const existingSlugs = new Set(existing.map((item) => item.slug.toLowerCase()));

  const rows = preset.categories
    .map((name, index) => ({
      name,
      slug: toSlug(name),
      displayOrder: (index + 1) * 10,
    }))
    .filter(
      (item) =>
        !existingNames.has(normalizedName(item.name)) &&
        !existingSlugs.has(item.slug.toLowerCase()),
    )
    .map((item) => ({
      shopId: options.shopId,
      name: item.name,
      slug: item.slug,
      displayOrder: item.displayOrder,
      status: "ACTIVE" as const,
    }));

  if (rows.length > 0) {
    await tx.shopCategory.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  const createdCategories = rows.map((item) => item.name);

  await tx.auditLog.create({
    data: {
      actorUserId: options.actorUserId ?? null,
      shopId: options.shopId,
      action: ACTION,
      entityType: ENTITY_TYPE,
      entityId: preset.key,
      metadata: {
        businessCategoryName: options.businessCategory?.name ?? null,
        businessCategorySlug: options.businessCategory?.slug ?? null,
        presetKey: preset.key,
        createdCount: createdCategories.length,
        createdCategories,
      },
    },
  });

  return {
    presetKey: preset.key,
    seeded: true,
    createdCount: createdCategories.length,
    createdCategories,
  };
}
