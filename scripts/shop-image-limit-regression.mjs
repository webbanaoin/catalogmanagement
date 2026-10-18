import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") throw Error("Use a disposable test database only.");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)) {
  throw Error("Shop quota tests cannot target a remote production host.");
}

const prisma = new PrismaClient();
const uid = randomUUID().slice(0, 10);
const password = `ImageAa9!${uid}`;
const ids = { user: [], shop: [], plan: [] };
function assert(ok, message) { if (!ok) throw Error(message); }
async function request(path, method = "GET", data, cookie) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
async function expect(label, response, status) {
  const data = await response.json().catch(() => ({}));
  assert(response.status === status, `${label} expected ${status}, got ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
async function newUser(role) {
  const row = await prisma.user.create({
    data: { name: `Quota ${role}`, email: `quota-${role}-${uid}@example.test`,
      platformRole: role, passwordHash: await hash(password, 12) },
  });
  ids.user.push(row.id);
  return row;
}
async function login(user) {
  const result = await request("/api/auth/login", "POST", { email: user.email, password });
  await expect("login", result, 200);
  return result.headers.get("set-cookie")?.split(";")[0];
}
async function newShop(owner, plan, mark) {
  const shop = await prisma.shop.create({
    data: { name: `Quota Shop ${mark}`, slug: `quota-shop-${mark}-${uid}`, status: "ACTIVE" },
  });
  ids.shop.push(shop.id);
  await prisma.shopUser.create({ data: { userId: owner.id, shopId: shop.id, role: "OWNER" } });
  await prisma.subscription.create({
    data: {
      shopId: shop.id, planId: plan.id, status: "TRIAL", paymentStatus: "NOT_REQUIRED",
      startDate: new Date(), endDate: new Date(Date.now() + 10 * 86400e3),
    },
  });
  const product = await prisma.product.create({
    data: { shopId: shop.id, name: `Demo Toy ${mark}`, slug: `demo-toy-${mark}-${uid}`,
      isVisible: true },
  });
  return { shop, product };
}

async function main() {
  const admin = await newUser("ADMIN"), merchant = await newUser("USER");
  const plan = await prisma.plan.create({
    data: {
      name: `Image Limit Test ${uid}`, slug: `quota-plan-${uid}`,
      productLimit: 10, imageLimitPerProduct: 5, totalImageLimit: 20, status: "ACTIVE",
    },
  });
  ids.plan.push(plan.id);
  const a = await newShop(merchant, plan, "a");
  const b = await newShop(merchant, plan, "b");
  const adminCookie = await login(admin), merchantCookie = await login(merchant);
  const path = `/api/admin/shops/${a.shop.id}/image-limit`;
  await expect("merchant cannot edit quota", await request(path, "PATCH", {
    imageLimitPerProductOverride: 2,
  }, merchantCookie), 403);
  await expect("reject zero", await request(path, "PATCH", {
    imageLimitPerProductOverride: 0,
  }, adminCookie), 400);
  await expect("reject 51", await request(path, "PATCH", {
    imageLimitPerProductOverride: 51,
  }, adminCookie), 400);
  await expect("reject wrong type", await request(path, "PATCH", {
    imageLimitPerProductOverride: "20",
  }, adminCookie), 400);

  const saved = await expect("admin overrides quota", await request(path, "PATCH", {
    imageLimitPerProductOverride: 1,
  }, adminCookie), 200);
  assert(saved.data.effectiveImageLimitPerProduct === 1, "Override not effective");
  assert(saved.data.totalImageLimit === 20, "Plan total images must stay unchanged");

  // Insert an existing file reference to avoid requiring live object storage.
  await prisma.productImage.create({
    data: {
      productId: a.product.id,
      storageKey: `shops/${a.shop.id}/products/${a.product.id}/existing.jpg`,
      isPrimary: true,
    },
  });
  const imageRequest = { fileName: "new-photo.jpg", mimeType: "image/jpeg", fileSize: 5000 };
  const aUrl = `/api/shops/${a.shop.id}/products/${a.product.id}/images/upload-url`;
  const bUrl = `/api/shops/${b.shop.id}/products/${b.product.id}/images/upload-url`;
  const limited = await expect("shop A hit its override", await request(
    aUrl, "POST", imageRequest, merchantCookie,
  ), 409);
  assert(limited.error.code === "IMAGE_LIMIT_REACHED", "Wrong quota error");
  const otherShop = await request(bUrl, "POST", imageRequest, merchantCookie);
  assert(otherShop.status !== 409, "Shop B must still have its original plan quota");

  const lifted = await expect("admin increases override", await request(path, "PATCH", {
    imageLimitPerProductOverride: 20,
  }, adminCookie), 200);
  assert(lifted.data.effectiveImageLimitPerProduct === 20, "Increased limit ignored");
  const secondUpload = await request(aUrl, "POST", imageRequest, merchantCookie);
  assert(secondUpload.status !== 409, "Increased limit must permit upload capacity");
  const reset = await expect("return to plan default", await request(path, "PATCH", {
    imageLimitPerProductOverride: null,
  }, adminCookie), 200);
  assert(reset.data.effectiveImageLimitPerProduct === 5 && reset.data.imageLimitPerProductOverride === null,
    "Did not restore plan default");
  const audit = await prisma.auditLog.count({ where: {
    shopId: a.shop.id, action: "SHOP_IMAGE_LIMIT_OVERRIDE_UPDATED",
  } });
  assert(audit === 3, `Expected 3 quota change audit records, got ${audit}`);
  console.log("PASS: per-shop image overrides, plan fallback, validation, tenant isolation and audit");
}

try { await main(); } finally {
  try {
    await prisma.auditLog.deleteMany({ where: {
      OR: [{ shopId: { in: ids.shop } }, { actorUserId: { in: ids.user } }],
    } });
    if (ids.shop.length) await prisma.shop.deleteMany({ where: { id: { in: ids.shop } } });
    if (ids.user.length) await prisma.user.deleteMany({ where: { id: { in: ids.user } } });
    if (ids.plan.length) await prisma.plan.deleteMany({ where: { id: { in: ids.plan } } });
  } finally { await prisma.$disconnect(); }
}
