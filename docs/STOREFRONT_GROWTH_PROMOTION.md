# Webbanao Storefront Growth Promotion — Phases 1 and 2

## Phase 1: merchant catalog banner
- Displays once after catalog content, before footer, on shop home, category, and product pages.
- Primary CTA **Create My Digital Showroom** links to /register.
- Secondary CTA **Earn with Us** / **Refer Shops & Earn** links to /partner/register.
- Third CTA **Explore Webbanao Digital Showroom** links to the product landing page (/).
- Prominent mobile-friendly controls, clearer headline, no popup or autoplay.
- Platform admin independently enables/disables each shop under Admin > Shops > Webbanao growth promotion.
- The brand footer has no duplicate attribution; root legal/footer still includes Powered by webbanao.in.
- This setting does not affect merchant WhatsApp enquiries, Wishlist, or product browsing.

## Phase 2: attribution & analytics
- New `storefront_growth_events` table records `IMPRESSION`, `CREATE_CLICK`, `PARTNER_CLICK`, `EXPLORE_CLICK`, `MERCHANT_REGISTERED`, and `PARTNER_REGISTERED`.
- Impression recorded only when banner enters viewport, with browser-session+pathname deduplication. Click events use non-blocking sendBeacon/fetch with keepalive.
- Public POST `/api/public/shops/[shopSlug]/growth/events`: validate event and source page, rate-limit by IP, require a currently ACTIVE shop with promo enabled.
- CTA links preserve `source_shop` and `utm_*`; the landing page carries the source into merchant and partner registration links.
- Merchant and partner registration accept optional validated `growthSourceShopSlug`. After successful registration commits, attribution is written best-effort; missing migration or analytics errors do **not** fail the genuine registration.
- Converted entity identifiers are opaque internal IDs; no email, phone, passwords or customer PII stored in growth records.
- A successful signup is the registration submission (pending approval), not a paid subscription.
- `/admin/growth`: admin-only 7/30/90-day overview with impressions, three CTA clicks, both signup outcomes and per-source-shop performance.
- Counts are indicative, not unique humans or audited sales; attribution parameters are not secure proof of referral and never affect commission allocation.
- When disabled, growth banner events stop; existing historical data remains visible to admins.
- Single-origin POST and local rate-limits mitigate spam but web analytics can be distorted; do not use for payments or partner payouts.

## Database migration and release
1. Apply `20261024004500_storefront_growth_analytics` on production with `npm run db:migrate:deploy` **before activating the application**.
2. Ensure Prisma Client regenerated and deployment uses latest `main`. Build script only auto-migrates when explicitly configured for staging.
3. Before production, run `npm run prisma:validate`, `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm run test:growth:contract`, `npm run build`.
4. Confirm /admin/shops per-shop ON/OFF works, with no promo shown when OFF.
5. Confirm mobile/desktop promotion styles, all three links, and no duplicate Powered by branding.
6. Test impressions and clicks then inspect /admin/growth (7/30/90-day filter); verify source shop names and event count.
7. With a disposable test shop/account, complete verified merchant and partner registrations from source-shop links; ensure each is counted only after success.
8. Verify normal referral-code flow, registration errors, direct signup without source_shop and broken/unrecognized source_shop remain safe.
9. Never perform synthetic registrations on production without approval; Phase 2 requires testing against a disposable staging DB.
