import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { hashPassword } from "@/server/auth/password";
import { consumeRegistrationEmailGrant } from "@/server/auth/registration-email-otp";
import { ensureDefaultShopCategories } from "@/server/catalog/default-categories";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";
import { enforceRateLimit, getClientIp } from "@/server/security/rate-limit";
import { normalizeReferralCode } from "@/server/referrals/referral-code";
import { recordGrowthConversion } from "@/server/marketing/growth-conversion";
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
  let diagnosticStage = "rate-limit";
  try {
    enforceRateLimit("auth:register:" + getClientIp(request), 10, 15 * 60 * 1000);
      diagnosticStage = "validate-registration";
    const input = registerSchema.parse(await readJsonBody(request));
      diagnosticStage = "hash-password";
    const passwordHash = await hashPassword(input.password);

      diagnosticStage = "begin-registration-transaction";
    const result = await prisma.$transaction(async (tx) => {
      diagnosticStage = "check-duplicate-email";
      if (await tx.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
        throw new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists", status: 409 });
      }

      diagnosticStage = "consume-email-verification";
      await consumeRegistrationEmailGrant(tx, input.email, "MERCHANT", input.emailVerificationToken);

      let referralPartner: { id: string; referralCode: string | null } | null = null;
      diagnosticStage = "lookup-referral";
      if (input.referralCode?.trim()) {
        const referralCode = normalizeReferralCode(input.referralCode);
        referralPartner = await tx.referralPartner.findFirst({
          where: { referralCode, status: "ACTIVE" },
          select: { id: true, referralCode: true },
        });
        if (!referralPartner) {
          throw new AppError({
            code: "INVALID_REFERRAL_CODE",
            message: "Referral code is invalid or inactive",
            status: 400,
            fields: { referralCode: ["Enter a valid active referral code"] },
          });
        }
      }

      let businessCategory: { id: string; name: string; slug: string } | null = null;
      diagnosticStage = "lookup-business-category";
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

      diagnosticStage = "create-user";
      const user = await tx.user.create({
        data: { name: input.name, email: input.email, mobile: input.mobile || null, passwordHash },
        select: { id: true, name: true, email: true, mobile: true, status: true, createdAt: true },
      });

      diagnosticStage = "create-shop";
      const shop = await tx.shop.create({
        data: {
          name: input.shopName,
          slug: await createUniqueShopSlug(tx, input.shopName),
          businessCategoryId: input.businessCategoryId ?? null,
          requestedBusinessType: input.requestedBusinessType ?? null,
          phone: input.phone || input.mobile || null,
          whatsapp: input.whatsapp || input.phone || input.mobile || null,
          email: input.email,
          address: input.address || null,
          city: input.city || null,
          state: input.state || null,
          pincode: input.pincode || null,
          referralPartnerId: referralPartner?.id ?? null,
          referralAssignedAt: referralPartner ? new Date() : null,
          status: "PENDING",
        },
        select: { id: true, name: true, slug: true, status: true, businessCategoryId: true, requestedBusinessType: true, phone: true, whatsapp: true, city: true, state: true, pincode: true, createdAt: true },
      });

      diagnosticStage = "create-shop-owner-membership";
      const membership = await tx.shopUser.create({
        data: { userId: user.id, shopId: shop.id, role: "OWNER" },
        select: { id: true, role: true, shopId: true, createdAt: true },
      });

      diagnosticStage = "audit-referral";
      if (referralPartner) {
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            shopId: shop.id,
            action: "SHOP_REFERRAL_ASSIGNED",
            entityType: "Shop",
            entityId: shop.id,
            metadata: {
              referralPartnerId: referralPartner.id,
              referralCode: referralPartner.referralCode,
              source: "REGISTRATION_CODE",
            },
          },
        });
      }

      diagnosticStage = "audit-requested-business-type";
      if (input.requestedBusinessType) {
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            shopId: shop.id,
            action: "BUSINESS_TYPE_REQUESTED",
            entityType: "Shop",
            entityId: shop.id,
            metadata: {
              requestedBusinessType: input.requestedBusinessType,
            },
          },
        });
      }

      diagnosticStage = "commit-registration-transaction";
      return { user, shop, membership, businessCategory };
    }, {
      // Keep OTP consumption, merchant/shop creation and referral attribution
      // atomic; expensive category template seeding is handled afterwards.
      maxWait: 10_000,
      timeout: 20_000,
    });

    // Category templates can contain many nested Event Planner nodes.
    // Do not run this expensive optional setup inside the critical registration
    // transaction: Prisma P2028 previously rolled back genuine registrations.
    // This separate transaction is safe to retry from the merchant categories
    // endpoint, as template markers prevent duplicate category creation.
    if (result.businessCategory) {
      try {
        await prisma.$transaction(
          (tx) => ensureDefaultShopCategories(tx, {
            shopId: result.shop.id,
            businessCategory: result.businessCategory,
            actorUserId: result.user.id,
            newlyCreatedShop: true,
          }),
          { maxWait: 10_000, timeout: 30_000 },
        );
      } catch (seedError) {
        // Registration, verified email and referral are already committed.
        // Never tell a merchant that registration failed and invite a duplicate
        // attempt just because a category template timed out.
        const detail = seedError && typeof seedError === "object"
          ? (seedError as { code?: unknown })
          : null;
        console.error("[auth/register] Category setup deferred", {
          shopId: result.shop.id,
          errorCode: typeof detail?.code === "string" ? detail.code : "CATEGORY_SEED_FAILED",
        });
      }
    }

    // Registration is already committed; attribution must never modify referral ownership.
    await recordGrowthConversion(input.growthSourceShopSlug, "MERCHANT_REGISTERED", result.shop.id);

    return NextResponse.json({
      data: { user: result.user, shop: result.shop, membership: result.membership },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
        if (target.includes("email")) return errorResponse(new AppError({ code: "EMAIL_IN_USE", message: "An account with this email already exists. Please sign in or check your pending approval.", status: 409 }));
        return errorResponse(new AppError({ code: "REGISTRATION_CONFLICT", message: "Registration conflicted with an existing record. Please try again.", status: 409 }));
      }
      if (["P2028", "P2024", "P1017"].includes(error.code)) {
        console.error("[auth/register] Database operation could not complete", {
          stage: diagnosticStage, errorCode: error.code,
        });
        return errorResponse(new AppError({
          code: "REGISTRATION_TEMPORARILY_UNAVAILABLE",
          message: "Registration is temporarily busy. Please try again in a moment. If you already submitted successfully, sign in to check your application.",
          status: 503,
        }));
      }
    }
    // Do not log email addresses, request bodies, verification tokens or passwords.
    if (!(error instanceof AppError) && !(error instanceof ZodError)) {
      console.error("[auth/register] Unexpected failure", {
        stage: diagnosticStage,
        errorType: error instanceof Error ? error.name : typeof error,
        errorCode:
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : null,
      });
    }
    return errorResponse(error);
  }
}
