import { randomUUID } from "node:crypto";

import type { CustomerActionType } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { publicAnalyticsEventSchema } from "@/validation/analytics";

const ACTION_TYPES: Record<
  "WHATSAPP" | "CALL" | "DIRECTIONS" | "SHARE" | "PWA_INSTALL",
  CustomerActionType
> = {
  WHATSAPP: "WHATSAPP",
  CALL: "CALL",
  DIRECTIONS: "DIRECTIONS",
  SHARE: "SHARE",
  PWA_INSTALL: "PWA_INSTALL",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ shopSlug: string }> },
) {
  try {
    const { shopSlug } = await context.params;
    const input = publicAnalyticsEventSchema.parse(await readJsonBody(request));

    const shop = await prisma.shop.findFirst({
      where: {
        slug: shopSlug,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!shop) {
      throw new AppError({
        code: "SHOP_NOT_FOUND",
        message: "Public shop was not found",
        status: 404,
      });
    }

    let productId: string | null = null;
    if (input.productSlug) {
      const product = await prisma.product.findFirst({
        where: {
          shopId: shop.id,
          slug: input.productSlug,
          deletedAt: null,
          isVisible: true,
          AND: [
            {
              OR: [
                { categoryId: null },
                { category: { status: "ACTIVE" } },
              ],
            },
          ],
        },
        select: { id: true },
      });

      if (!product) {
        throw new AppError({
          code: "PRODUCT_NOT_FOUND",
          message: "Public product was not found",
          status: 404,
        });
      }

      productId = product.id;
    }

    const sessionId = input.sessionId ?? randomUUID();
    const source = input.source?.trim().toLowerCase() || null;

    switch (input.eventType) {
      case "CATALOG_VISIT":
        await prisma.catalogVisit.create({
          data: {
            shopId: shop.id,
            sessionId,
            source,
            deviceType: input.deviceType,
          },
        });
        break;

      case "PRODUCT_VIEW":
        if (!productId) {
          throw new AppError({
            code: "PRODUCT_REQUIRED",
            message: "A visible product is required for a product view",
            status: 400,
          });
        }

        await prisma.productView.create({
          data: {
            shopId: shop.id,
            productId,
            sessionId,
            source,
          },
        });
        break;

      default:
        await prisma.customerAction.create({
          data: {
            shopId: shop.id,
            productId,
            sessionId,
            actionType: ACTION_TYPES[input.eventType],
            source,
          },
        });
    }

    return NextResponse.json(
      {
        data: {
          accepted: true,
          sessionId,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
