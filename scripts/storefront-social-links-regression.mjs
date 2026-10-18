import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") throw Error("Run only on disposable CI DB.");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)) {
  throw Error("Storefront social regression must not target remote/production.");
}
const prisma = new PrismaClient();
const token = randomUUID().slice(0, 9);
const ids = [];
const users = [];
function assert(ok, why) { if (!ok) throw Error(why); }
async function shop(suffix, urls) {
  const item = await prisma.shop.create({
    data: {
      name: `Social Test ${suffix}`, slug: `social-${suffix}-${token}`,
      status: "ACTIVE", ...urls,
    },
  });
  ids.push(item.id);
  return item;
}
async function html(shop) {
  const response = await fetch(`${baseUrl}/s/${shop.slug}`);
  assert(response.status === 200, `Storefront ${shop.slug} returned HTTP ${response.status}`);
  return response.text();
}
try {
  const instagram = `https://www.instagram.com/angel_events_${token}/`;
  const facebook = `https://www.facebook.com/angel.events.${token}`;
  const maps = `https://maps.app.goo.gl/AngelEvent${token}`;
  const linked = await shop("linked", {});
  const plain = await shop("plain", {});
  const malicious = await shop("malicious", { instagramUrl: "https://www.instagram.com.evil.test/redirect" });

  // Exercise the actual authenticated merchant save flow, not only direct
  // database fixtures, so all three links are tested end-to-end.
  const email = `social-owner-${token}@example.test`;
  const password = `SocialTestAa9!${token}`;
  const owner = await prisma.user.create({
    data: { name: "Social Link Owner", email, passwordHash: await hash(password, 12) },
  });
  users.push(owner.id);
  await prisma.shopUser.create({
    data: { shopId: linked.id, userId: owner.id, role: "OWNER" },
  });
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(login.status === 200, "Shop owner login failed for profile regression");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert(cookie, "Missing merchant session for social profile regression");
  const profileResponse = await fetch(`${baseUrl}/api/shops/${linked.id}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: linked.name, instagramUrl: instagram,
      facebookUrl: facebook, googleMapsUrl: maps,
    }),
  });
  assert(profileResponse.status === 200,
    `Profile social/map save failed: ${profileResponse.status}: ${(await profileResponse.text()).slice(0, 260)}`);
  const savedProfile = await prisma.shop.findUnique({ where: { id: linked.id } });
  assert(savedProfile?.instagramUrl === instagram &&
      savedProfile.facebookUrl === facebook &&
      savedProfile.googleMapsUrl === maps,
    "Merchant profile must persist Instagram, Facebook and Google Maps separately");

  const withLinks = await html(linked);
  assert(withLinks.includes(`href="${instagram}"`) && withLinks.includes("Instagram"),
    "Saved Instagram profile not rendered in public storefront");
  assert(withLinks.includes(`href="${facebook}"`) && withLinks.includes("Facebook"),
    "Saved Facebook profile not rendered in public storefront");
  assert(withLinks.includes('rel="noopener noreferrer"'),
    "External social links must be safe in a new tab");
  assert(withLinks.includes(`href="${maps}"`) && withLinks.includes("Directions"),
    "Saved Google Maps URL must render as Directions on the public storefront");

  await prisma.product.create({
    data: {
      shopId: linked.id, name: "Event Stage", slug: `event-stage-${token}`,
      isVisible: true, priceType: "ASK_PRICE", availabilityStatus: "ON_REQUEST",
    },
  });
  const detail = await fetch(`${baseUrl}/s/${linked.slug}/p/event-stage-${token}`);
  assert(detail.status === 200, "Product detail navigation failed");
  const detailHtml = await detail.text();
  assert(detailHtml.includes(`href="${maps}"`) && detailHtml.includes("Directions"),
    "Saved Google Maps URL must also work on public product detail");

  const withoutLinks = await html(plain);
  assert(!withoutLinks.includes('aria-label="Shop social media"'),
    "Empty social profiles should not render links");
  assert(!withoutLinks.includes(instagram) && !withoutLinks.includes(facebook) &&
      !withoutLinks.includes(maps),
    "Another tenant's social or map URL leaked into a different storefront");
  assert(!withoutLinks.includes(">Directions</a>"),
    "A shop without a Google Maps URL must not display a Directions button");

  const unsafe = await html(malicious);
  assert(!unsafe.includes("www.instagram.com.evil.test"),
    "Deceptive non-Instagram URL must not be published as Instagram");
  console.log("PASS: authenticated profile save, Instagram/Facebook/Google Maps storefront and product detail, tenant isolation, safe domains");
} finally {
  try {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ shopId: { in: ids } }, { actorUserId: { in: users } }] },
    });
    await prisma.shop.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  }
  finally { await prisma.$disconnect(); }
}
