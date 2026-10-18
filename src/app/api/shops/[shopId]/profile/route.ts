import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { requireShopAccess } from "@/server/auth/tenant-access";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { errorResponse } from "@/server/http/error-response";
import { AppError } from "@/server/http/app-error";
import { readJsonBody } from "@/server/http/json-body";
import { resolveShopBranding } from "@/server/media/shop-branding-resolver";
import { shopProfileSchema } from "@/validation/catalog";

async function readShopProfile(shopId: string) {
  const data = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      businessCategory: true,
      hours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!data) {
    throw new AppError({
      code: "SHOP_NOT_FOUND",
      message: "Shop not found",
      status: 404,
    });
  }

  const branding = await resolveShopBranding({
    logoStorageKey: data.logoStorageKey,
    coverStorageKey: data.coverStorageKey,
    businessCategoryDefaultCoverStorageKey:
      data.businessCategory?.defaultCoverStorageKey ?? null,
  });

  return {
    ...data,
    logoUrl: branding.logoUrl,
    coverUrl: branding.coverUrl,
    customLogoUrl: branding.customLogoUrl,
    customCoverUrl: branding.customCoverUrl,
    logoSource: branding.logoSource,
    coverSource: branding.coverSource,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId);
    return NextResponse.json({ data: await readShopProfile(shopId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    const { user } = await requireShopAccess(shopId, {
      roles: ["OWNER", "MANAGER"],
      shopStatuses: ["APPROVED", "ACTIVE"],
    });
    const input = shopProfileSchema.parse(await readJsonBody(request));

    let businessCategory: { id: string; name: string; slug: string } | null = null;
    if (input.businessCategoryId) {
      businessCategory = await prisma.businessCategory.findFirst({
        where: { id: input.businessCategoryId, status: "ACTIVE" },
        select: { id: true, name: true, slug: true },
      });
      if (!businessCategory) {
        throw new AppError({
          code: "BUSINESS_CATEGORY_NOT_FOUND",
          message: "Business category not found",
          status: 404,
        });
      }
    }

    const currentShop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { wishlistAllowedByAdmin: true, whatsapp: true },
    });
    if (!currentShop) {
      throw new AppError({ code: "SHOP_NOT_FOUND", message: "Shop not found", status: 404 });
    }
    if (input.wishlistEnabledByMerchant === true) {
      if (!currentShop.wishlistAllowedByAdmin) {
        throw new AppError({
          code: "WISHLIST_NOT_ALLOWED",
          message: "The platform admin has not enabled wishlists for this shop.",
          status: 403,
        });
      }
      if (!(input.whatsapp ?? currentShop.whatsapp)) {
        throw new AppError({
          code: "WISHLIST_WHATSAPP_REQUIRED",
          message: "Set a shop WhatsApp number before enabling the enquiry wishlist.",
          status: 400,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shopId },
        data: { ...input, email: input.email || null },
      });

      if (businessCategory) {
        await ensureDefaultShopCategories(tx, {
          shopId,
          businessCategory,
          actorUserId: user.id,
        });
      }
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({ data: await readShopProfile(shopId) });
  } catch (error) {
    return errorResponse(error);
  }
}
