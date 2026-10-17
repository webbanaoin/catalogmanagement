import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error("Set SPRINT6_TEST_CONFIRM=YES only with a disposable test database.");
}
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)
  && process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES") {
  throw new Error("Catalog default regression tests cannot run against a remote production target.");
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
const password = `Catalog-Aa9!${randomUUID().slice(0, 12)}`;
const fixtures = { userIds: [], shopIds: [], businessCategoryIds: [] };

function assert(value, message) { if (!value) throw new Error(message); }
async function request(path, method = "GET", body, cookie) {
  const headers = { "X-Real-IP": "203.0.113.86" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  return fetch(baseUrl + path, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
}
async function check(label, response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus} but got ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  return response.json();
}
async function user(name, platformRole = "USER") {
  const data = await prisma.user.create({
    data: {
      name, email: `catalog-${suffix}-${fixtures.userIds.length}@example.test`,
      passwordHash: await hash(password, 12), platformRole,
    },
  });
  fixtures.userIds.push(data.id);
  return data;
}
async function shop(owner, businessCategoryId) {
  const data = await prisma.shop.create({
    data: {
      name: `Catalog Default Shop ${suffix}`,
      slug: `catalog-default-${suffix}-${fixtures.shopIds.length}`,
      status: "ACTIVE", businessCategoryId,
    },
  });
  fixtures.shopIds.push(data.id);
  await prisma.shopUser.create({
    data: { shopId: data.id, userId: owner.id, role: "OWNER" },
  });
  return data;
}
async function login(account) {
  const response = await request("/api/auth/login", "POST", {
    email: account.email, password,
  });
  await check("login", response, 200);
  return response.headers.get("set-cookie")?.split(";")[0];
}
async function cleanup() {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { shopId: { in: fixtures.shopIds } },
        { actorUserId: { in: fixtures.userIds } },
      ],
    },
  });
  if (fixtures.shopIds.length) {
    await prisma.shop.deleteMany({ where: { id: { in: fixtures.shopIds } } });
  }
  if (fixtures.businessCategoryIds.length) {
    await prisma.businessCategory.deleteMany({
      where: { id: { in: fixtures.businessCategoryIds } },
    });
  }
  if (fixtures.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: fixtures.userIds } } });
  }
}
async function main() {
  const admin = await user("Category Regression Admin", "ADMIN");
  const merchant = await user("Category Regression Merchant");
  const otherMerchant = await user("Category Regression Second Merchant");
  const business = await prisma.businessCategory.create({
    data: { name: "Toys & Gifts", slug: `toys-gifts-${suffix}`, status: "ACTIVE" },
  });
  fixtures.businessCategoryIds.push(business.id);
  const merchantShop = await shop(merchant, business.id);
  const adminCookie = await login(admin);
  const merchantCookie = await login(merchant);
  const path = `/api/admin/business-categories/${business.id}/defaults`;

  await check("non-admin cannot create defaults", await request(path, "POST", {
    name: "Unauthorized Category", displayOrder: 10,
  }, merchantCookie), 403);

  const initial = await check("initial defaults", await request(path, "GET", undefined, adminCookie), 200);
  assert(initial.items.some((item) => item.name === "Soft Toys"), "Initial toys default missing");
  assert(initial.items.some((item) => item.name === "Stationery"), "Combined stationery default missing");

  const newItem = (await check("add admin default", await request(path, "POST", {
    name: "Exam Preparation Kits", displayOrder: 350,
  }, adminCookie), 201)).data;
  await check("reject duplicate", await request(path, "POST", {
    name: "exam preparation kits", displayOrder: 350,
  }, adminCookie), 409);

  const merchantPath = `/api/shops/${merchantShop.id}/categories`;
  const categories = await check("seed first merchant", await request(merchantPath, "GET", undefined, merchantCookie), 200);
  assert(categories.items.some((item) => item.name === "Soft Toys"), "Toys category not seeded");
  assert(categories.items.some((item) => item.name === "Stationery"), "Stationery not seeded");
  assert(categories.items.some((item) => item.name === "Exam Preparation Kits"), "Admin default not seeded");

  const softToy = categories.items.find((item) => item.name === "Soft Toys");
  await check("merchant deletes default", await request(`${merchantPath}/${softToy.id}`, "DELETE", undefined, merchantCookie), 200);
  const afterDeletion = await check("no unwanted category recreation", await request(merchantPath, "GET", undefined, merchantCookie), 200);
  assert(!afterDeletion.items.some((item) => item.name === "Soft Toys"), "Deleted merchant category was recreated");

  await check("deactivate default", await request(`${path}/${newItem.id}`, "PATCH", {
    status: "INACTIVE",
  }, adminCookie), 200);
  const secondShop = await shop(otherMerchant, business.id);
  const secondCookie = await login(otherMerchant);
  const secondCategories = await check("seed second merchant", await request(
    `/api/shops/${secondShop.id}/categories`, "GET", undefined, secondCookie,
  ), 200);
  assert(!secondCategories.items.some((item) => item.name === "Exam Preparation Kits"), "Inactive default was seeded");

  const media = await check("admin media lists combined defaults", await request(
    `/api/admin/business-categories/${business.id}/category-media`, "GET", undefined, adminCookie,
  ), 200);
  assert(media.items.some((item) => item.categoryName === "Stationery"), "Stationery shared image slot missing");
  assert(!media.items.some((item) => item.categoryName === "Exam Preparation Kits"), "Inactive shared image slot was offered");

  // Jewellery is a separate business vertical and cannot inherit toys defaults.
  const jewellery = await prisma.businessCategory.create({
    data: { name: "Jewellery", slug: `jewellery-${suffix}`, status: "ACTIVE" },
  });
  fixtures.businessCategoryIds.push(jewellery.id);
  const jewelleryShop = await shop(otherMerchant, jewellery.id);
  const jewelleryCategories = await check("jewellery isolation", await request(
    `/api/shops/${jewelleryShop.id}/categories`, "GET", undefined, secondCookie,
  ), 200);
  assert(jewelleryCategories.items.some((item) => item.name === "Ring"), "Jewellery preset missing");
  assert(!jewelleryCategories.items.some((item) => item.name === "Stationery"), "Toys default leaked into Jewellery");
  console.log("PASS: managed defaults, stationery, authorization, isolation, disable and deletion persistence");
}
try { await main(); }
finally {
  try { await cleanup(); }
  finally { await prisma.$disconnect(); }
}
