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

## Merchant dashboard
Mobile-first dashboard with catalogue/product views, WhatsApp/call/directions clicks, quick add product, products, categories, QR, shop profile, analytics and subscription.

Product operations: add, edit, hide/show, soft-delete, restore, duplicate, search/filter and multiple images.

## Shop profile
Logo, cover, name, tagline/about, phone, WhatsApp, email, address, city/state/PIN, Google Maps URL, opening hours and optional social links.

## Excel import
Download template -> upload -> validate -> preview -> confirm import.
Initial columns: Product Name, SKU, Category, Price, Price Type, Discount Price, Description, Availability, Featured, New Arrival.

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
Plans are database-driven. Backend enforces limits. Trial expiry must not delete merchant data. Payment gateway is not required in Phase 1.

## Initial target verticals
Jewellery, Toys & Gifts, Furniture & Home Decor, Clothing/Boutique/Saree, Footwear.

## Explicitly out of Phase 1
Cart, checkout, payment gateway, delivery/order management, customer accounts, ratings/reviews, city marketplace, cross-shop search, POS/ERP, native mobile apps, paid WhatsApp API, loyalty/CRM.

## Pilot
Start with about five shops across multiple target verticals. Validate mobile product entry, image upload, categories, QR usage, customer scans, WhatsApp enquiries and catalogue updating before broader rollout.
