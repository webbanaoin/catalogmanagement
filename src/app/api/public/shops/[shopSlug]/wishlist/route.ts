import { z } from "zod";
import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";

const schema = z.object({
  slugs: z.array(z.string().min(1).max(191)).min(1).max(20)
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ shopSlug: string }> },
) {
  try {
    const { shopSlug } = await context.params;
    enforceRateLimit(`wishlist:preview:${shopSlug}:${getClientIp(request)}`, 40, 60 * 1000);
    const { slugs } = schema.parse(await readJsonBody(request));
    if (new Set(slugs).size !== slugs.length) {
      throw new AppError({ code: "DUPLICATE_WISHLIST_PRODUCTS", message: "Duplicate wishlist products", status: 400 });
    }
    const shop = await prisma.shop.findFirst({
      where: {
        slug: shopSlug, status: "ACTIVE",
        wishlistAllowedByAdmin: true, wishlistEnabledByMerchant: true,
        whatsapp: { not: null },
      },
      select: { id: true, name: true },
    });
    if (!shop) {
      throw new AppError({
        code: "WISHLIST_UNAVAILABLE",
        message: "Wishlist enquiries are currently unavailable for this shop.",
        status: 404,
      });
    }
    const visible = await prisma.product.findMany({
      where: {
        shopId: shop.id, slug: { in: slugs },
        deletedAt: null, isVisible: true,
        OR: [{ categoryId: null }, { category: { status: "ACTIVE" } }],
      },
      select: { slug: true, name: true, sku: true, availabilityStatus: true },
    });
    const lookup = new Map(visible.map((item) => [item.slug, item]));
    return NextResponse.json({
      data: {
        products: slugs.map((slug) => lookup.get(slug)).filter((p) => p != null),
        unavailableSlugs: slugs.filter((slug) => !lookup.has(slug)),
      },
    });
  } catch (error) { return errorResponse(error); }
}
