import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") throw Error("Run only on disposable CI DB.");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)) {
  throw Error("Storefront social regression must not target remote/production.");
}
const prisma = new PrismaClient();
const token = randomUUID().slice(0, 9);
const ids = [];
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
  const linked = await shop("linked", { instagramUrl: instagram, facebookUrl: facebook });
  const plain = await shop("plain", {});
  const malicious = await shop("malicious", { instagramUrl: "https://www.instagram.com.evil.test/redirect" });

  const withLinks = await html(linked);
  assert(withLinks.includes(`href="${instagram}"`) && withLinks.includes("Instagram"),
    "Saved Instagram profile not rendered in public storefront");
  assert(withLinks.includes(`href="${facebook}"`) && withLinks.includes("Facebook"),
    "Saved Facebook profile not rendered in public storefront");
  assert(withLinks.includes('rel="noopener noreferrer"'),
    "External social links must be safe in a new tab");

  const withoutLinks = await html(plain);
  assert(!withoutLinks.includes('aria-label="Shop social media"'),
    "Empty social profiles should not render links");
  assert(!withoutLinks.includes(instagram),
    "Another tenant's social URL leaked into a different storefront");

  const unsafe = await html(malicious);
  assert(!unsafe.includes("www.instagram.com.evil.test"),
    "Deceptive non-Instagram URL must not be published as Instagram");
  console.log("PASS: Instagram/Facebook visible, missing profiles hidden, no tenant leakage, safe domain links");
} finally {
  try { await prisma.shop.deleteMany({ where: { id: { in: ids } } }); }
  finally { await prisma.$disconnect(); }
}
