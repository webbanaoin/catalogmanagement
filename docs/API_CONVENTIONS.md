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
