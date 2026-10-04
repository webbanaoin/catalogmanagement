# Phase 1 Product Requirements

## Product positioning
Merchant: "Your shop's Digital Showroom."
Customer: scan once and view the shop's latest collection anytime.

## Phase 1 market
Phase 1 is India-only. Merchant/customer contact and address UX should therefore use India-specific validation where applicable:
- mobile and WhatsApp numbers use valid 10-digit Indian mobile numbers, with optional +91 presentation;
- shop phone may be a valid Indian mobile or landline number;
- postal PIN uses the 6-digit Indian PIN format.

International phone/address support is outside the current Phase 1 scope unless requirements are explicitly changed.

## Merchant flow
Register -> pending admin review -> approved -> login -> complete shop profile -> create categories -> add/import products -> publish/share permanent QR -> view analytics.

## Public storefront
Permanent route: /s/{shopSlug}
Product route: /s/{shopSlug}/p/{productSlug}
Category route: /s/{shopSlug}/c/{categorySlug}

Show shop logo/cover, name/tagline, address/city, opening status, WhatsApp, call, directions, search, categories, new arrivals, featured products, offers and all products.

Product detail supports multiple images, name, SKU, price/discount, description, category, availability, flexible attributes, WhatsApp, call, directions and share.

Price types: fixed, starting_from, ask_price.

### Product price visibility
Phase 1 supports enquiry-led catalogues such as jewellery, boutique and premium custom-product shops where merchants may not want to publish prices.

Price visibility rules:
- each shop has a `showProductPrices` default;
- each product has an optional `showPrice` override;
- `showPrice = null` inherits the shop default;
- `showPrice = true` always shows that product price when the price type supports a displayed amount;
- `showPrice = false` always hides that product price;
- `ASK_PRICE` always behaves as price-on-request.

When a price is hidden, the public storefront must not expose the numeric price/discount value in the public product response. Product cards and product detail show **Price on request** instead.

On a hidden-price product detail, the primary WhatsApp action is **Request Price**. The prefilled message includes product name, SKU when available, category when available, availability and the public product link. The closing message adapts to availability: in-stock requests price/availability, out-of-stock asks when the item will be available, and on-request asks for expected availability/lead time.

## Merchant dashboard
Mobile-first dashboard with catalogue/product views, WhatsApp/call/directions clicks, quick add product, products, categories, QR, shop profile, analytics and subscription.

Product operations: add, edit, hide/show, soft-delete, restore, duplicate, search/filter and multiple images.

## Shop profile
Logo, cover, name, tagline/about, phone, WhatsApp, email, address, city/state/PIN, Google Maps URL, opening hours and optional social links.

## Excel import
Merchant flow: download blank template or current catalogue -> upload -> validate/preview -> confirm ready rows -> review import history.

Columns: Product Name, SKU / Product Code (Optional), Category, Price, Price Type, Discount Price, Description, Availability, Featured, New Arrival.

Product Code is optional for merchants. When it is blank, the backend generates a shop-scoped `PRD-*` code during confirmed import. Manual product creation and product duplication also generate a Product Code when none is supplied, and legacy blank codes are backfilled.

Import preview classifies rows as Ready, Duplicate or Invalid. A supplied Product Code is checked for an existing shop-scoped conflict; when the code is blank, likely duplicates are detected from a normalized product fingerprint using name, category and pricing details. Duplicate and invalid rows are skipped, while valid Ready rows can still be imported in the same workbook.

Current catalogue export includes saved/generated Product Codes so merchants can keep a backup/reference sheet without maintaining codes manually. Re-uploading an unchanged exported catalogue is duplicate-safe; Phase 1 import does not bulk-update existing products.

Excel import/export is tenant-scoped. OWNER or MANAGER access is required for protected import actions, and one shop cannot preview, confirm, list or export another shop's catalogue/import jobs.

## QR
Each shop gets a permanent QR pointing to the production branded /s/{slug} URL. Support download/share and QR-source tracking. Never encode a temporary Hostinger URL.

## Customer actions
No customer login in Phase 1. Support click-to-chat WhatsApp with product context, call, directions and share.

## Analytics
Catalogue visits, unique/session-aware visits, QR visits, product views, WhatsApp clicks, calls, directions, shares, top products/categories and traffic source.

## PWA
Customer can add a shop to home screen; merchant can add dashboard to home screen.

## Admin
View pending/active/suspended shops, approve/reject/suspend/activate shops, inspect shop/subscription details, manage global business categories and plans, and view platform-level analytics.

## Subscription architecture
Plans are database-driven. Each plan defines product and image limits plus feature flags such as analytics, Excel import and custom branding. Backend enforcement is server-side and tenant-scoped.

Subscriptions support trial, active, grace, expired and cancelled states. New approved shops receive the configured default trial when no subscription exists. Trial/subscription expiry must not delete merchant catalogue data or silently change shop ownership/status.

Admin controls can assign/change a plan, extend a subscription and update administrative payment state. Payment gateway integration is not required in Phase 1.

## Initial target verticals
Jewellery, Toys & Gifts, Furniture & Home Decor, Clothing/Boutique/Saree, Footwear.

## Explicitly out of Phase 1
Cart, checkout, payment gateway, delivery/order management, customer accounts, ratings/reviews, city marketplace, cross-shop search, POS/ERP, native mobile apps, paid WhatsApp API, loyalty/CRM.

## Pilot
Start with about five shops across multiple target verticals. Validate mobile product entry, image upload, categories, QR usage, customer scans, WhatsApp enquiries and catalogue updating before broader rollout.
