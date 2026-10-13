# Sprint 6 Validation Plan

Run this after the complete Sprint 6 implementation is pulled locally. For the full persona-by-persona manual checklist, local prerequisites, test data setup and release sign-off, use `docs/END_TO_END_TESTING.md`.

## 1. Static/build gate

- `npx prisma migrate status`
- `npm run release:check`

Expected:
- Prisma schema valid
- Prisma client generates
- lint passes
- TypeScript passes
- production build passes

## 2. Migration

Local/staging integration database:
- apply the Sprint 6 migration
- confirm `session_version` exists on users
- confirm `audit_logs` exists
- confirm migration status is clean

Use development migration commands only on the local development database. Production uses `npm run db:migrate:deploy`.

## 3. Health and security headers

Start the app and run:
- `npm run test:sprint6:smoke`

For automated security and tenant regression tests on a disposable/local test database:
- `set SPRINT6_TEST_CONFIRM=YES && npm run test:sprint6:security`
- `set SPRINT6_TEST_CONFIRM=YES && npm run test:sprint6:tenant`

Verify:
- `/api/health` = 200 with database `ok`
- security headers are present
- `X-Powered-By` is absent
- public plans endpoint remains available

## 4. Authentication regression

Verify:
- valid merchant login succeeds
- invalid password returns 401
- pending shop behavior remains unchanged
- forgot-password response remains enumeration-safe
- valid reset token changes password
- old password stops working
- a session created before the password reset becomes unauthorized after reset
- new login after reset succeeds

## 5. Rate limits

Use a disposable/local test context.

Verify HTTP 429 `RATE_LIMITED` for:
- repeated login attempts
- repeated forgot-password attempts
- public analytics burst above configured limit

Do not intentionally exhaust limits on a real production merchant account.

## 6. JSON body-size protection

Send a JSON payload over 64 KiB to a JSON endpoint.

Expected:
- HTTP 413
- `PAYLOAD_TOO_LARGE`
- application remains responsive

## 7. Tenant-isolation regression

Use two independent test shops A and B.

While authenticated as Shop A, attempts using Shop B IDs must fail for:
- profile
- categories
- products
- product detail/update/delete/restore/duplicate
- image metadata/upload URL/update/delete
- imports and import-job detail/confirm
- analytics
- subscription summary

Expected:
- 403 or tenant-safe 404 depending on endpoint
- no Shop B data in successful responses
- no Shop B mutation

## 8. Role authorization

Verify STAFF cannot perform OWNER/MANAGER-only catalogue mutations.

Verify normal merchant users cannot access:
- admin shop queues
- admin shop status mutation
- admin plans
- admin subscription controls

Expected: 403.

## 9. Public-storefront visibility

Verify public pages expose only:
- ACTIVE shop
- ACTIVE categories
- visible, non-deleted products

Verify suspended/non-active shop and hidden/deleted products do not become publicly accessible.

## 10. Admin audit logging

Perform one safe test mutation in a disposable/staging context:
- shop status change, plan update, or subscription update

Verify corresponding `audit_logs` row contains:
- actor user
- entity
- shop when applicable
- action
- timestamp
- expected change metadata

## 11. Existing feature regression

Verify:
- merchant dashboard
- analytics dashboard
- Excel preview/import/export
- product image flow
- shop logo upload/replace/remove through Cloudflare R2
- shop hero/cover upload/replace/remove through Cloudflare R2
- public storefront renders uploaded logo and cover correctly
- merchant PWA install
- storefront PWA install
- QR open/source tracking
- WhatsApp/call/directions/share actions
- shop-level product price visibility default
- per-product price visibility override
- hidden prices are not exposed publicly
- hidden-price product uses Request Price WhatsApp flow
- request-price message adapts to IN_STOCK, OUT_OF_STOCK and ON_REQUEST availability

## 12. Golden Flow

Register
-> Admin Approval
-> Login
-> Shop Profile
-> Category
-> Product
-> S3 Image
-> Permanent QR
-> Scan/Open Public Store
-> Browse/Search
-> Product Detail
-> WhatsApp/Call/Directions/Share
-> Analytics Event

Only after this passes should Sprint 6 be promoted from staging to production/main. Sprint 6 is already integrated into staging; staging remains the validation environment until the full checklist is signed off.
