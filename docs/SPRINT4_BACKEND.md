# Sprint 4 Backend Contracts — Excel Import and Analytics

## Branch
Prashant: `feature/prashant-sprint4-excel-analytics`

## Product import

### Template
`GET /api/shops/{shopId}/imports/products/template`

Returns `catalog-product-import-template.xlsx`.

Required template columns:
- Product Name
- SKU / Product Code (Optional)
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
- Product Code is optional; when blank the backend generates a stable `PRD-XXXXXXXX` code during confirmed import
- validates required columns, price rules, active category ownership, existing product-code conflicts, likely duplicate products, booleans and enums
- duplicate detection uses an existing Product Code when supplied, otherwise a normalized product fingerprint (name + category + price mode/pricing)
- preview does not create products
- if at least one row is importable the job is `PREVIEW_READY`; duplicate/invalid rows can coexist and are skipped
- `VALIDATION_FAILED` is used only when no row is ready to import

### Confirm
`POST /api/shops/{shopId}/imports/products/{jobId}/confirm`

Only `PREVIEW_READY` jobs can be confirmed. The backend rechecks product-code, duplicate-product and active-category conflicts. Ready rows are imported; duplicate/invalid rows are skipped instead of blocking the whole workbook. Imported products receive a generated Product Code when the Excel value is blank, use unique shop-scoped slugs, and are visible after successful confirmation.

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


### Catalogue export
`GET /api/shops/{shopId}/exports/products`

Downloads the shop's current non-deleted catalogue in the same Excel shape used for import. Saved/generated Product Codes are included so the merchant can keep a reusable editable catalogue without maintaining codes manually.

### Product-code usability
Product Codes are system-managed by default:
- manual product creation generates a code when the merchant leaves it blank;
- Excel import generates a code for every ready row with a blank Product Code;
- duplicated products receive a generated code when none is supplied;
- legacy products are backfilled with stable `PRD-*` codes by migration;
- edits do not clear an existing Product Code when the field is left blank.
