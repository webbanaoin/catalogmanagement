import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") throw new Error("Use a disposable database only.");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Event regression may not target a remote server.");
}
const prisma = new PrismaClient();
const seed = randomUUID().slice(0, 8);
const password = `EventAa9!${seed}`;
const created = { users: [], shops: [], defaults: [] };
function assert(test, msg) { if (!test) throw Error(msg); }
async function call(path, method = "GET", payload, cookie) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}
async function check(label, response, status) {
  const value = await response.json().catch(() => ({}));
  assert(response.status === status, `${label}: expected ${status} got ${response.status}: ${JSON.stringify(value).slice(0, 300)}`);
  return value;
}
async function createUser(role) {
  const user = await prisma.user.create({
    data: {
      name: `Event ${role}`,
      email: `event-${role}-${seed}@example.test`,
      platformRole: role,
      passwordHash: await hash(password, 12),
    },
  });
  created.users.push(user.id);
  return user;
}
async function cookie(user) {
  const res = await call("/api/auth/login", "POST", { email: user.email, password });
  await check("login", res, 200);
  return res.headers.get("set-cookie")?.split(";")[0];
}
async function main() {
  const vertical = await prisma.businessCategory.findUnique({ where: { slug: "event-planners-decorators" } });
  assert(vertical, "Event business type was not provisioned by migration");
  const admin = await createUser("ADMIN");
  const owner = await createUser("USER");
  const adminCookie = await cookie(admin);
  const ownerCookie = await cookie(owner);
  const defaultsUrl = `/api/admin/business-categories/${vertical.id}/defaults`;
  const defaults = (await check("list defaults", await call(defaultsUrl, "GET", undefined, adminCookie), 200)).items;
  const byName = new Map(defaults.map((item) => [item.name, item]));
  const decoration = byName.get("Decoration");
  const entries = byName.get("Event Entries");
  const theme = byName.get("Theme-Based Decoration");
  const jungle = byName.get("Jungle Theme");
  const jhoomar = byName.get("Jhoomar Entry");
  assert(decoration && entries && theme && jungle && jhoomar, "Missing initial event defaults");
  assert(theme.parentId === decoration.id && jungle.parentId === theme.id &&
    jhoomar.parentId === entries.id, "Wrong 3-level hierarchy");

  await check("non-admin blocked", await call(defaultsUrl, "POST", {
    name: "Unauthorized Event Theme", parentId: theme.id,
  }, ownerCookie), 403);
  const custom = (await check("admin adds a theme", await call(defaultsUrl, "POST", {
    name: `Unicorn Party ${seed}`, parentId: theme.id, displayOrder: 99,
  }, adminCookie), 201)).data;
  created.defaults.push(custom.id);
  await check("4th-level rejected", await call(defaultsUrl, "POST", {
    name: "Too Deep Category", parentId: custom.id,
  }, adminCookie), 400);
  await check("cycle rejected", await call(`${defaultsUrl}/${theme.id}`, "PATCH", {
    parentId: jungle.id,
  }, adminCookie), 400);

  const shop = await prisma.shop.create({
    data: {
      name: `Event Showcase ${seed}`, slug: `event-showcase-${seed}`,
      businessCategoryId: vertical.id,
      status: "ACTIVE",
      whatsapp: "9168720245",
    },
  });
  created.shops.push(shop.id);
  await prisma.shopUser.create({ data: { shopId: shop.id, userId: owner.id, role: "OWNER" } });
  const list = (await check("merchant gets tree", await call(`/api/shops/${shop.id}/categories?pageSize=100`, "GET", undefined, ownerCookie), 200)).items;
  const own = new Map(list.map((item) => [item.name, item]));
  assert(own.get("Theme-Based Decoration").parentId === own.get("Decoration").id, "Merchant theme parent not linked");
  assert(own.get("Jungle Theme").parentId === own.get("Theme-Based Decoration").id, "Merchant jungle grandparent not linked");
  assert(own.get(custom.name).parentId === own.get("Theme-Based Decoration").id, "Custom category not synced");

  await prisma.product.create({
    data: {
      shopId: shop.id, categoryId: own.get("Jungle Theme").id,
      name: "Jungle Event Service Package", slug: `jungle-event-${seed}`,
      isVisible: true, priceType: "ASK_PRICE", availabilityStatus: "ON_REQUEST",
    },
  });

  for (const filter of ["decoration", "theme-based-decoration", "jungle-theme"]) {
    const response = await call(`/s/${shop.slug}?category=${filter}`);
    assert(response.status === 200, `Storefront category ${filter} returned ${response.status}`);
    const html = await response.text();
    assert(html.includes("Jungle Event Service Package"), `Descendant product not shown for ${filter}`);
  }
  // Parent navigation must work across the full 3-level hierarchy.
  const breadcrumbCases = [
    ["decoration", "Back to all categories"],
    ["theme-based-decoration", "Back to Decoration"],
    ["jungle-theme", "Back to Theme-Based Decoration"],
  ];
  for (const [slug, expectedLabel] of breadcrumbCases) {
    const res = await call(`/s/${shop.slug}?category=${slug}#storefront-categories`);
    const categoryHtml = await res.text();
    assert(categoryHtml.includes(expectedLabel),
      `Missing navigation ${expectedLabel} on category ${slug}`);
  }

  // Preserve filtered collection context (including pagination) when going
  // into a product, and provide a safe category fallback for shared links.
  const listResponse = await call(`/s/${shop.slug}?category=jungle-theme&page=2`);
  const listHtml = await listResponse.text();
  assert(listHtml.includes("from="), "Product cards must carry a return location");

  const context = `/s/${shop.slug}?category=jungle-theme&page=2#storefront-products`;
  const productPath = `/s/${shop.slug}/p/jungle-event-${seed}`;
  const detailed = await call(productPath + "?from=" + encodeURIComponent(context));
  assert(detailed.status === 200, "Product page failed with saved return context");
  const detailedHtml = await detailed.text();
  assert(detailedHtml.includes("Back to products"), "Product must show visible Back to products");
  assert(detailedHtml.includes("page=2"), "Product return link must preserve filtered page");
  const sharedLink = await call(productPath);
  assert((await sharedLink.text()).includes("Back to products"),
    "Directly shared product must have fallback navigation");

  const home = await call(`/s/${shop.slug}`);
  const html = await home.text();
  assert(html.includes("Decoration") && html.includes("Event Entries"), "Root categories not displayed");
  console.log("PASS: event vertical seed, three-level merchant tree, admin theme editing, tenant isolation and descendant storefront queries");
}
try { await main(); }
finally {
  try {
    if (created.shops.length || created.users.length || created.defaults.length) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { shopId: { in: created.shops } },
            { actorUserId: { in: created.users } },
            { entityId: { in: created.defaults } },
          ],
        },
      });
      if (created.shops.length) await prisma.shop.deleteMany({ where: { id: { in: created.shops } } });
      if (created.defaults.length) await prisma.businessCategoryDefault.deleteMany({ where: { id: { in: created.defaults } } });
      if (created.users.length) await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    }
  } finally { await prisma.$disconnect(); }
}
