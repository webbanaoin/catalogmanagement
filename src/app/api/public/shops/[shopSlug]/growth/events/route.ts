import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";

const eventSchema = z.object({
  eventType: z.enum(["IMPRESSION", "CREATE_CLICK", "PARTNER_CLICK", "EXPLORE_CLICK"]),
  sourcePage: z.enum(["HOME", "CATEGORY", "PRODUCT", "OTHER"]),
  sessionId: z.string().min(8).max(128).optional(),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ shopSlug: string }> },
) {
  try {
    const { shopSlug } = await context.params;
    enforceRateLimit(
      `growth:${shopSlug}:${getClientIp(request)}`,
      60,
      60_000,
    );

    // Reject cross-origin browser posts; this endpoint does not accept credentials.
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== new URL(request.url).origin) {
      throw new AppError({
        code: "INVALID_ORIGIN",
        message: "Cross-origin growth events are not allowed",
        status: 403,
      });
    }

    const input = eventSchema.parse(await readJsonBody(request));
    const shop = await prisma.shop.findFirst({
      where: {
        slug: shopSlug,
        status: "ACTIVE",
        storefrontGrowthPromoEnabled: true,
      },
      select: { id: true },
    });

    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "This promotional section is not available",
        status: 404,
      });
    }

    await prisma.storefrontGrowthEvent.create({
      data: {
        sourceShopId: shop.id,
        eventType: input.eventType,
        sourcePage: input.sourcePage,
        sessionId: input.sessionId ?? null,
      },
    });

    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
