import "server-only";

import { Prisma } from "@prisma/client";

import { getDefaultCategoryPreset } from "@/lib/default-category-presets";
import { EVENT_BUSINESS_SLUG, EVENT_CATEGORY_TREE } from "@/lib/event-category-tree";
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

      if (businessCategory.slug === EVENT_BUSINESS_SLUG) {
        // Link seeded nodes in ONE parameterized statement. Doing a
        // separate update per theme can exceed Prisma's default transaction
        // timeout on hosted MySQL, leaving the entire initialization rolled
        // back and the admin page returning HTTP 500 on every request.
        const parentCases = EVENT_CATEGORY_TREE
          .filter((entry) => entry.parentSlug)
          .map((entry) => Prisma.sql`WHEN ${toSlug(entry.name)} THEN ${entry.parentSlug}`);
        if (parentCases.length > 0) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE business_category_defaults AS child
            JOIN business_category_defaults AS parent
              ON parent.business_category_id = child.business_category_id
              AND parent.slug = (
                CASE child.slug
                  ${Prisma.join(parentCases, " ")}
                  ELSE NULL
                END
              )
            SET child.parent_id = parent.id
            WHERE child.business_category_id = ${businessCategory.id}
              AND child.parent_id IS NULL
          `);
        }
      }
    }
  }

  return tx.businessCategoryDefault.findMany({
    where: { businessCategoryId: businessCategory.id },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}
