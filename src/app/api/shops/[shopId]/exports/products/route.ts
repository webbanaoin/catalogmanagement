import { getCatalogPreset } from "@/lib/catalog-presets";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { buildSmartProductExportWorkbook } from "@/server/import/smart-product-workbook";
import { requireSubscriptionFeature } from "@/server/subscriptions/access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;

    await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    await requireSubscriptionFeature(shopId, "excelImportEnabled");

    const [shop, categories, products] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          name: true,
          showProductPrices: true,
          businessCategory: {
            select: { name: true, slug: true },
          },
        },
      }),
      prisma.shopCategory.findMany({
        where: { shopId, status: "ACTIVE" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      prisma.product.findMany({
        where: { shopId, deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        select: {
          name: true,
          sku: true,
          catalogGroup: true,
          price: true,
          discountPrice: true,
          priceType: true,
          description: true,
          availabilityStatus: true,
          showPrice: true,
          isVisible: true,
          isFeatured: true,
          isNewArrival: true,
          isOffer: true,
          category: {
            select: {
              name: true,
            },
          },
          attributes: {
            orderBy: { displayOrder: "asc" },
            select: {
              attributeName: true,
              attributeValue: true,
            },
          },
        },
      }),
    ]);

    if (!shop) throw new Error("Shop not found");

    const preset = getCatalogPreset(shop.businessCategory);
    const workbook = buildSmartProductExportWorkbook(
      {
        shopName: shop.name,
        businessCategoryName: shop.businessCategory?.name ?? null,
        showProductPrices: shop.showProductPrices,
        categories,
        preset,
      },
      products.map((product) => ({
        name: product.name,
        sku: product.sku,
        category: product.category?.name ?? null,
        catalogGroup: product.catalogGroup,
        price: product.price == null ? null : product.price.toString(),
        priceType: product.priceType,
        discountPrice:
          product.discountPrice == null ? null : product.discountPrice.toString(),
        description: product.description,
        availabilityStatus: product.availabilityStatus,
        showPrice: product.showPrice,
        isVisible: product.isVisible,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        isOffer: product.isOffer,
        attributes: product.attributes.map((attribute) => ({
          name: attribute.attributeName,
          value: attribute.attributeValue,
        })),
      })),
    );

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="smart-current-products.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
