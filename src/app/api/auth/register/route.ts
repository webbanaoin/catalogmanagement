import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { hashPassword } from "@/server/auth/password";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { registerSchema } from "@/validation/auth";

function slugBase(name: string): string {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170);
  return slug || "shop";
}

async function createUniqueShopSlug(tx: Prisma.TransactionClient, shopName: string): Promise<string> {
  const base = slugBase(shopName);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : "-" + (attempt + 1);
    const candidate = base.slice(0, 191 - suffix.length) + suffix;
    const exists = await tx.shop.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return base.slice(0, 178) + "-" + crypto.randomUUID().slice(0, 12);
}

export async function POST(request: Request) {
  try {
    enforceRateLimit("auth:register:" + getClientIp(request), 10, 15 * 60 * 1000);
    const input = registerSchema.parse(await readJsonBody(request));
    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
        throw new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 });
      }

      let businessCategory: { id: string; name: string; slug: string } | null = null;
      if (input.businessCategoryId) {
        businessCategory = await tx.businessCategory.findFirst({
          where: { id: input.businessCategoryId, status: "ACTIVE" },
          select: { id: true, name: true, slug: true },
        });
        if (!businessCategory) {
          throw new AppError({
            code: "BUSINESS_CATEGORY_NOT_FOUND",
            message: "Selected business type is not available",
            status: 400,
            fields: { businessCategoryId: ["Select an active business type"] },
          });
        }
      }

      const user = await tx.user.create({
        data: { name: input.name, email: input.email, mobile: input.mobile || null, passwordHash },
        select: { id: true, name: true, email: true, mobile: true, status: true, createdAt: true },
      });

      const shop = await tx.shop.create({
        data: {
          name: input.shopName,
          slug: await createUniqueShopSlug(tx, input.shopName),
          businessCategoryId: input.businessCategoryId ?? null,
          phone: input.phone || input.mobile || null,
          whatsapp: input.whatsapp || input.phone || input.mobile || null,
          email: input.email,
          city: input.city || null,
          state: input.state || null,
          pincode: input.pincode || null,
          status: "PENDING",
        },
        select: { id: true, name: true, slug: true, status: true, phone: true, whatsapp: true, city: true, state: true, pincode: true, createdAt: true },
      });

      const membership = await tx.shopUser.create({
        data: { userId: user.id, shopId: shop.id, role: "OWNER" },
        select: { id: true, role: true, shopId: true, createdAt: true },
      });

      if (businessCategory) {
        await ensureDefaultShopCategories(tx, {
          shopId: shop.id,
          businessCategory,
          actorUserId: user.id,
        });
      }

      return { user, shop, membership };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("email")) return errorResponse(new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 }));
      return errorResponse(new AppError({ code: "REGISTRATION_CONFLICT", message: "Registration conflicted with an existing record. Please try again.", status: 409 }));
    }
    return errorResponse(error);
  }
}
