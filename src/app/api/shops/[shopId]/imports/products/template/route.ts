import { requireShopAccess } from "@/server/auth/tenant-access";
import { errorResponse } from "@/server/http/error-response";
import { buildProductImportTemplate } from "@/server/import/xlsx";
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

    const workbook = buildProductImportTemplate();

    return new Response(Uint8Array.from(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="catalog-product-import-template.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
