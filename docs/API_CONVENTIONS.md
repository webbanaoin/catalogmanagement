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

## Mutations
Validate payloads. Return clear conflict/not-found/forbidden responses. Soft-delete where defined by the data model.

## Media
Backend authorizes upload intent and generates presigned S3 operations. Validate ownership, allowed MIME types, size and destination key. Frontend never receives AWS secret credentials.

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
