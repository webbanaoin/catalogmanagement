import { getCatalogPreset } from "@/lib/catalog-presets";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { requireAdminOnboardingShop } from "@/server/admin/shop-onboarding";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { buildSmartProductImportTemplate } from "@/server/import/smart-product-workbook";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    const shop = await requireAdminOnboardingShop(shopId);

    const categories = await prisma.$transaction(async (tx) => {
      if (shop.businessCategory) {
        await ensureDefaultShopCategories(tx, {
          shopId,
          businessCategory: shop.businessCategory,
          actorUserId: admin.id,
        });
      }

      return tx.shopCategory.findMany({
        where: { shopId, status: "ACTIVE" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      });
    });

    const workbook = buildSmartProductImportTemplate({
      shopName: shop.name,
      businessCategoryName: shop.businessCategory?.name ?? null,
      showProductPrices: shop.showProductPrices,
      categories,
      preset: getCatalogPreset(shop.businessCategory),
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        shopId,
        action: "ADMIN_ONBOARDING_TEMPLATE_DOWNLOADED",
        entityType: "Shop",
        entityId: shopId,
        metadata: {
          businessCategoryId: shop.businessCategoryId,
          businessCategoryName: shop.businessCategory?.name ?? null,
        },
      },
    });

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="smart-onboarding-${shop.slug}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
