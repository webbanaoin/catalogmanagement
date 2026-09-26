# Catalog Management — Agent Instructions

## Product
Multi-tenant Digital Showroom SaaS for local retailers. Phase 1 lets a merchant create a branded catalogue, publish a permanent shop URL/QR, manage products, and receive customer enquiries. Customers browse without login.

## Phase 1 architecture
- Next.js + React + TypeScript
- Tailwind CSS
- MySQL + Prisma
- Hostinger for application and MySQL initially
- AWS S3 for all merchant/product media
- PWA support
- One application and database for all shops

## Mandatory engineering rules
1. Every shop-owned record must be tenant scoped. Never trust a client supplied shop_id without server-side authorization.
2. Use users + shops + shop_users so users can support multiple shops/roles later.
3. Never hard-code tenant IDs, URLs, credentials, plans, categories, or secrets.
4. Product/category design must stay generic across jewellery, clothing, toys, furniture, footwear and future categories.
5. Category-specific product data belongs in flexible attributes, not category-specific product columns.
6. Product images belong in product_images, not image1/image2/image3 fields.
7. Store S3 object/storage keys in DB; do not couple business data to a fixed public S3 URL.
8. Browser uploads must use authorized presigned S3 uploads. Never expose AWS credentials to the frontend.
9. Use migrations for schema changes. Do not make undocumented manual production DB changes.
10. Use validation, secure authentication, rate limiting where appropriate, soft deletion for recoverable business data, and clear error handling.
11. Keep public storefront mobile-first, fast and SEO-friendly.
12. Do not add cart, checkout, delivery, customer accounts or marketplace/cross-shop search to Phase 1 unless requirements are explicitly changed.
13. Do not modify unrelated modules while implementing a task.
14. Before coding a substantial feature, inspect existing code/docs and state affected files/schema/API contracts.
15. Run lint, tests and build relevant to the change before considering it complete.

## Git workflow
- main: production
- staging: integration/testing
- feature/<developer>-<feature>: normal development
- fix/<developer>-<bug>: fixes
- hotfix/<issue>: urgent production fixes
Feature branches start from latest staging and merge by PR into staging. Stable staging is promoted to main by PR. Prefer squash merges for feature PRs.

## Commit convention
Use feat:, fix:, refactor:, docs:, test:, chore:.

## Source of truth
Read docs/PRODUCT_REQUIREMENTS.md, docs/ARCHITECTURE.md, docs/DATABASE_SCHEMA.md, docs/API_CONVENTIONS.md, and docs/CODING_STANDARDS.md before major implementation. If code and docs conflict, call out the conflict rather than silently inventing a new architecture.
