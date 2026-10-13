# Sprint 5 Backend Contracts — Plans, Subscriptions and Entitlements

## Branch
Prashant: `feature/prashant-sprint5-subscriptions`

## Goals
Sprint 5 makes plan configuration database-driven and enforces subscription entitlements on the server. No payment gateway is introduced.

## Plans

### Public plan list
`GET /api/plans`

Returns ACTIVE plans and their prices, limits and feature flags.

Plan fields:
- name / slug / description
- monthly price / annual price
- product limit
- image limit per product
- analytics enabled
- Excel import enabled
- custom branding enabled
- trial days
- status

### Platform-admin plan management
- `GET /api/admin/plans`
- `POST /api/admin/plans`
- `PATCH /api/admin/plans/{planId}`

Only platform ADMIN users may mutate plans.

A plan may be marked `isDefaultTrial`. The backend keeps a single default-trial plan through admin mutations. A default-trial plan must be ACTIVE and have at least one trial day.

The Sprint 5 migration creates a database-owned `Phase 1 Trial` plan for pilot continuity:
- 30 trial days
- 7 grace days
- up to 1000 non-deleted products
- up to 10 images per product
- analytics enabled
- Excel import/export enabled
- custom branding disabled
- price 0

These are database values, not application constants, and can be changed later by a platform administrator.

## Shop subscriptions

### Merchant subscription summary
`GET /api/shops/{shopId}/subscription`

Requires authenticated membership in the shop. Returns the effective subscription status, stored status, dates, plan entitlements and current product usage.

### Admin subscription controls
- `GET /api/admin/shops/{shopId}/subscription`
- `POST /api/admin/shops/{shopId}/subscription`
- `PATCH /api/admin/shops/{shopId}/subscription`

POST assigns a subscription when a shop does not already have one.

PATCH supports:
- changing the assigned plan
- extending the end date by a number of days
- changing stored status
- changing payment status
- changing grace days

No payment transaction is performed. `paymentStatus` is administrative tracking only in Phase 1.

## Trial provisioning
When a shop transitions to APPROVED or ACTIVE and has no subscription, the backend creates a trial from the ACTIVE default-trial plan.

The migration also backfills APPROVED, ACTIVE and SUSPENDED shops with the pilot trial so Sprint 5 entitlement checks do not strand existing pilot data.

## Effective lifecycle
Stored subscription statuses:
- `TRIAL`
- `ACTIVE`
- `GRACE`
- `EXPIRED`
- `CANCELLED`

Payment statuses:
- `NOT_REQUIRED`
- `PENDING`
- `PAID`
- `WAIVED`

Effective access is date-aware:
- before `endDate`: TRIAL or ACTIVE
- after `endDate` and before/equal `graceEndsAt`: GRACE
- after grace: EXPIRED
- manually CANCELLED / EXPIRED: immediately unavailable for gated actions

Trial expiry never deletes products, images or merchant records.

## Backend enforcement

### Product limit
The plan product limit counts non-deleted products.

Enforced on:
- manual product create
- product duplicate
- restoring a soft-deleted product
- confirmed Excel import

Excel confirmation imports only rows that fit the remaining plan capacity and skips overflow rows with `PRODUCT_LIMIT_REACHED`.

### Image limit
The per-product image limit is enforced:
- before issuing a presigned upload URL
- again before registering image metadata

### Feature flags
Analytics:
- `GET /api/shops/{shopId}/analytics` requires `analyticsEnabled`.

Excel:
- template download
- preview
- confirmed import
- current catalogue export

require `excelImportEnabled`.

Custom-branding entitlement is exposed in subscription/plan responses for a later UI/branding workflow; there is no new custom-branding mutation in this Sprint.

## Expiry behavior
Subscription expiry does not delete data and does not automatically change `shops.status`. Existing catalogue reads and public storefront behavior remain separate from subscription state. Capacity-increasing and plan-gated actions return explicit subscription/limit errors until an admin extends or reactivates the subscription.

Typical error codes:
- `SUBSCRIPTION_REQUIRED`
- `SUBSCRIPTION_EXPIRED`
- `FEATURE_NOT_INCLUDED`
- `PRODUCT_LIMIT_REACHED`
- `IMAGE_LIMIT_REACHED`
