import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { buildProductExportWorkbook } from "@/server/import/xlsx";
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

    const products = await prisma.product.findMany({
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
        isFeatured: true,
        isNewArrival: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const workbook = buildProductExportWorkbook(
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
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
      })),
    );

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="catalog-current-products.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
