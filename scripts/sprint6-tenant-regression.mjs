import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create temporary regression data. Set SPRINT6_TEST_CONFIRM=YES after confirming DATABASE_URL points to a disposable/local test database.",
  );
}

const target = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
  process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES"
) {
  throw new Error(
    "Remote Sprint 6 regression tests are disabled by default. Set ALLOW_REMOTE_SPRINT6_TESTS=YES only for an isolated staging target.",
  );
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const passwordA = `Sprint6-Aa9!${randomUUID().slice(0, 12)}`;
const passwordANext = `Sprint6-Bb9!${randomUUID().slice(0, 12)}`;
const passwordB = `Sprint6-Cc9!${randomUUID().slice(0, 12)}`;
const adminPassword = `Sprint6-Dd9!${randomUUID().slice(0, 12)}`;
const pendingPassword = `Sprint6-Ee9!${randomUUID().slice(0, 12)}`;

const created = {
  userIds: [],
  shopIds: [],
  businessCategoryIds: [],
};

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", "203.0.113.20");
  if (cookie) headers.set("Cookie", cookie);

  return fetch(baseUrl + path, {
    ...options,
    headers,
    redirect: "manual",
  });
}

async function jsonRequest(path, method, body, cookie) {
  return request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cookie,
  );
}

async function expectStatus(label, response, expected) {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(
      `${label}: expected HTTP ${expected}, got ${response.status}. ${body.slice(0, 500)}`,
    );
  }
}

function cookieFrom(response) {
  const header = response.headers.get("set-cookie");
  if (!header) throw new Error("Login response did not set a session cookie");
  return header.split(";")[0];
}

async function login(email, password) {
  const response = await jsonRequest("/api/auth/login", "POST", { email, password });
  await expectStatus(`login ${email}`, response, 200);
  return cookieFrom(response);
}

async function createFixture() {
  const [hashA, hashB, hashAdmin, hashPending] = await Promise.all([
    hash(passwordA, 12),
    hash(passwordB, 12),
    hash(adminPassword, 12),
    hash(pendingPassword, 12),
  ]);

  const userA = await prisma.user.create({
    data: {
      name: "Sprint 6 Tenant A",
      email: `sprint6-a-${suffix}@example.test`,
      passwordHash: hashA,
    },
  });
  created.userIds.push(userA.id);

  const userB = await prisma.user.create({
    data: {
      name: "Sprint 6 Tenant B",
      email: `sprint6-b-${suffix}@example.test`,
      passwordHash: hashB,
    },
  });
  created.userIds.push(userB.id);

  const admin = await prisma.user.create({
    data: {
      name: "Sprint 6 Admin",
      email: `sprint6-admin-${suffix}@example.test`,
      passwordHash: hashAdmin,
      platformRole: "ADMIN",
    },
  });
  created.userIds.push(admin.id);

  const pendingUser = await prisma.user.create({
    data: {
      name: "Sprint 6 Pending Merchant",
      email: `sprint6-pending-${suffix}@example.test`,
      passwordHash: hashPending,
    },
  });
  created.userIds.push(pendingUser.id);

  const shopA = await prisma.shop.create({
    data: {
      name: "Sprint 6 Shop A",
      slug: `sprint6-shop-a-${suffix}`,
      email: userA.email,
      status: "ACTIVE",
    },
  });
  created.shopIds.push(shopA.id);

  const shopB = await prisma.shop.create({
    data: {
      name: "Sprint 6 Shop B",
      slug: `sprint6-shop-b-${suffix}`,
      email: userB.email,
      status: "ACTIVE",
    },
  });
  created.shopIds.push(shopB.id);

  const pendingShop = await prisma.shop.create({
    data: {
      name: "Sprint 6 Pending Shop",
      slug: `sprint6-pending-shop-${suffix}`,
      email: pendingUser.email,
      status: "PENDING",
    },
  });
  created.shopIds.push(pendingShop.id);

  await prisma.shopUser.create({
    data: {
      userId: pendingUser.id,
      shopId: pendingShop.id,
      role: "OWNER",
    },
  });

  const [membershipA] = await Promise.all([
    prisma.shopUser.create({
      data: { userId: userA.id, shopId: shopA.id, role: "OWNER" },
    }),
    prisma.shopUser.create({
      data: { userId: userB.id, shopId: shopB.id, role: "OWNER" },
    }),
  ]);

  const categoryB = await prisma.shopCategory.create({
    data: {
      shopId: shopB.id,
      name: "Tenant B Category",
      slug: `tenant-b-category-${suffix}`,
      status: "ACTIVE",
    },
  });

  const productB = await prisma.product.create({
    data: {
      shopId: shopB.id,
      categoryId: categoryB.id,
      name: "Tenant B Private Product",
      slug: `tenant-b-product-${suffix}`,
      sku: `B-${suffix}`.slice(0, 100),
      price: "100.00",
      isVisible: true,
    },
  });

  const categoryA = await prisma.shopCategory.create({
    data: {
      shopId: shopA.id,
      name: "Tenant A Public Category",
      slug: `tenant-a-category-${suffix}`,
      status: "ACTIVE",
    },
  });

  const visibleProductA = await prisma.product.create({
    data: {
      shopId: shopA.id,
      categoryId: categoryA.id,
      name: `Sprint6 Visible Product ${suffix}`,
      slug: `sprint6-visible-${suffix}`,
      sku: `A-V-${suffix}`.slice(0, 100),
      price: "150.00",
      isVisible: true,
    },
  });

  const hiddenProductA = await prisma.product.create({
    data: {
      shopId: shopA.id,
      categoryId: categoryA.id,
      name: `Sprint6 Hidden Product ${suffix}`,
      slug: `sprint6-hidden-${suffix}`,
      sku: `A-H-${suffix}`.slice(0, 100),
      price: "175.00",
      isVisible: false,
    },
  });

  return {
    userA,
    userB,
    admin,
    pendingUser,
    pendingShop,
    shopA,
    shopB,
    membershipA,
    categoryB,
    productB,
    visibleProductA,
    hiddenProductA,
  };
}

async function cleanup() {
  if (created.shopIds.length || created.userIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          ...(created.shopIds.length
            ? [{ shopId: { in: created.shopIds } }]
            : []),
          ...(created.userIds.length
            ? [{ actorUserId: { in: created.userIds } }]
            : []),
        ],
      },
    });

    if (created.shopIds.length) {
      await prisma.shop.deleteMany({ where: { id: { in: created.shopIds } } });
    }
    if (created.businessCategoryIds.length) {
      await prisma.businessCategory.deleteMany({
        where: { id: { in: created.businessCategoryIds } },
      });
    }
    if (created.userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    }
  }
}

async function main() {
  const fixture = await createFixture();
  let cookieA = await login(fixture.userA.email, passwordA);

  const onboarding = await request("/onboarding", {}, cookieA);
  if (![303, 307, 308].includes(onboarding.status)) {
    throw new Error(
      `Approved merchant onboarding should redirect to persisted shop profile, got HTTP ${onboarding.status}`,
    );
  }
  const onboardingLocation = onboarding.headers.get("location") || "";
  if (!onboardingLocation.endsWith("/dashboard/shop")) {
    throw new Error(
      `Approved merchant onboarding redirected to an unexpected location: ${onboardingLocation}`,
    );
  }

  await expectStatus(
    "merchant account profile update",
    await jsonRequest(
      "/api/auth/me",
      "PATCH",
      { name: "Sprint 6 Tenant A Updated", mobile: "9876543210" },
      cookieA,
    ),
    200,
  );

  const updatedAccount = await prisma.user.findUnique({
    where: { id: fixture.userA.id },
    select: { name: true, mobile: true },
  });
  if (
    updatedAccount?.name !== "Sprint 6 Tenant A Updated" ||
    updatedAccount.mobile !== "9876543210"
  ) {
    throw new Error("Merchant account profile update did not persist");
  }

  const pendingLogin = await jsonRequest(
    "/api/auth/login",
    "POST",
    { email: fixture.pendingUser.email, password: pendingPassword },
    cookieA,
  );
  await expectStatus("pending merchant login", pendingLogin, 403);
  const pendingSetCookie = pendingLogin.headers.get("set-cookie") || "";
  if (
    !pendingSetCookie.includes("catalog_session=") ||
    !/Max-Age=0|Expires=/i.test(pendingSetCookie)
  ) {
    throw new Error(
      "Pending merchant login did not clear a pre-existing merchant session cookie",
    );
  }

  await expectStatus(
    "own shop profile",
    await request(`/api/shops/${fixture.shopA.id}/profile`, {}, cookieA),
    200,
  );


  const noPriceCreate = await jsonRequest(
    `/api/shops/${fixture.shopA.id}/products`,
    "POST",
    {
      name: `Sprint6 No Price Product ${suffix}`,
      categoryId: null,
      sku: null,
      description: "Regression product with intentionally blank price",
      price: null,
      discountPrice: null,
      priceType: "FIXED",
      availabilityStatus: "IN_STOCK",
      isFeatured: false,
      isNewArrival: false,
      isOffer: false,
      isVisible: true,
      showPrice: null,
      attributes: [],
    },
    cookieA,
  );
  await expectStatus("create product without price", noPriceCreate, 201);
  const noPricePayload = await noPriceCreate.json();
  const noPriceId = noPricePayload?.data?.id;
  const noPriceSlug = noPricePayload?.data?.slug;
  if (!noPriceId || !noPriceSlug) {
    throw new Error("Product without price did not return an id and slug");
  }

  const noPriceUpdate = await jsonRequest(
    `/api/shops/${fixture.shopA.id}/products/${noPriceId}`,
    "PATCH",
    {
      name: `Sprint6 No Price Product Updated ${suffix}`,
      availabilityStatus: "ON_REQUEST",
      price: null,
      discountPrice: null,
      priceType: "FIXED",
    },
    cookieA,
  );
  await expectStatus("edit product without price", noPriceUpdate, 200);
  const noPriceUpdatePayload = await noPriceUpdate.json();
  const updatedNoPriceSlug = noPriceUpdatePayload?.data?.slug;
  if (!updatedNoPriceSlug) {
    throw new Error("Edited no-price product did not return the updated slug");
  }

  const noPriceDuplicate = await jsonRequest(
    `/api/shops/${fixture.shopA.id}/products/${noPriceId}/duplicate`,
    "POST",
    {},
    cookieA,
  );
  await expectStatus("duplicate product without price", noPriceDuplicate, 201);
  const duplicatePayload = await noPriceDuplicate.json();
  if (duplicatePayload?.data?.isVisible !== false) {
    throw new Error("Duplicated no-price product was not hidden by default");
  }
  if (duplicatePayload?.data?.price != null) {
    throw new Error("Duplicated no-price product unexpectedly gained a price");
  }

  const noPricePublic = await request(
    `/s/${fixture.shopA.slug}/p/${updatedNoPriceSlug}`,
  );
  await expectStatus("public no-price product", noPricePublic, 200);
  const noPriceHtml = await noPricePublic.text();
  if (!noPriceHtml.includes("Price on request")) {
    throw new Error("Product without price did not render as Price on request");
  }

  const crossTenantChecks = [
    ["cross-tenant profile", `/api/shops/${fixture.shopB.id}/profile`],
    ["cross-tenant categories", `/api/shops/${fixture.shopB.id}/categories`],
    [
      "cross-tenant product",
      `/api/shops/${fixture.shopB.id}/products/${fixture.productB.id}`,
    ],
    ["cross-tenant imports", `/api/shops/${fixture.shopB.id}/imports/products`],
    ["cross-tenant analytics", `/api/shops/${fixture.shopB.id}/analytics`],
    [
      "cross-tenant subscription",
      `/api/shops/${fixture.shopB.id}/subscription`,
    ],
  ];

  for (const [label, path] of crossTenantChecks) {
    await expectStatus(label, await request(path, {}, cookieA), 403);
  }

  await expectStatus(
    "cross-tenant upload authorization",
    await jsonRequest(
      `/api/shops/${fixture.shopB.id}/products/${fixture.productB.id}/images/upload-url`,
      "POST",
      {
        fileName: "blocked.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      },
      cookieA,
    ),
    403,
  );

  for (const [label, path] of [
    ["merchant blocked from admin shops", "/api/admin/shops?status=ACTIVE"],
    ["merchant blocked from admin plans", "/api/admin/plans"],
    [
      "merchant blocked from admin business categories",
      "/api/admin/business-categories",
    ],
    ["merchant blocked from platform analytics", "/api/admin/analytics"],
  ]) {
    await expectStatus(label, await request(path, {}, cookieA), 403);
  }


  const adminPageAsMerchant = await request("/admin", {}, cookieA);
  if (![303, 307, 308].includes(adminPageAsMerchant.status)) {
    throw new Error(
      `merchant admin page should redirect to access denied, got HTTP ${adminPageAsMerchant.status}`,
    );
  }
  const merchantAdminLocation = adminPageAsMerchant.headers.get("location") || "";
  if (!merchantAdminLocation.includes("/access-denied")) {
    throw new Error(
      `merchant admin page redirected to an unexpected location: ${merchantAdminLocation}`,
    );
  }

  await expectStatus(
    "merchant session remains valid after blocked admin page",
    await request("/api/auth/me", {}, cookieA),
    200,
  );

  await prisma.shopUser.update({
    where: { id: fixture.membershipA.id },
    data: { role: "STAFF" },
  });

  await expectStatus(
    "STAFF blocked from merchant mutation",
    await jsonRequest(
      `/api/shops/${fixture.shopA.id}/categories`,
      "POST",
      { name: "Should Not Be Created" },
      cookieA,
    ),
    403,
  );

  await prisma.shopUser.update({
    where: { id: fixture.membershipA.id },
    data: { role: "OWNER" },
  });

  const storefront = await request(`/s/${fixture.shopA.slug}`);
  await expectStatus("active public storefront", storefront, 200);
  const storefrontHtml = await storefront.text();

  if (!storefrontHtml.includes(fixture.visibleProductA.name)) {
    throw new Error("Visible product was missing from active storefront");
  }
  if (storefrontHtml.includes(fixture.hiddenProductA.name)) {
    throw new Error("Hidden product leaked into public storefront");
  }

  const forgot = await jsonRequest("/api/auth/forgot-password", "POST", {
    email: fixture.userA.email,
  });
  await expectStatus("forgot password", forgot, 200);
  const forgotPayload = await forgot.json();
  const resetToken = forgotPayload?.data?.developmentResetToken;

  if (resetToken) {
    const reset = await jsonRequest("/api/auth/reset-password", "POST", {
      token: resetToken,
      password: passwordANext,
    });
    await expectStatus("password reset", reset, 200);

    await expectStatus(
      "pre-reset session revoked",
      await request("/api/auth/me", {}, cookieA),
      401,
    );

    cookieA = await login(fixture.userA.email, passwordANext);
    await expectStatus(
      "post-reset session valid",
      await request("/api/auth/me", {}, cookieA),
      200,
    );
  } else {
    process.stdout.write(
      "Session-revocation HTTP check skipped because reset tokens are not exposed by this server environment.\n",
    );
  }

  const adminCookie = await login(fixture.admin.email, adminPassword);

  await expectStatus(
    "admin shop detail",
    await request(`/api/admin/shops/${fixture.shopB.id}`, {}, adminCookie),
    200,
  );
  await expectStatus(
    "admin platform analytics",
    await request("/api/admin/analytics", {}, adminCookie),
    200,
  );

  const businessCategoryCreate = await jsonRequest(
    "/api/admin/business-categories",
    "POST",
    {
      name: `Sprint 6 Admin Category ${suffix}`,
      slug: `sprint6-admin-category-${suffix}`,
      status: "ACTIVE",
      displayOrder: 9999,
    },
    adminCookie,
  );
  await expectStatus("admin business category create", businessCategoryCreate, 201);
  const businessCategoryPayload = await businessCategoryCreate.json();
  const businessCategoryId = businessCategoryPayload?.data?.id;
  if (!businessCategoryId) {
    throw new Error("Admin business category create did not return an id");
  }
  created.businessCategoryIds.push(businessCategoryId);

  await expectStatus(
    "admin business category update",
    await jsonRequest(
      `/api/admin/business-categories/${businessCategoryId}`,
      "PATCH",
      { status: "INACTIVE", displayOrder: 10000 },
      adminCookie,
    ),
    200,
  );

  await expectStatus(
    "admin shop suspension",
    await jsonRequest(
      `/api/admin/shops/${fixture.shopB.id}/status`,
      "PATCH",
      { status: "SUSPENDED" },
      adminCookie,
    ),
    200,
  );

  const audit = await prisma.auditLog.findFirst({
    where: {
      actorUserId: fixture.admin.id,
      shopId: fixture.shopB.id,
      action: "SHOP_STATUS_CHANGED",
      entityType: "Shop",
      entityId: fixture.shopB.id,
    },
  });

  if (!audit) {
    throw new Error("Expected admin shop-status audit row was not created");
  }

  const suspendedShop = await prisma.shop.findUnique({
    where: { id: fixture.shopB.id },
    select: { status: true },
  });
  if (suspendedShop?.status !== "SUSPENDED") {
    throw new Error(
      `Admin suspension did not persist. Expected SUSPENDED, got ${suspendedShop?.status ?? "missing"}`,
    );
  }

  const suspendedStorefront = await request(`/s/${fixture.shopB.slug}`);
  const suspendedHtml = await suspendedStorefront.text();

  if (suspendedStorefront.status !== 404) {
    const streamedNotFound =
      suspendedStorefront.status === 200 &&
      suspendedHtml.includes("This catalogue is not available") &&
      !suspendedHtml.includes(fixture.shopB.name) &&
      !suspendedHtml.includes(fixture.productB.name);

    if (!streamedNotFound) {
      throw new Error(
        `Suspended storefront remained publicly accessible. Expected HTTP 404 or streamed not-found response, got ${suspendedStorefront.status}`,
      );
    }
  }

  process.stdout.write(
    "Sprint 6 tenant, role, storefront, session and admin-audit regression checks passed.\n",
  );
}

main()
  .catch((error) => {
    console.error("Sprint 6 tenant regression checks failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } finally {
      await prisma.$disconnect();
    }
  });
