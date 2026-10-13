# Coding Standards

## TypeScript
Use strict TypeScript. Avoid any unless there is a documented integration reason. Define shared domain/API types where they prevent drift.

## Structure
Keep UI, domain/service logic, persistence and external integrations reasonably separated. Do not place authorization or business rules only in React components.

## Validation and errors
Validate all external input on the server. Use consistent application errors and API response conventions.

## Database
Use Prisma and migrations. Avoid raw SQL unless justified. Tenant-scoped queries must include authorized tenant boundaries. Use transactions for multi-step writes that must be atomic.

## Security
Hash passwords with a proven password hashing library. Use secure session/token handling, HTTPS, environment variables, safe cookies where applicable, rate limits on abuse-prone endpoints, upload validation and least-privilege AWS credentials.

## UI
Mobile-first. Reusable components. Accessible labels and controls. Provide loading, empty, success and error states. Avoid unnecessary client-side JavaScript on public SEO pages.

## Images
Optimize catalogue images, create/use thumbnails where appropriate, preserve aspect ratio, lazy-load non-critical media, and use S3 storage keys in persistent data.

## Testing
Prioritize tests for tenant isolation, authentication/authorization, plan limits, catalogue visibility and critical API validation. Each feature owner tests their feature; integration testing covers the Golden Flow.

## Golden Flow
Register -> Admin Approval -> Login -> Shop Profile -> Category -> Product -> S3 Image -> QR -> Public Store -> Product -> WhatsApp action -> Analytics event.

## Definition of done
Code is formatted/linted, relevant tests pass, build passes, migrations are included when required, API/docs are updated when contracts change, security/tenant boundaries are reviewed, and unrelated behavior is not regressed.
