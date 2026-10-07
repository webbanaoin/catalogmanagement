import { getCatalogPreset } from "@/lib/catalog-presets";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { getAdminImportShop } from "@/server/admin/admin-import";
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
    const shop = await getAdminImportShop(shopId);

    const categories = await prisma.$transaction(async (tx) => {
      await ensureDefaultShopCategories(tx, {
        shopId,
        businessCategory: shop.businessCategory,
        actorUserId: admin.id,
      });

      return tx.shopCategory.findMany({
        where: { shopId, status: "ACTIVE" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      });
    });

    const workbook = buildSmartProductImportTemplate({
      shopName: shop.name,
      businessCategoryName: shop.businessCategory.name,
      showProductPrices: shop.showProductPrices,
      categories,
      preset: getCatalogPreset(shop.businessCategory),
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        shopId,
        action: "ADMIN_SMART_EXCEL_TEMPLATE_DOWNLOADED",
        entityType: "Shop",
        entityId: shopId,
        metadata: {
          businessCategoryId: shop.businessCategory.id,
          businessCategoryName: shop.businessCategory.name,
        },
      },
    });

    const safeShopName = shop.name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80);

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeShopName || "shop"}-smart-product-import.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
