import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { getAdminOnboardingCapacity, requireAdminOnboardingShop } from "@/server/admin/shop-onboarding";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { enforceRateLimit } from "@/server/security/rate-limit";

type Context = { params: Promise<{ shopId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requirePlatformAdmin();
    const { shopId } = await context.params;
    await requireAdminOnboardingShop(shopId);
    const [deleted, activeCount] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 200,
        select: { id: true, name: true, sku: true, slug: true, deletedAt: true, categoryId: true },
      }),
      prisma.product.count({ where: { shopId, deletedAt: null } }),
    ]);
    return NextResponse.json({ data: { deleted, activeCount, truncated: deleted.length === 200 } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const admin = await requirePlatformAdmin();
    const { shopId } = await context.params;
    await requireAdminOnboardingShop(shopId);
    enforceRateLimit(`admin:product-recovery:${shopId}:${admin.id}`, 10, 15 * 60 * 1000);
    const payload: unknown = await request.json().catch(() => null);
    const ids = payload && typeof payload === "object" && "ids" in payload
      ? (payload as { ids?: unknown }).ids : null;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 ||
        ids.some((id) => typeof id !== "string" || !/^c[a-z0-9]{10,40}$/.test(id)) ||
        new Set(ids).size !== ids.length) {
      throw new AppError({ code: "INVALID_SELECTION", message: "Select 1–100 distinct deleted products", status: 400 });
    }

    const capacity = await getAdminOnboardingCapacity(shopId);
    const restored = await prisma.$transaction(async (tx) => {
      const rows = await tx.product.findMany({
        where: { shopId, id: { in: ids }, deletedAt: { not: null } },
        select: { id: true, categoryId: true, sku: true, slug: true },
      });
      if (rows.length !== ids.length) {
        throw new AppError({ code: "PRODUCTS_CHANGED", message: "One or more selected products are no longer deleted. Refresh the list.", status: 409 });
      }
      const activeCount = await tx.product.count({ where: { shopId, deletedAt: null } });
      if (activeCount + rows.length > capacity.limit) {
        throw new AppError({ code: "PRODUCT_LIMIT_REACHED", message: "Restoring these products would exceed the shop product limit.", status: 409 });
      }
      const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter((id): id is string => !!id))];
      const validCategories = categoryIds.length ? await tx.shopCategory.count({
        where: { shopId, id: { in: categoryIds }, status: "ACTIVE" },
      }) : 0;
      if (validCategories !== categoryIds.length) {
        throw new AppError({ code: "CATEGORY_INACTIVE", message: "Some products have inactive categories. Update categories before restoring.", status: 409 });
      }
      const existing = await tx.product.findMany({
        where: { shopId, deletedAt: null },
        select: { sku: true, slug: true },
      });
      const skus = new Set(existing.map((row) => row.sku?.toLowerCase()).filter(Boolean));
      const slugs = new Set(existing.map((row) => row.slug));
      if (rows.some((row) => (row.sku && skus.has(row.sku.toLowerCase())) || slugs.has(row.slug))) {
        throw new AppError({ code: "RESTORE_CONFLICT", message: "An active product uses a selected SKU or slug. Resolve the conflict before restoring.", status: 409 });
      }
      const update = await tx.product.updateMany({
        where: { shopId, id: { in: ids }, deletedAt: { not: null } },
        data: { deletedAt: null, isVisible: true },
      });
      if (update.count !== ids.length) {
        throw new AppError({ code: "PRODUCTS_CHANGED", message: "Recovery selection changed. Refresh and retry.", status: 409 });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id, shopId,
          action: "ADMIN_PRODUCTS_RESTORED", entityType: "Product", entityId: shopId,
          metadata: { count: ids.length, productIds: ids },
        },
      });
      return update.count;
    }, { maxWait: 10000, timeout: 30000 });
    return NextResponse.json({ data: { restored } });
  } catch (error) {
    return errorResponse(error);
  }
}
