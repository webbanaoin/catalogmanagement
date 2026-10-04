# Sprint 6 Production Hardening

## Scope

Sprint 6 prepares the Phase 1 Digital Showroom SaaS for staging release and the initial pilot while preserving the existing architecture and avoiding new recurring infrastructure costs.

## Security hardening implemented

### HTTP and browser protections

Application responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- production-only HSTS
- disabled `X-Powered-By`

A strict CSP is intentionally deferred until it can be validated against the production Next.js/PWA runtime and any final analytics/media origins.

### JSON payload limits

Shared JSON parsing rejects payloads over 64 KiB with:
- HTTP `413`
- code `PAYLOAD_TOO_LARGE`

Excel import keeps its separate multipart and 5 MiB workbook validation.

### Rate limiting

Process-local limits are applied to abuse-prone endpoints:

| Surface | Limit |
| --- | --- |
| Login by client IP | 20 / 15 minutes |
| Login by normalized account email | 10 / 15 minutes |
| Registration by client IP | 10 / 15 minutes |
| Forgot password by client IP | 5 / 15 minutes |
| Forgot password by normalized account email | 5 / 15 minutes |
| Reset password by client IP | 10 / 15 minutes |
| Public analytics events by shop + client IP | 120 / minute |
| Presigned product-image upload URLs by shop + authenticated user | 60 / 15 minutes |
| Excel preview by shop + authenticated user | 10 / 15 minutes |
| Excel confirm by shop + authenticated user | 20 / 15 minutes |

Rate-limit violations return HTTP `429` with code `RATE_LIMITED`.

The limiter remains process-local for the initial single-process Hostinger pilot. Before multiple app instances are introduced, move the same logical keys/limits to a shared atomic backend such as Redis/KV.

### Client IP handling

The server chooses the first syntactically valid address from:
1. `CF-Connecting-IP`
2. `X-Real-IP`
3. `X-Forwarded-For`

The production edge/reverse proxy must overwrite these headers and must not pass arbitrary client-supplied forwarding headers unchanged.

### Session revocation

Users now have a persisted `session_version`. Session JWTs carry that version.

Existing pre-Sprint-6 sessions are treated as version 0 so the deployment does not force an immediate logout for every pilot user. Password reset atomically increments the user's persisted version, invalidating all older sessions on their next authenticated request.

Inactive users continue to be rejected even if a JWT is otherwise valid.

### Password-reset hygiene

Reset tokens are:
- cryptographically random
- stored only as SHA-256 hashes
- single-use
- 30-minute expiry
- invalidated when a newer reset token is issued

`npm run security:cleanup-reset-tokens` removes expired reset tokens and old used tokens. Schedule it daily or weekly in production.

### Admin audit trail

Sprint 6 adds `audit_logs` for high-impact platform administration:
- shop status changes
- plan creation
- plan changes
- subscription assignment
- subscription changes

Audit writes are part of the same database transaction as the administrative mutation whenever possible.

### Error caching

API error responses use `Cache-Control: no-store` so authentication, authorization and validation failures are not cached by intermediaries.

## Database and performance hardening

The Sprint 6 migration adds:
- `users.session_version`
- composite `shops(status, created_at)` index for admin queues
- composite password-reset lookup/cleanup index
- indexed `audit_logs`

Existing tenant/catalogue/analytics indexes were reviewed. The current indexes are appropriate for the small Phase 1 pilot. Product free-text `contains` search remains a MySQL scan within one tenant; full-text/external search is deferred until scale requires it.

The analytics API already caps query ranges to 366 days. No destructive analytics-retention policy is introduced in Sprint 6.

## Tenant isolation review

Protected merchant routes were reviewed for:
- mandatory authenticated shop membership
- OWNER/MANAGER checks on mutations
- APPROVED/ACTIVE shop-state checks where required
- child resource lookup scoped through shop/product/category ownership
- import jobs scoped by both `jobId` and `shopId`
- subscription and analytics reads scoped to the authorized shop

Functional cross-tenant regression testing remains a release gate and is documented in `docs/SPRINT6_TEST_PLAN.md`.

## Health/readiness

`GET /api/health` now verifies database connectivity.

Healthy:
- HTTP 200
- application status `ok`
- database status `ok`

Database unavailable:
- HTTP 503
- generic unavailable status
- no database credentials or internal error details returned

## Production environment hardening

Production application configuration rejects:
- non-HTTPS `APP_URL`
- known example placeholders for `AUTH_SECRET`

Use a unique high-entropy `AUTH_SECRET` per environment and never reuse staging credentials in production.

## Release commands

Development/integration validation:

`npm run release:check`

Production migration:

`npm run db:migrate:deploy`

Post-start smoke validation:

`npm run test:sprint6:smoke`

For another target:

`set BASE_URL=https://your-domain.example && npm run test:sprint6:smoke`

## Known Phase 1 operational limits

- Rate limiting is process-local and is intended for the initial single-process pilot.
- Plan capacity checks are application-level. Very high concurrent writes are outside the pilot load profile; re-evaluate with distributed traffic.
- Public analytics are deliberately anonymous and do not require customer accounts.
- No payment gateway is included.
- No automatic destructive analytics retention is enabled.
- CSP enforcement is deferred until final deployment origins are frozen.
