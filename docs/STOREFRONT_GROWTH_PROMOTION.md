# Storefront growth promotion — Phase 1

## Behavior
- Responsive promotional section appears exactly once on each public merchant shop, category and product detail page, after merchant-owned content and before the footer.
- Buttons: Create My Digital Showroom -> /register; Earn with Us -> /partner/register; Explore Webbanao Digital Showroom -> /. Company attribution links to https://webbanao.in.
- Source-shop and UTM query parameters are included for future attribution. No lead conversion tracking or commission credit is implemented in Phase 1. Existing partner referral code rules are not changed.
- The optional banner never replaces merchant branding, WhatsApp enquiry, wishlist or product browsing. No popup or autoplay.
- Enabled by default for existing and new shops. Admin > Shops > Webbanao growth promotion can independently enable or disable per shop. Disabling removes the banner from that shop's public pages; ordinary Powered by / legal attribution remains.

## Data/API
- Non-null shops.storefront_growth_promo_enabled BOOLEAN DEFAULT true.
- PATCH /api/admin/shops/:shopId/storefront-promotion accepts strict JSON { "enabled": boolean } and requires a platform administrator, validates shop existence, writes audit log.
- GET /api/admin/shops exposes storefrontGrowthPromoEnabled; public storefront map selects and renders it conditionally.

## Release checks
1. Apply Prisma migration 20261023220000_shop_storefront_growth_promotion with npm run db:migrate:deploy before serving new runtime.
2. Verify the banner on an existing active merchant's home, filtered category and product detail pages.
3. Admin > Shops: Disable and verify all three pages hide the banner, then enable and verify it returns.
4. Verify three correct links, mobile layout, WhatsApp, wishlist, and merchant branding.
5. Verify admin authorization and audit log; storefront links never automatically create referral commissions.
