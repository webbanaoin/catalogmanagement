# Gift, Toys & Stationery — staging acceptance tests

Scope: PR #80, based on staging. Do not merge into main until all checks pass.

## Before staging deploy
1. Create a fresh staging database snapshot/backup.
2. Review/apply migration `20261016143000_admin_business_category_defaults` using `npx prisma migrate deploy` after CI succeeds.
3. Confirm that `business_categories.id = bc_toys_gifts` is still the same record and `slug = toys-gifts`. The display name should read **Gift, Toys & Stationery**.
4. Confirm the existing Jewellery shop and all its products, images, prices and product categories remain unchanged.

## Admin
1. Sign in as a platform administrator, then open **Admin > Business categories**.
2. Expand **Gift, Toys & Stationery > Manage subcategories**. Confirm **Soft Toys**, **Gifts** types, **Stationery**, **Notebooks & Registers**, **Pens & Pencils**, **School Supplies**, **Office Stationery**, **Files & Folders**, **Art & Craft Supplies** and other defaults.
3. Add `Educational Stationery Kits` and confirm it appears after refresh.
4. Attempt the same name with changed capitalization; a conflict should be returned.
5. Edit display order, change name and deactivate an existing default. No merchant products/categories may be deleted or renamed automatically.
6. Open **Manage storefront defaults** and upload a category image for the new default. It must work with Cloudflare R2. Confirm it is used in new merchants' category cards unless overridden by that merchant.
7. Try a non-admin account against `/api/admin/business-categories/{id}/defaults`; the API must reject it (401/403).

## Merchant (isolated staging accounts)
1. Register and approve a new Gift, Toys & Stationery merchant. The recommended categories should be automatically available.
2. Add products under Stationery and Soft Toys. Set Department = Stationery and verify optional Class / Grade field.
3. Check the generated catalog and mobile category pages, image fallbacks, WhatsApp price enquiry and product search.
4. Create a second merchant in the same business type, then add another default from admin. Open each merchant category management page; the new default should be merged without altering merchant-created categories.
5. Delete an unused default category in merchant A. Reopen the categories page; it should **not** be re-created.
6. Deactivate a category in admin; it should be absent from newly initialized shops, but existing merchant products/categories remain untouched.
7. Test Excel template/export/import using Stationery department and new default categories.
8. Verify Jewellery stores have no stationery categories or new Gift/Toys groups.

## Automated checks
GitHub Actions workflow `Sprint 6 Integration` should run Prisma validation/generation, migrations, lint, typecheck, build, tenant/security smoke tests and `npm run test:catalog:defaults`.

## Behavior / limitations
- Admin default category changes propagate as **new additions** when a shop's category list/import workflow is opened. They do not forcibly rename/reorder/remove already owned merchant categories.
- Existing categories are independent and tenant scoped. Disabling a global default stops future seeding only.
- The business slug remains `toys-gifts` to preserve references and category media. It does not need to match the new display name.
- Do not run test scripts on production. Regression tests create disposable data and require `SPRINT6_TEST_CONFIRM=YES`.

## Rollback
If staging validation fails, roll back the staging application commit. Migration is additive and should not be reversed on a populated database without a tested restore plan; take and retain the staging snapshot. Do not manually delete generated merchant categories or media.
