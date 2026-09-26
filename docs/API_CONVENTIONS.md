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
