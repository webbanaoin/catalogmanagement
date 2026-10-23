import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const needs = (file, text) =>
  assert(read(file).includes(text), `${file}: missing contract ${text}`);

const schema = read("prisma/schema.prisma");
assert(schema.includes("model StorefrontGrowthEvent"), "missing growth analytics model");
assert(schema.includes("storefrontGrowthPromoEnabled Boolean @default(true)"), "shop default must remain enabled");

const banner = read("src/components/storefront/storefront-growth-cta.tsx");
for (const text of [
  "Create My Digital Showroom", "Earn with Us",
  "Refer Shops", "Explore Webbanao Digital Showroom",
  "IntersectionObserver", "CREATE_CLICK", "PARTNER_CLICK", "EXPLORE_CLICK",
]) assert(banner.includes(text), `Missing CTA/tracking ${text}`);

for (const route of [
  "src/app/s/[shopSlug]/page.tsx",
  "src/app/s/[shopSlug]/c/[categorySlug]/page.tsx",
  "src/app/s/[shopSlug]/p/[productSlug]/page.tsx",
]) needs(route, "storefrontGrowthPromoEnabled={");

needs("src/components/storefront/storefront-shell.tsx", "shopSlug && storefrontGrowthPromoEnabled");
needs("src/app/api/public/shops/[shopSlug]/growth/events/route.ts", "enforceRateLimit");
needs("src/app/api/public/shops/[shopSlug]/growth/events/route.ts", "storefrontGrowthPromoEnabled: true");
needs("src/app/api/admin/shops/[shopId]/storefront-promotion/route.ts", "requirePlatformAdmin");
needs("src/app/api/auth/register/route.ts", '"MERCHANT_REGISTERED"');
needs("src/app/api/partner/register/route.ts", '"PARTNER_REGISTERED"');
needs("src/server/marketing/growth-conversion.ts", 'recordGrowthConversion');
needs("src/app/admin/growth/page.tsx", "requirePlatformAdminPageAccess");
needs("src/app/admin/growth/page.tsx", "PARTNER_REGISTERED");
needs("src/validation/auth.ts", "growthSourceShopSlug");
needs("src/validation/referrals.ts", "growthSourceShopSlug");

console.log("Growth promotion cross-module source contracts OK");
