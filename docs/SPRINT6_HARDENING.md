# Sprint 6 Production Hardening

## Stage 1 — Security and rate limiting

Sprint 6 keeps the Phase 1 architecture unchanged while hardening abuse-prone entry points.

### Baseline HTTP hardening

Next.js responses use these baseline headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- production-only HSTS for HTTPS deployments
- the `X-Powered-By` header is disabled

A strict Content Security Policy is intentionally not introduced in this stage because it must be validated against the existing Next.js/PWA runtime before enforcement.

### JSON request size

Shared JSON body parsing rejects payloads above 64 KiB with `413 PAYLOAD_TOO_LARGE`. Current JSON APIs use small structured payloads; Excel uploads continue to use their separate multipart/file-size validation.

### Rate limits

Current process-local limits:

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

Rate-limit violations use the existing API error envelope with HTTP 429 and code `RATE_LIMITED`.

### Client IP handling

The server accepts the first syntactically valid IP from the hosting/proxy headers in this order:
1. `CF-Connecting-IP`
2. `X-Real-IP`
3. `X-Forwarded-For`

Production deployment must ensure the edge/reverse proxy overwrites these headers rather than forwarding arbitrary client-provided values.

### Phase 1 limiter storage

The limiter remains in application memory to avoid adding Redis or another recurring-cost dependency during the small pilot. This is effective for a single application process, but it is not a global distributed limit.

Before scaling to multiple application instances, replace the bucket store with a shared atomic backend such as Redis/KV while preserving the same route-level keys and limits.

## Remaining Sprint 6 work

- authentication/session hardening review
- database/index/performance review
- tenant-isolation regression tests
- staging/production environment review
- backup/recovery documentation
- deployment/release readiness and Golden Flow validation
