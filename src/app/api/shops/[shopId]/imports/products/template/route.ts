import { getCatalogPreset } from "@/lib/catalog-presets";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { buildSmartProductImportTemplate } from "@/server/import/smart-product-workbook";
import { requireSubscriptionFeature } from "@/server/subscriptions/access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;

    const { user } = await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireSubscriptionFeature(shopId, "excelImportEnabled");

    const config = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: {
          name: true,
          showProductPrices: true,
          businessCategory: {
            select: { name: true, slug: true },
          },
        },
      });

      if (!shop) throw new Error("Shop not found");

      if (shop.businessCategory) {
        await ensureDefaultShopCategories(tx, {
          shopId,
          businessCategory: shop.businessCategory,
          actorUserId: user.id,
        });
      }

      const categories = await tx.shopCategory.findMany({
        where: { shopId, status: "ACTIVE" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      });

      return {
        shopName: shop.name,
        businessCategoryName: shop.businessCategory?.name ?? null,
        showProductPrices: shop.showProductPrices,
        categories,
        preset: getCatalogPreset(shop.businessCategory),
      };
    });

    const workbook = buildSmartProductImportTemplate(config);

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="smart-product-import-template.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
