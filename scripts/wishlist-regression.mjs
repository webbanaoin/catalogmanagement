import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error("Use a disposable database and set SPRINT6_TEST_CONFIRM=YES.");
}
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)
  && process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES") {
  throw new Error("The wishlist regression must not target production.");
}
const prisma = new PrismaClient();
const uid = randomUUID().slice(0, 10);
const password = `WishlistAa9!${uid}`;
const created = { users: [], shops: [] };
function assert(ok, message) { if (!ok) throw new Error(message); }
async function user(role) {
  const value = await prisma.user.create({
    data: {
      email: `wishlist-${role}-${uid}@example.test`,
      name: `Wishlist ${role}`, passwordHash: await hash(password, 12),
      platformRole: role,
    },
  });
  created.users.push(value.id);
  return value;
}
async function shop(owner, idx) {
  const row = await prisma.shop.create({
    data: { name: `Wishlist Shop ${idx}`, slug: `wishlist-shop-${idx}-${uid}`, status: "ACTIVE" },
  });
  created.shops.push(row.id);
  await prisma.shopUser.create({ data: { shopId: row.id, userId: owner.id, role: "OWNER" } });
  return row;
}
async function request(path, method = "GET", data, cookie) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      "X-Real-IP": "203.0.113.99",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    redirect: "manual",
  });
}
async function check(label, response, expected) {
  const body = await response.json().catch(() => ({}));
  assert(response.status === expected, `${label}: ${response.status}, expected ${expected}, ${JSON.stringify(body).slice(0, 350)}`);
  return body;
}
async function login(account) {
  const response = await request("/api/auth/login", "POST", { email: account.email, password });
  await check("login", response, 200);
  return response.headers.get("set-cookie")?.split(";")[0];
}
async function main() {
  const admin = await user("ADMIN"), owner = await user("USER");
  const a = await shop(owner, "a"), b = await shop(owner, "b");
  const cookie = await login(owner), adminCookie = await login(admin);
  const adminPath = `/api/admin/shops/${a.id}/wishlist`;
  const profilePath = `/api/shops/${a.id}/profile`;
  const publicPath = `/api/public/shops/${a.slug}/wishlist`;
  const item = await prisma.product.create({
    data: {
      shopId: a.id, slug: `wishlist-item-${uid}`, name: "Demo Plush Toy",
      sku: `WL-${uid}`,
      isVisible: true,
    },
  });
  const other = await prisma.product.create({
    data: { shopId: b.id, slug: `other-shop-item-${uid}`, name: "Other Shop Product", isVisible: true },
  });

  await check("unapproved merchant cannot enable", await request(profilePath, "PATCH", {
    name: a.name, wishlistEnabledByMerchant: true, whatsapp: "9168720245",
  }, cookie), 403);
  await check("non-admin cannot allow", await request(adminPath, "PATCH", { allowed: true }, cookie), 403);
  await check("disabled public endpoint", await request(publicPath, "POST", { slugs: [item.slug] }), 404);
  await check("admin enables", await request(adminPath, "PATCH", { allowed: true }, adminCookie), 200);
  await check("WhatsApp required", await request(profilePath, "PATCH", {
    name: a.name, wishlistEnabledByMerchant: true,
  }, cookie), 400);
  await check("merchant enables", await request(profilePath, "PATCH", {
    name: a.name, whatsapp: "9168720245", wishlistEnabledByMerchant: true,
  }, cookie), 200);

  const saved = await check("valid wishlist", await request(publicPath, "POST", {
    slugs: [item.slug, other.slug],
  }), 200);
  assert(saved.data.products.length === 1 && saved.data.products[0].slug === item.slug,
    "Visible same-shop product must resolve.");
  assert(saved.data.unavailableSlugs.includes(other.slug), "Cross-shop product was exposed.");

  await prisma.product.update({ where: { id: item.id }, data: { isVisible: false } });
  const hidden = await check("hidden product", await request(publicPath, "POST", { slugs: [item.slug] }), 200);
  assert(hidden.data.products.length === 0 && hidden.data.unavailableSlugs.includes(item.slug), "Hidden product leaked.");
  await prisma.product.update({ where: { id: item.id }, data: { isVisible: true } });

  await check("merchant opts out", await request(profilePath, "PATCH", {
    name: a.name, wishlistEnabledByMerchant: false,
  }, cookie), 200);
  await check("merchant off blocks public", await request(publicPath, "POST", { slugs: [item.slug] }), 404);
  await check("merchant re-enables", await request(profilePath, "PATCH", {
    name: a.name, wishlistEnabledByMerchant: true,
  }, cookie), 200);
  await check("admin revokes", await request(adminPath, "PATCH", { allowed: false }, adminCookie), 200);
  await check("admin revocation blocks public", await request(publicPath, "POST", { slugs: [item.slug] }), 404);
  console.log("PASS: admin/merchant gating, WhatsApp requirement, public tenant visibility and revocation");
}
try { await main(); } finally {
  try {
    await prisma.auditLog.deleteMany({
      where: { OR: [
        { shopId: { in: created.shops } },
        { actorUserId: { in: created.users } },
      ] },
    });
    if (created.shops.length) await prisma.shop.deleteMany({ where: { id: { in: created.shops } } });
    if (created.users.length) await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  } finally { await prisma.$disconnect(); }
}
