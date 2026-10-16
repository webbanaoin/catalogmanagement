# Optional WhatsApp Wishlist — staging UAT

Feature branch: `feature/prashant-wishlist-whatsapp-enquiry`.
Do not promote to production until staging browser tests pass.

## Security and rollout

- Migration: `20261016232500_shop_wishlist_opt_in` adds two Boolean columns to `shops`. Both default to `false`; existing shops remain unchanged until explicitly opted in.
- Admin flag `wishlistAllowedByAdmin` and merchant flag `wishlistEnabledByMerchant` must both be true, the shop ACTIVE and WhatsApp configured.
- Public wishlist stored only in browser `localStorage`, scoped to each shop slug. No customer login, user PII table, order record or automatic WhatsApp send.
- Submit validates product slugs against the **current tenant's visible products**. Deleted, hidden or other-shop products cannot be included; masked product prices are never in the message.
- 20 unique products max; quantities 1–10 per product; the header count is unique products, not total units.

## Staging activation

1. Take a staging MySQL snapshot before deploying.
2. Deploy the staging code and run `npx prisma migrate deploy` against **staging only**. Check `prisma migrate status`.
3. Sign in as Platform Admin, open **Admin > Shops > Active**, locate a test shop (for example Happy Planet Toys & Stationery). Choose **Allow wishlist**.
4. Sign in as the test merchant: **Dashboard > Shop Profile > WhatsApp wishlist enquiries**.
5. Ensure the shop WhatsApp number is configured; check **Enable My Wishlist on my showroom**, then Save Profile.

## Manual customer UAT

1. In an incognito browser open the test shop's public storefront. The header must show a wishlist heart with count 0.
2. Add a product from its card; count becomes 1, button heart fills. Add the same product again: must not duplicate.
3. Add other products across category filters, pages and a product detail page. Count persists on navigation/refresh in that browser.
4. Tap the header wishlist count. Confirm image/name/SKU, quantity +/-, Remove and current list length. The list must be scrollable on mobile.
5. Tap **Send Enquiry on WhatsApp**. Verify WhatsApp draft contains correct shop, names, SKUs, quantities and product links. Check customer must manually press Send. A hidden-price product's price must not appear.
6. Verify browsing another shop shows a separate (empty) wishlist. Open same shop in another incognito session; its wishlist must be empty.
7. Verify products made hidden/deleted after adding are rejected on submit, without leaking other-shop items.
8. Merchant disables wishlist: new storefront loads without any wishlist controls; re-enable restores the controls.
9. Platform Admin revokes permission: the UI disappears even while the merchant setting is ON; attempts to enable via merchant API receive 403 when admin OFF.
10. Test without a valid WhatsApp number: merchant must not be able to enable the wishlist.
11. Verify existing Jewellery price-request WhatsApp button, hero image, QR, PWA, search, product listing and payment/subscription pages continue working.

## Browser limitations

- Wishlist is saved locally in each browser and does not sync between devices.
- WhatsApp opens with a prefilled message; the visitor must confirm delivery inside WhatsApp. No message is recorded in the database, and clicking the button is not proof of delivery.
- Existing local wishlist items remain in browser storage when the admin/merchant disables the feature. They're inaccessible in the disabled storefront.

## Final gate

PR CI: Prisma validate/generate/migrate, lint, typecheck, build, Sprint-6 regressions, and `npm run test:wishlist` must be green. Hostinger staging migration and live browser UAT are separate and must be confirmed before production merge.
