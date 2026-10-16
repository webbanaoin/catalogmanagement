import "server-only";

import type { Prisma } from "@prisma/client";

import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { toSlug } from "@/server/catalog/slug";

export type BusinessCategoryIdentity = {
  id: string;
  name: string;
  slug: string;
};

// Initial presets are imported exactly once into the database. After that,
// the admin-managed records are authoritative (including disabled/renamed rows).
// Stationery is intentionally classified as newly introduced so legacy Toys &
// Gifts merchants receive the additional department without restoring their
// previously removed preset categories.
const NEW_COMBINED_SHOP_CATEGORIES = new Set([
  "Stationery", "Notebooks & Registers", "Pens & Pencils", "School Supplies",
  "Office Stationery", "Files & Folders", "Art & Craft Supplies",
  "School Bags & Pouches", "Paper & Printing Supplies",
]);

export async function listBusinessCategoryDefaults(
  tx: Prisma.TransactionClient,
  businessCategory: BusinessCategoryIdentity,
) {
  const claimed = await tx.businessCategory.updateMany({
    where: { id: businessCategory.id, defaultsInitialized: false },
    data: { defaultsInitialized: true },
  });

  if (claimed.count === 1) {
    const preset = getDefaultCategoryPreset(businessCategory);
    if (preset?.categories.length) {
      await tx.businessCategoryDefault.createMany({
        data: preset.categories.map((name, index) => ({
          businessCategoryId: businessCategory.id,
          name,
          slug: toSlug(name),
          displayOrder: (index + 1) * 10,
          status: "ACTIVE" as const,
          isPreset: !(
            preset.key === "toys-gifts" &&
            NEW_COMBINED_SHOP_CATEGORIES.has(name)
          ),
        })),
        skipDuplicates: true,
      });
    }
  }

  return tx.businessCategoryDefault.findMany({
    where: { businessCategoryId: businessCategory.id },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}
