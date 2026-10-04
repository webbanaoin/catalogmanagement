# Architecture

## Initial deployment
Customer/Merchant Browser
-> Next.js application on Hostinger
-> Hostinger MySQL via Prisma

Media path:
Browser -> authenticated upload authorization -> presigned URL -> AWS S3
Application -> stores media metadata/storage keys in MySQL.

A CDN such as CloudFront may be placed in front of S3 without changing business records.

## Application areas
- / : marketing
- /s/* : public storefront
- /dashboard/* : merchant application
- /admin/* : platform administration
- /api/* : server APIs

## Multi-tenancy
One app/database serves many shops. Shop-owned entities carry shop_id where appropriate. Authorization resolves the logged-in user's membership through shop_users and verifies access server-side on every protected operation.

Do not use frontend filtering as a security boundary.

## Identity model
users <-> shop_users <-> shops
shop_users role initially supports owner/manager/staff architecture even if Phase 1 UI exposes a smaller role set.

## Storage
AWS S3 stores product images, logos, covers and other catalogue media.
Recommended keys:
shops/{shopId}/logo/{uuid}.webp
shops/{shopId}/cover/{uuid}.webp
shops/{shopId}/products/{productId}/{uuid}.webp

Persist storage_key/thumbnail_key rather than a hard-coded S3 URL. Keep storage behind an application service abstraction such as upload authorization, delete and URL resolution.

## Search
Phase 1 search is within one shop and uses MySQL. Preserve structured city, business category, product category, price and availability data so a later city marketplace/search layer can be added without redesigning core catalogue data.

## Performance
Use responsive optimized images, lazy loading, thumbnails, pagination (target ~24 products per request), indexed tenant/category/slug/SKU/status fields, and cache/CDN capabilities where safe.

## Environments
LOCAL -> STAGING -> PRODUCTION.
Staging and production use separate databases/configuration. Secrets stay in environment variables and are never committed.

## Future migration
Initial: Hostinger App + Hostinger MySQL + S3.
Future: cloud application + managed MySQL + same S3, optionally CDN. Storage abstraction and DB storage keys should make media migration unnecessary.


## Sprint 6 operational hardening

The initial Hostinger pilot remains a single application process, so request throttling uses bounded process memory and introduces no Redis/KV recurring dependency. Horizontal scaling requires a shared atomic rate-limit store.

Session JWTs remain stateless but include a persisted user session version. Password reset increments the database version so older JWTs stop authorizing future requests.

Platform administration writes an indexed audit trail for shop status, plan and subscription mutations.

The application readiness endpoint checks both application execution and MySQL connectivity. Production deployment/recovery guidance is documented in `docs/SPRINT6_RELEASE.md`.
