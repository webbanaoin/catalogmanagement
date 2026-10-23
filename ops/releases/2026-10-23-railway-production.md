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


## Redeployment retry — 2026-10-23

- Deployment trigger requested again after the prior Railway attempt `1847bfbb` stopped at **Build image** without useful application build logs.
- Trigger source: a documentation-only commit on the GitHub-connected `main` branch; no runtime code or database data is changed by this trigger.
- Desired application source: `63fc1873e8d2aeb6aa665d16e2667dae690e63e4` (official Webbanao Digital Showroom logo, Hero Book Demo CTA, and Powered by webbanao.in footer link).
- Next steps: inspect the fresh Railway Build Logs; record whether the image-build initialization, npm build, migration, and deployment stages succeed before considering production verified.
- The git push requests a build only if the Railway service is still configured to auto-deploy from main. It is not evidence of a successful deployment.
