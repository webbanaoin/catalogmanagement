# Sprint 4 Backend Contracts — Excel Import and Analytics

## Branch
Prashant: `feature/prashant-sprint4-excel-analytics`

## Product import

### Template
`GET /api/shops/{shopId}/imports/products/template`

Returns `catalog-product-import-template.xlsx`.

Required template columns:
- Product Name
- SKU
- Category
- Price
- Price Type
- Discount Price
- Description
- Availability
- Featured
- New Arrival

Accepted values:
- Price Type: Fixed, Starting From, Ask Price
- Availability: In Stock, Out of Stock, On Request
- Featured / New Arrival: Yes/No, True/False, 1/0

Category may contain the active shop category name or slug. When a category name is ambiguous, use its slug.

### Preview
`POST /api/shops/{shopId}/imports/products/preview`

Multipart form field: `file`.

Rules:
- `.xlsx` only
- maximum workbook size: 5 MiB
- maximum data rows per import: 1000
- validates required columns, price rules, active category ownership, existing SKU conflicts, duplicate workbook SKUs, booleans and enums
- does not create products
- creates an import job with `PREVIEW_READY` or `VALIDATION_FAILED`

### Confirm
`POST /api/shops/{shopId}/imports/products/{jobId}/confirm`

Only `PREVIEW_READY` jobs can be confirmed. The backend rechecks SKU and active-category conflicts before an all-or-nothing transaction creates products. Imported products use unique shop-scoped slugs and are visible after successful confirmation.

### Job tracking
- `GET /api/shops/{shopId}/imports/products`
- `GET /api/shops/{shopId}/imports/products/{jobId}`

Import statuses:
- `PREVIEW_READY`
- `VALIDATION_FAILED`
- `COMPLETED`
- `FAILED`

Merchant import mutations require OWNER or MANAGER access to an APPROVED or ACTIVE shop.

## Public analytics event ingestion

`POST /api/public/shops/{shopSlug}/analytics/events`

Body:
```json
{
  "eventType": "CATALOG_VISIT",
  "sessionId": "optional-client-session-id",
  "productSlug": "optional-product-slug",
  "source": "direct",
  "deviceType": "MOBILE"
}
```

Event types:
- `CATALOG_VISIT`
- `PRODUCT_VIEW`
- `WHATSAPP`
- `CALL`
- `DIRECTIONS`
- `SHARE`
- `PWA_INSTALL`

Device types:
- `MOBILE`
- `TABLET`
- `DESKTOP`
- `OTHER`
- `UNKNOWN`

If `sessionId` is omitted, the server returns a generated one. The frontend should persist and reuse it so unique/session-aware visit counts remain meaningful.

`PRODUCT_VIEW` requires `productSlug`. When `productSlug` is provided for any event, the backend verifies that the product belongs to the ACTIVE shop and is publicly visible.

`source` is a bounded string so QR/share integrations can use values such as `qr`, `qr:poster`, `share`, or `direct` without schema changes.

## Merchant analytics summary

`GET /api/shops/{shopId}/analytics?from={ISO_DATE}&to={ISO_DATE}`

Defaults to the latest 30-day window. Maximum query range is 366 days.

Returns:
- catalogue visits
- unique session-aware visits
- QR visits
- product views
- WhatsApp/call/directions/share/PWA-install action totals
- top products by views
- top categories by views
- traffic sources

All merchant analytics reads are shop-scoped through authenticated tenancy checks.
