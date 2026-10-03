# Team Tasks — Phase 1

## Purpose
This file is the shared execution plan for Prashant and Parixit. It complements AGENTS.md and the documents under docs/. Before starting a task, read the relevant product, architecture, database, API, coding and branching documents.

## Branch model
- Production: `main`
- Integration/testing: `staging`
- Prashant current branch: `feature/prashant-sprint4-excel-analytics`
- Parixit current branch: `feature/parixit-sprint4-qr-sharing`

Feature branches always start from latest `staging`. Normal flow:
feature branch -> PR -> staging -> integration testing -> PR -> main.

Do not directly develop on `main`. Avoid direct commits to `staging`.

## Collaboration rules
- Prashant and Parixit review each other's PRs.
- Prefer feature ownership end-to-end rather than permanent frontend/backend silos.
- Agree on API contracts before one developer builds UI against another developer's API.
- Coordinate before editing high-conflict files such as `package.json`, `prisma/schema.prisma`, auth/middleware configuration, global CSS, Next configuration and shared layout files.
- Never commit secrets or production environment files.
- Every shop-owned operation must preserve server-side tenant isolation.
- A task is not done until relevant lint/tests/build pass and docs/contracts are updated when needed.

## Sprint 0 — Foundation

### Prashant
Branch: `feature/prashant-project-foundation`

Own:
- Initialize Next.js + React + TypeScript application.
- Establish application/project folder structure.
- Configure Prisma and MySQL foundation.
- Create safe environment configuration based on `.env.example`.
- Establish validation/error-handling foundation.
- Establish AWS S3 storage service abstraction and presigned-upload foundation without exposing AWS credentials.
- Add baseline lint/build/test tooling.
- Preserve architecture defined in project docs.

Do not implement full business features in this sprint.

### Parixit
Branch: `feature/parixit-ui-foundation`

Own:
- Tailwind/UI foundation.
- Responsive design system and reusable UI primitives.
- Public storefront shell.
- Merchant dashboard shell/navigation.
- Common loading, empty, error and basic feedback states.
- Mobile-first layouts.
- Accessible reusable controls/components.

Do not invent backend contracts or hard-code fake architecture into reusable components.

### Sprint 0 integration gate
Before merging to staging:
- Application builds.
- Shared layout does not conflict with backend/project structure.
- Environment/secrets are safe.
- Both developers review integration-impacting changes.

## Sprint 1 — Authentication, Tenancy and Onboarding

### Prashant
Planned branch: `feature/prashant-auth-tenancy`

Own:
- User authentication foundation.
- Secure password hashing/session strategy.
- Forgot-password architecture.
- `users`, `shops`, `shop_users` implementation.
- Server-side authorization and tenant isolation.
- Shop registration lifecycle: pending -> approved -> active.
- Admin approval backend/API foundation.
- Tests proving one shop cannot access another shop's protected data.

### Parixit
Planned branch: `feature/parixit-shop-onboarding`

Own:
- Registration UI.
- Login/forgot-password UI.
- Pending-approval state.
- Shop setup/onboarding wizard.
- Shop information/contact/location/hours/category/first-product setup screens as contracts become available.
- Mobile-first validation and UX states.

## Sprint 2 — Catalogue Core

### Prashant
Branch: `feature/prashant-sprint2-catalog-core`

Own:
- Business categories.
- Shop categories.
- Products.
- Product images metadata.
- Flexible product attributes.
- Shop hours where not already completed.
- Tenant-safe CRUD/service/API contracts.
- Visibility/availability/price-type rules.
- Soft-delete behavior and indexes.

### Parixit
Branch: `feature/parixit-shop-management`

Own:
- Shop profile management UI.
- Category management UI.
- Supporting merchant forms/screens based on frozen APIs.
- Mobile-first merchant management experience.

## Sprint 3 — Product Management, S3 and Storefront

### Prashant
Branch: `feature/prashant-sprint3-product-media`

Own:
- Merchant product management workflow.
- Add/edit/hide/show/delete/restore/duplicate as finalized.
- Multiple-image metadata flow.
- Authorized presigned S3 upload flow.
- MIME/size/ownership validation.
- Image ordering/primary-image behavior.
- Product search/filter in merchant context.

### Parixit
Branch: `feature/parixit-sprint3-product-ui`

Own:
- Public `/s/{shopSlug}` storefront.
- Category browsing.
- Within-shop product search/filter.
- Product cards.
- `/s/{shopSlug}/p/{productSlug}` detail.
- Gallery, price modes, availability and flexible attributes.
- WhatsApp/call/directions/share presentation.
- Mobile performance and SEO-friendly rendering.

## Sprint 4 — Excel, Analytics, QR and Sharing

### Prashant
Branch: `feature/prashant-sprint4-excel-analytics`

Own:
- Excel template/import pipeline.
- Validation, preview and confirmed import.
- Import job tracking.
- Catalogue visits/product views/customer action event model.
- Analytics aggregation/query APIs.

### Parixit
Branch: `feature/parixit-sprint4-qr-sharing`

Own:
- Permanent shop QR experience.
- QR download/share UI.
- QR source tracking integration.
- Printable/basic QR presentation where included.
- Product/shop sharing UX.
- WhatsApp prefilled enquiry UX.

## Sprint 5 — Plans, Merchant Analytics and PWA

### Prashant
Planned branch: `feature/prashant-subscriptions`

Own:
- Database-driven plans.
- Subscriptions/trial/grace-state architecture.
- Backend product/image/feature limit enforcement.
- Admin controls needed to change/extend subscription.
- No payment gateway unless scope is explicitly changed.

### Parixit
Planned branch: `feature/parixit-dashboard-pwa`

Own:
- Merchant analytics dashboard.
- Catalogue/product/action metrics UI.
- PWA manifest/installability and home-screen experience.
- Customer shop home-screen experience.
- Merchant dashboard home-screen experience.

## Sprint 6 — Admin, Hardening and Release

### Prashant
Planned branch: `feature/prashant-production-hardening`

Own:
- Security review and hardening.
- Rate limiting on abuse-prone endpoints.
- Production/staging configuration review.
- Backup/recovery strategy documentation.
- Database/index/performance review.
- Deployment readiness.
- Tenant-isolation regression tests.

### Parixit
Planned branch: `feature/parixit-admin-polish`

Own:
- Platform admin UI.
- Pending/active/suspended shop screens.
- Business category/plan management screens against available APIs.
- Platform analytics presentation.
- Responsive/accessibility polish.
- Public storefront performance/SEO/UI polish.

## Golden Flow — Joint ownership
Both developers must jointly validate:

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

A release should not be promoted from staging to main until the agreed Golden Flow and release checks pass.

## Phase 1 boundaries
Do not add these unless requirements are explicitly updated:
- Cart/checkout
- Payment gateway
- Delivery/order management
- Customer accounts
- Reviews/ratings
- City marketplace
- Cross-shop search
- POS/inventory ERP
- Native mobile app
- Paid WhatsApp API
- Loyalty/CRM

## Current status
- [x] Repository access established
- [x] `main` production baseline exists
- [x] `staging` integration branch created
- [x] Project source-of-truth documentation added to `staging`
- [x] Sprint 0 implementation completed and integrated
- [x] Sprint 0 validated locally (install, lint, typecheck, Prisma validate/generate, production build and runtime checks)
- [x] Sprint 1 branches created from validated `staging`
- [x] Prashant Sprint 1 auth/tenancy backend implementation complete and locally validated
- [x] Prashant Sprint 1 atomic registration, approval-aware login and tenant-isolation checks complete
- [x] Platform ADMIN approval backend/API locally verified
- [x] Forgot/reset-password foundation locally verified
- [x] Parixit Sprint 1 UI merged to `staging`: registration, login, forgot-password, pending-approval and onboarding presentation flow
- [x] Sprint 1 backend and UI combined on `integration/sprint1-auth-ui`
- [x] Combined Sprint 1 integration validation: install, Prisma migrate/generate/validate, lint, typecheck and production build
- [x] Combined Sprint 1 browser Golden Flow validation
- [x] Merge validated Sprint 1 integration into `staging`\n- [x] Sprint 2 Prashant catalogue-core implementation prepared on feature branch\n- [x] Sprint 2 Parixit shop-management UI prepared on feature branch\n- [x] Sprint 2 local migration, lint, typecheck, build and API/security validation\n- [x] Sprint 2 branch integration and browser validation\n- [x] Merge validated Sprint 2 integration into `staging`\n- [x] Sprint 3 branches created from latest `staging`\n- [x] Prashant Sprint 3 product/media backend implementation prepared for local validation\n- [x] Prashant Sprint 3 local lint, typecheck, build and API/media validation\n- [x] Sprint 3 UI/backend integration and browser validation\n- [x] Merge validated Sprint 3 integration into `staging`\n- [x] Sprint 4 feature branches created from latest `staging`\n- [ ] Prashant Sprint 4 Excel/import/analytics implementation and local validation\n- [ ] Sprint 4 QR/sharing integration and browser validation\n- [ ] Merge validated Sprint 4 integration into `staging`

## How ChatGPT/Codex should use this file
At the beginning of a new development conversation, first read `AGENTS.md`, this file, and the relevant docs from `staging`. Confirm the developer's assigned branch and current task before proposing implementation. Do not rely on old chat history when repository documentation contains a newer decision.
