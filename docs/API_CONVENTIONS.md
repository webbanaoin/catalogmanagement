# API Conventions

## Principles
APIs must be typed, validated, tenant-safe and predictable. UI and API developers should agree on contracts before implementation.

## Response shapes
Successful collection example:
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "total": 0,
    "totalPages": 0
  }
}

Successful entity example:
{
  "data": {}
}

Error example:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": {}
  }
}

Do not expose stack traces, database errors, secrets or internal credentials to clients.

## Tenant authorization
For protected merchant APIs, resolve the authenticated user and verify shop membership server-side. A shop_id, product ID, category ID or URL parameter supplied by a client never proves authorization.

## Pagination/filtering
Use consistent page/pageSize semantics initially. Cap page size server-side. Search/filter inputs must be validated.

## Public APIs
Public storefront reads only visible/active shop/category/product data and must never return private merchant/admin fields.

Sprint 3 storefront pages use a server-only Prisma read layer rather than calling authenticated merchant APIs from the browser. Public reads require an ACTIVE shop, exclude inactive categories, and exclude hidden or soft-deleted products. Product lookups remain scoped to the parent shop slug.

## Mutations
Validate payloads. Return clear conflict/not-found/forbidden responses. Soft-delete where defined by the data model.

## Media
Backend authorizes upload intent and generates presigned S3 operations. Validate ownership, allowed MIME types, size and destination key. Frontend never receives AWS secret credentials.

Public storefront media resolves persisted storage keys on the server through the existing storage service. When media configuration is unavailable locally, storefront UI falls back to image placeholders rather than constructing bucket URLs.

## Versioning
Phase 1 can use stable /api routes without URL versioning. Breaking changes require coordination and documentation; avoid silently changing a contract already consumed by another feature branch.


## Sprint 2 frozen merchant contracts

All shop-owned endpoints require an authenticated shop membership. Mutations require OWNER or MANAGER and an APPROVED or ACTIVE shop.

- GET/PATCH `/api/shops/{shopId}/profile`
- GET/PUT `/api/shops/{shopId}/hours`
- GET `/api/business-categories`
- GET/POST `/api/shops/{shopId}/categories`
- GET/PATCH/DELETE `/api/shops/{shopId}/categories/{categoryId}`
- GET/POST `/api/shops/{shopId}/products`
- GET/PATCH/DELETE `/api/shops/{shopId}/products/{productId}`
- POST `/api/shops/{shopId}/products/{productId}/restore`
- POST `/api/shops/{shopId}/products/{productId}/images`
- DELETE `/api/shops/{shopId}/products/{productId}/images/{imageId}`

Product DELETE is soft-delete. Category DELETE is blocked while active products or child categories reference it. Image endpoints in Sprint 2 persist metadata only; S3 upload authorization remains Sprint 3. Product image storage keys must be scoped to `shops/{shopId}/products/{productId}/`.


## Sprint 3 product media contract

Product media uploads use a two-step flow so AWS credentials never reach the browser.

1. POST `/api/shops/{shopId}/products/{productId}/images/upload-url` with `fileName`, `mimeType`, and `fileSize`.
2. The backend authorizes OWNER/MANAGER access to an APPROVED/ACTIVE shop, verifies the product belongs to that shop, validates JPEG/PNG/WebP up to 8 MiB, generates a tenant/product-scoped storage key, and returns a short-lived presigned PUT URL.
3. The browser PUTs the file directly to S3 using the returned URL and required headers.
4. After upload succeeds, POST the existing `/images` metadata endpoint with the returned storage key.

The server generates storage keys. Clients must not choose arbitrary S3 destinations.

Product media lifecycle additions:
- Product list responses resolve the primary image to `url` and optional `thumbnailUrl`.
- Product detail responses resolve all product images to `url` and optional `thumbnailUrl`.
- The first registered image is automatically primary when the product has no images.
- PATCH `/api/shops/{shopId}/products/{productId}/images/{imageId}` updates `displayOrder` and/or `isPrimary`.
- Setting an image primary clears the primary flag from the product's other images.
- DELETE `/api/shops/{shopId}/products/{productId}/images/{imageId}` removes the S3 object(s) before metadata deletion.
- If the deleted image was primary and another image remains, the next image by display order/creation time becomes primary.


### Sprint 3 merchant product workflow additions

- GET `/api/shops/{shopId}/products` supports `q`, `categoryId`, `availability`, `visibility=visible|hidden`, `featured=true`, `newArrival=true`, `offer=true`, and `deleted=true`, plus page/pageSize.
- PATCH `/api/shops/{shopId}/products/{productId}` is used for edit and hide/show through `isVisible`.
- DELETE and restore retain the Sprint 2 soft-delete behavior; restored products remain hidden until explicitly published.
- POST `/api/shops/{shopId}/products/{productId}/duplicate` accepts optional `name` and `sku`. The copy starts hidden and does not copy image objects, preventing accidental publication or duplicated S3 ownership.


## Sprint 5 plan and subscription contracts

Plans are database-driven and subscription enforcement happens server-side after normal tenant authorization.

- GET `/api/plans`
- GET/POST `/api/admin/plans`
- PATCH `/api/admin/plans/{planId}`
- GET `/api/shops/{shopId}/subscription`
- GET/POST/PATCH `/api/admin/shops/{shopId}/subscription`

Platform-admin mutations require `PlatformRole.ADMIN`.

Merchant entitlement checks never trust a client-supplied plan, limit or subscription status. Product/image limits and feature flags are resolved from the shop's persisted subscription and plan.

Plan-gated operations return explicit 403/409 errors rather than silently truncating manual mutations. Confirmed Excel imports may partially succeed within the remaining product capacity and report overflow rows as skipped.

Subscription expiry preserves merchant data. It does not implicitly delete products or change shop status.


## Sprint 6 hardening conventions

JSON APIs using the shared request parser reject bodies larger than 64 KiB with HTTP `413` and code `PAYLOAD_TOO_LARGE`. Large file imports continue through their dedicated multipart/file validation.

Abuse-prone routes may return HTTP `429` with code `RATE_LIMITED`. Rate limiting is intentionally process-local for the initial single-process pilot and must move to shared storage before horizontally scaling the application.

API error responses use `Cache-Control: no-store`.

`GET /api/health` is a readiness check that includes database connectivity. It returns HTTP 503 with a generic unavailable state if the database cannot be reached and never exposes database credentials or raw internal errors.


## Sprint 6 platform-admin contracts

Sprint 6 adds backend contracts required by the platform-admin UI:

- GET/POST `/api/admin/business-categories`
- PATCH `/api/admin/business-categories/{categoryId}`
- GET `/api/admin/shops/{shopId}`
- GET `/api/admin/analytics?from={ISO}&to={ISO}`

Business-category administration supports create/update/activate/deactivate; Phase 1 does not require destructive category deletion. Admin mutations are audited.

Platform analytics accepts the same maximum 366-day range used by merchant analytics and returns aggregate shop/user/product/activity/subscription metrics plus top shops by visits.
