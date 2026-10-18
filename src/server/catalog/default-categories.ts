import "server-only";

import type { Prisma } from "@prisma/client";

import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { listBusinessCategoryDefaults, type BusinessCategoryIdentity } from "@/server/catalog/business-category-defaults";
import { normalizeCategoryName } from "@/server/catalog/category-name";

const LEGACY_ACTION = "DEFAULT_CATEGORIES_SEEDED";
const TEMPLATE_ACTION = "DEFAULT_CATEGORY_TEMPLATE_APPLIED";
const TEMPLATE_ENTITY = "BusinessCategoryDefault";

export async function ensureDefaultShopCategories(
  tx: Prisma.TransactionClient,
  options: {
    shopId: string;
    businessCategory?: BusinessCategoryIdentity | null;
    actorUserId?: string | null;
    /** Skip queries for a shop created in this same transaction. */
    newlyCreatedShop?: boolean;
  },
): Promise<{
  presetKey: string | null;
  seeded: boolean;
  createdCount: number;
  createdCategories: string[];
}> {
  if (!options.businessCategory) {
    return { presetKey: null, seeded: false, createdCount: 0, createdCategories: [] };
  }

  const category = options.businessCategory;
  const preset = getDefaultCategoryPreset(category);
  const defaults = await listBusinessCategoryDefaults(tx, category);
  const activeDefaults = defaults.filter((item) => item.status === "ACTIVE");

  if (!activeDefaults.length) {
    return { presetKey: preset?.key ?? null, seeded: false, createdCount: 0, createdCategories: [] };
  }

  // Existing shops could have deleted a preset category before this feature.
  // The old seed marker means those deletions must remain deleted.
  const legacySeed = preset && !options.newlyCreatedShop ? await tx.auditLog.findFirst({
    where: {
      shopId: options.shopId,
      action: LEGACY_ACTION,
      entityType: "CATEGORY_PRESET",
      entityId: preset.key,
    },
    select: { id: true },
  }) : null;

  const applied = options.newlyCreatedShop ? [] : await tx.auditLog.findMany({
    where: {
      shopId: options.shopId,
      action: TEMPLATE_ACTION,
      entityType: TEMPLATE_ENTITY,
      entityId: { in: activeDefaults.map((item) => item.id) },
    },
    select: { entityId: true },
  });
  const appliedIds = new Set(applied.map((item) => item.entityId));
  const pending = activeDefaults.filter((item) => !appliedIds.has(item.id));
  if (!pending.length) {
    return { presetKey: preset?.key ?? category.slug, seeded: false, createdCount: 0, createdCategories: [] };
  }

  const existing = options.newlyCreatedShop ? [] : await tx.shopCategory.findMany({
    where: { shopId: options.shopId },
    select: { name: true, slug: true },
  });
  const names = new Set(existing.map((item) => normalizeCategoryName(item.name)));
  const slugs = new Set(existing.map((item) => item.slug.toLowerCase()));

  const toCreate = pending.filter((item) => {
    if (legacySeed && item.isPreset) return false;
    if (names.has(normalizeCategoryName(item.name)) || slugs.has(item.slug.toLowerCase())) return false;
    names.add(normalizeCategoryName(item.name));
    slugs.add(item.slug.toLowerCase());
    return true;
  });

  if (toCreate.length) {
    await tx.shopCategory.createMany({
      data: toCreate.map((item) => ({
        shopId: options.shopId,
        name: item.name,
        slug: item.slug,
        displayOrder: item.displayOrder,
        status: "ACTIVE" as const,
      })),
      skipDuplicates: true,
    });
  }

  // ShopCategory already supports parentId. Connect only newly seeded child
  // categories; never overwrite an existing merchant's manually edited tree.
  if (toCreate.some((item) => item.parentId)) {
    const merchantCategories = await tx.shopCategory.findMany({
      where: { shopId: options.shopId },
      select: { id: true, slug: true, parentId: true },
    });
    const merchantBySlug = new Map(merchantCategories.map((item) => [item.slug, item]));
    const parentSlugById = new Map(defaults.map((item) => [item.id, item.slug]));
    for (const child of toCreate) {
      if (!child.parentId) continue;
      const parentSlug = parentSlugById.get(child.parentId);
      const parent = parentSlug ? merchantBySlug.get(parentSlug) : undefined;
      const inserted = merchantBySlug.get(child.slug);
      if (inserted && parent && inserted.id !== parent.id && !inserted.parentId) {
        await tx.shopCategory.update({
          where: { id: inserted.id },
          data: { parentId: parent.id },
        });
      }
    }
  }

  // A category is considered handled even when the merchant already has one,
  // or it is an initial preset deliberately removed from a legacy shop.
  // This prevents future GETs from recreating a merchant's deleted categories.
  await tx.auditLog.createMany({
    data: pending.map((item) => ({
      actorUserId: options.actorUserId ?? null,
      shopId: options.shopId,
      action: TEMPLATE_ACTION,
      entityType: TEMPLATE_ENTITY,
      entityId: item.id,
      metadata: {
        businessCategoryId: category.id,
        defaultName: item.name,
        inserted: toCreate.some((row) => row.id === item.id),
      },
    })),
  });

  const createdCategories = toCreate.map((item) => item.name);
  return {
    presetKey: preset?.key ?? category.slug,
    seeded: createdCategories.length > 0,
    createdCount: createdCategories.length,
    createdCategories,
  };
}
