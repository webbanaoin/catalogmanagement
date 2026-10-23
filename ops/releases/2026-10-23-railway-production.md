# Railway production deployment request — 2026-10-23

Source branch: `main`
Application source commit: `ea8d1f7823f094a3f0e6ba93a0028803a84d38b6`
Release intent: Rebuild and deploy latest DigiShowroom on Railway production after Railway issue resolution.

Included feature: opt-in category/subcategory representative images for products without actual photos (PR #100). Existing products remain unchanged until a category default is enabled.

Deployment configuration checks:
- Railway service source: GitHub `webbanaoin/catalogmanagement`, branch `main` (confirm in Railway UI).
- Pre-deploy command: `npm run db:migrate:deploy`.
- Required migration: `20261022190000_category_image_product_defaults`.
- Build uses repository `npm run build` (generates Prisma client and runs Next.js build).
- Confirm migration, deployment readiness and live `/api/health` after Railway publishes the new deployment.
- Verify existing registration, storefront/category list and the new "Visible as Default" feature.

This non-runtime release record is a GitHub commit to request a new build from the GitHub-connected Railway production service. It does not claim deployment success.
