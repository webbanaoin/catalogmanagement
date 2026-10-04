# End-to-End Full System Testing Guide

## Purpose

This document is the shared manual and automated validation checklist for Prashant and Parixit before promoting `staging` to `main` / production.

It covers the complete Phase 1 system from four viewpoints:

- **Registered user/account** — authentication, password reset, session and role behaviour.
- **Shop owner / merchant** — profile, catalogue, products, images, Excel, QR, analytics and subscription.
- **Customer** — public storefront browsing and enquiry actions without login.
- **Platform admin** — shop lifecycle, plans, subscriptions, business categories and platform analytics.

The test environment should be disposable/local or staging. Do not run destructive security/rate-limit tests against production.

---

# 1. Local Testing Prerequisites

## 1.1 Required software

Recommended local setup:

- Windows 10/11
- Git
- Node.js **20.19.x or compatible Node 20 LTS**
- npm
- MySQL 8.x
- a browser such as Chrome or Edge
- optional mobile phone for QR/PWA/mobile verification
- Cloudflare R2 bucket and S3-compatible credentials for real image-upload testing

Confirm tools:

```bat
git --version
node --version
npm --version
mysql --version
```

## 1.2 Repository setup

Use latest staging:

```bat
cd /d D:\Projects\CatalogManagement\catalogmanagement
git switch staging
git pull origin staging
git status
```

Expected: working tree clean before testing.

Install exact lockfile dependencies:

```bat
npm ci
```

If Windows reports an `EPERM unlink` error for a native Node module, stop all Node/Next processes first:

```bat
taskkill /F /IM node.exe
rmdir /s /q node_modules
npm ci
```

Do **not** delete `package-lock.json` just to bypass an install issue.

## 1.3 Local environment variables

Create/use the local `.env` file. Never commit real secrets.

Required application/database values:

```env
DATABASE_URL=mysql://<user>:<password>@localhost:3306/catalog_management_dev
SHADOW_DATABASE_URL=mysql://<user>:<password>@localhost:3306/catalog_management_shadow
APP_URL=http://localhost:3000
AUTH_SECRET=<at-least-32-character-random-secret>
```

Cloudflare R2 uses the project's S3-compatible environment names:

```env
AWS_REGION=auto
AWS_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_S3_BUCKET=<BUCKET_NAME>
AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
MEDIA_BASE_URL=
```

`MEDIA_BASE_URL` may be blank when signed media URLs are used.

## 1.4 Cloudflare R2 CORS

For browser uploads from local development, allow the local app origin.

Example:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Before production, add the real HTTPS production origin as an allowed origin.

## 1.5 Database and Prisma preparation

Run:

```bat
npm run prisma:validate
npm run prisma:generate
npm run db:migrate:deploy
npx prisma migrate status
```

Expected:

- Prisma schema valid.
- Prisma Client generated.
- all repository migrations applied.
- database schema up to date.

Current price-visibility migration adds:

- `shops.show_product_prices` — default `true`
- `products.show_price` — nullable per-product override

Existing product prices must remain stored after this migration.

## 1.6 Static/build gate

Run before manual testing:

```bat
npm run lint
npm run typecheck
npm run build
```

Expected: all pass.

Note: Next.js may update generated TypeScript include paths in `tsconfig.json`. If that is the only unintended local diff, restore it before final sign-off.

## 1.7 Start local application

Terminal 1:

```bat
npm run dev
```

Application:

```text
http://localhost:3000
```

Keep this terminal running while browser/runtime tests are executed.

---

# 2. Automated Regression Gate

Open Terminal 2:

```bat
cd /d D:\Projects\CatalogManagement\catalogmanagement
set BASE_URL=http://localhost:3000
npm run test:sprint6:smoke
```

Expected:

```text
Sprint 6 smoke checks passed for http://localhost:3000.
```

Then:

```bat
set SPRINT6_TEST_CONFIRM=YES
npm run test:sprint6:security
npm run test:sprint6:tenant
```

Expected security result:

```text
Sprint 6 payload-size and rate-limit regression checks passed.
```

Expected tenant result:

```text
Sprint 6 tenant, role, storefront, session and admin-audit regression checks passed.
```

These tests include destructive/temporary test activity and should be used only against an appropriate local/disposable environment.

---

# 3. Test Data Strategy

Use clearly identifiable test data.

Suggested shops:

- `E2E Shop A`
- `E2E Shop B`

Suggested product categories:

- `Premium Gold Rings`
- `Gifts`

Suggested products:

- fixed-price in-stock product
- discounted product
- starting-from product
- ask-price product
- out-of-stock product
- on-request product
- hidden product
- product with price hidden by individual override

Keep Shop A and Shop B independent so cross-tenant checks can be performed safely.

For platform-admin testing, an existing registered account can be granted admin locally:

```bat
npm run admin:grant -- <admin-email>
```

Never grant production admin access merely for a test.

---

# 4. Registered User / Authentication Testing

## AUTH-01 Registration

Create a new merchant/user from the registration UI.

Verify:

- valid form submits successfully;
- duplicate email is handled safely;
- password policy/validation works;
- user and shop are created atomically;
- newly created shop is `PENDING`;
- user is sent to the correct pending/onboarding state.

## AUTH-02 Pending account behaviour

Before admin approval:

- login/merchant workflow must not expose an active merchant dashboard;
- pending status must be clear;
- protected merchant APIs must not allow active-shop operations.

## AUTH-03 Invalid login

Test:

- unknown email;
- wrong password;
- malformed request.

Expected:

- no sensitive account-enumeration details;
- invalid credentials return appropriate 401 behaviour.

## AUTH-04 Approved login

After admin approval/activation:

- login succeeds;
- merchant dashboard opens;
- authenticated shop context is correct.

## AUTH-05 Logout

Verify:

- logout ends authenticated access;
- protected route/API access requires login again.

## AUTH-06 Forgot password

Submit a registered email.

Verify:

- response is enumeration-safe;
- development/local reset flow produces a valid reset path/token according to current environment behaviour.

Also submit a non-existent email and confirm the response does not reveal whether the account exists.

## AUTH-07 Reset password and session revocation

Verify:

- invalid/expired token fails;
- valid reset succeeds;
- old password no longer works;
- previous authenticated session becomes invalid;
- login with new password succeeds.

---

# 5. Platform Admin Testing

## ADMIN-01 Admin access control

Login as platform admin.

Verify:

- `/admin` loads;
- normal merchant account cannot access admin pages/APIs.

## ADMIN-02 Shop queue and filters

Verify pending/active/suspended/rejected views and filters.

For each shop card confirm:

- shop identity;
- lifecycle status;
- current subscription plan;
- effective subscription status;
- payment status;
- validity/end date.

## ADMIN-03 Shop lifecycle

Using a test shop:

`PENDING -> APPROVED/ACTIVE -> SUSPENDED -> ACTIVE`

Verify:

- each transition succeeds only where permitted;
- suspended public storefront becomes unavailable;
- reactivated storefront returns;
- audit log is written.

If rejection is tested, use disposable data and confirm the resulting user experience.

## ADMIN-04 Subscription inspection

Open **Inspect subscription**.

Verify:

- current plan;
- stored/effective status;
- start/end/grace dates;
- payment status;
- usage/limits where shown.

Test allowed administrative changes:

- change plan;
- update status;
- update payment status;
- extend days.

Confirm merchant subscription screen reflects the saved result.

## ADMIN-05 Plans

Verify:

- create plan;
- edit plan;
- activate/inactivate as supported;
- product limit;
- image limit;
- analytics flag;
- Excel import flag;
- custom branding flag;
- trial/grace days;
- default-trial behaviour.

Do not leave conflicting default-trial plans after testing.

## ADMIN-06 Business categories

Verify:

- create category;
- edit category;
- status change;
- display ordering where supported;
- active category becomes selectable by merchants;
- inactive category is handled safely.

## ADMIN-07 Platform analytics

Verify analytics page loads and values are structurally correct.

At minimum check:

- shop counts/status breakdown;
- relevant platform metrics;
- no merchant-only or cross-tenant private data is exposed incorrectly.

---

# 6. Shop Owner / Merchant Testing

## MERCHANT-01 Dashboard

Verify all navigation items open successfully:

- Dashboard
- Products
- Categories
- Excel Import
- QR
- Shop Profile
- Analytics
- Subscription

No page should show obsolete "Later sprint" labels for implemented functionality.

## MERCHANT-02 Shop profile

Update and save:

- shop name
- business category
- tagline
- description
- phone
- WhatsApp
- email
- address
- city
- state
- PIN
- Google Maps URL
- Instagram/Facebook when applicable

Verify:

- validation messages;
- saved values persist after refresh;
- public storefront reflects customer-facing fields where implemented.

## MERCHANT-03 Shop-wide price visibility

In Shop Profile test:

`Show product prices by default = ON`

Expected: products using shop setting can display their prices.

Then test:

`Show product prices by default = OFF`

Expected:

- products using shop setting show **Price on request**;
- numeric price/discount is not exposed by public storefront data;
- stored merchant price is preserved and returns if the setting is switched back on.

## MERCHANT-04 Categories

Verify:

- create;
- edit;
- active/inactive state;
- delete behaviour;
- category belongs only to current shop.

Confirm inactive categories/products do not leak publicly.

## MERCHANT-05 Product creation

Create products covering:

- Fixed
- Starting from
- Ask price
- In stock
- Out of stock
- On request
- Featured
- New arrival
- Offer
- Visible/hidden

Check SKU behaviour:

- manual unique SKU works;
- blank SKU creates generated `PRD-*`;
- duplicate shop-scoped SKU is rejected.

## MERCHANT-06 Product edit

Edit:

- name;
- category;
- SKU;
- description;
- price;
- discount;
- price type;
- availability;
- featured/new/offer;
- visibility.

Verify public result updates without affecting another shop.

## MERCHANT-07 Price validation

Verify:

- Fixed requires a price;
- Starting from requires a price;
- Ask price can work without a displayed price;
- discount cannot exceed base price;
- invalid negative/out-of-range values fail.

## MERCHANT-08 Per-product price visibility

Test all combinations.

### Case A — shop OFF + product inherits

Expected: **Price on request**.

### Case B — shop OFF + product Always Show

Expected: that product shows its actual price while inherited products remain hidden.

### Case C — shop ON + product Always Hide

Expected: only overridden product hides price.

### Case D — shop ON + product inherits

Expected: normal price display.

### Case E — ASK_PRICE

Expected: price-on-request regardless of shop/per-product visibility.

## MERCHANT-09 Duplicate product

Duplicate a product.

Verify:

- duplicate is created hidden as designed;
- new SKU is unique/generated when appropriate;
- price visibility override is preserved;
- attributes are preserved;
- original product is unchanged.

## MERCHANT-10 Delete/hide

Verify:

- hiding removes the product from public catalogue;
- delete requires confirmation in UI;
- soft-deleted product does not leak publicly;
- restore API behaviour remains covered by automated tenant regression.

## MERCHANT-11 Product image / Cloudflare R2

Use JPG, PNG and/or WebP under 8 MB.

Verify:

- image upload succeeds;
- R2 PUT CORS succeeds;
- image metadata is stored;
- image displays on merchant/public product;
- another shop cannot mutate/use the product image endpoint.

Negative checks:

- unsupported MIME blocked;
- over-8MB image blocked;
- bad R2 CORS produces useful upload error.

## MERCHANT-12 Excel template/import/export

Verify:

- blank template download;
- current catalogue export;
- valid workbook preview;
- Ready rows;
- Duplicate rows;
- Invalid rows;
- partial import of valid rows;
- confirmation creates only ready products;
- generated product codes appear when SKU blank;
- re-uploading unchanged export is duplicate-safe;
- import history displays;
- cross-shop import-job access blocked.

Also test plan feature enforcement when Excel import is disabled.

## MERCHANT-13 QR

Verify permanent QR:

- points to `/s/{shopSlug}`;
- no temporary/local/hosting deployment URL is encoded for production;
- download/share works;
- QR can be scanned from a real phone;
- QR visit source appears in analytics.

Local QR naturally uses the local URL and may not be reachable by another device unless the development machine is reachable on the LAN. Production/staging QR must use its real public origin.

## MERCHANT-14 Merchant analytics

Generate activity from storefront, then verify:

- visits;
- product views;
- WhatsApp clicks;
- calls;
- directions;
- shares;
- QR source;
- top products/categories where supported.

Analytics must be scoped to the current shop.

## MERCHANT-15 Subscription view

Verify merchant can see:

- plan;
- subscription status;
- payment status;
- start/end/grace date;
- product limit;
- image limit;
- enabled feature flags.

Merchant must not be able to perform platform-admin plan/payment mutations.

---

# 7. Customer / Public Storefront Testing

Customer testing requires **no login**.

## CUSTOMER-01 Active storefront

Open:

```text
/s/{shopSlug}
```

Verify:

- active shop loads;
- name/tagline/location/contact details;
- categories;
- products;
- featured/new/offers;
- responsive layout.

## CUSTOMER-02 Search/filter/category

Verify:

- product search;
- category browsing;
- availability filter;
- pagination if enough products exist;
- no results state.

## CUSTOMER-03 Product detail

Open:

```text
/s/{shopSlug}/p/{productSlug}
```

Verify:

- image/gallery;
- product name;
- category;
- SKU;
- availability;
- description;
- attributes;
- correct price behaviour;
- customer actions.

## CUSTOMER-04 Normal visible price

For a visible FIXED/STARTING_FROM price:

- amount renders correctly;
- discount shows only where valid;
- normal WhatsApp action is shown.

## CUSTOMER-05 Hidden price / Request Price

For a hidden-price product:

- numeric price is not shown;
- page says **Price on request**;
- CTA says **Request Price**.

Click Request Price and inspect the prefilled WhatsApp message.

Expected context:

- shop name;
- product name;
- SKU when available;
- category when available;
- current availability;
- public product link.

Availability-specific ending:

- **IN_STOCK:** asks for current price and availability;
- **OUT_OF_STOCK:** asks for current price and when it will be available;
- **ON_REQUEST:** asks for current price and expected availability/lead time.

## CUSTOMER-06 WhatsApp

Verify WhatsApp target is the merchant's configured WhatsApp number and the encoded message is readable.

Analytics should record a WhatsApp action.

## CUSTOMER-07 Call

Verify call CTA uses the configured phone number and click is tracked.

## CUSTOMER-08 Directions

Verify configured Google Maps URL opens and click is tracked.

## CUSTOMER-09 Share

Verify native/share fallback behaviour as applicable and analytics tracking.

## CUSTOMER-10 Visibility/security

Public user must not access:

- suspended/non-active shop;
- hidden product;
- soft-deleted product;
- product under inactive category in a way that leaks it;
- merchant/admin APIs without authorization.

---

# 8. Role and Tenant Isolation Testing

Use Shop A and Shop B.

While logged in as Shop A, attempt to access/mutate Shop B IDs for:

- profile;
- category;
- product;
- image;
- import job;
- analytics;
- subscription.

Expected:

- 403 or tenant-safe 404 as designed;
- no Shop B content in successful Shop A responses;
- no Shop B mutation.

Where STAFF-role test data exists, verify STAFF cannot perform OWNER/MANAGER-only mutations.

Platform USER/merchant must not access admin APIs.

---

# 9. Subscription Limit Testing

Create/use a deliberately restricted test plan.

Verify server-side enforcement for:

- product count limit;
- image-per-product limit;
- Excel import feature flag;
- analytics feature flag where applicable.

Expected:

- UI cannot bypass backend enforcement;
- existing merchant data is not deleted when subscription state changes;
- expiry/grace behaviour does not silently transfer ownership or remove catalogue records.

---

# 10. Security Negative Testing

Automated security regression is mandatory. Additionally confirm manually where useful:

- oversized JSON -> HTTP 413 / `PAYLOAD_TOO_LARGE`;
- repeated protected abuse-prone requests -> HTTP 429 / `RATE_LIMITED`;
- invalid JSON -> safe 400;
- unauthenticated protected API -> 401;
- insufficient role -> 403;
- duplicate SKU -> 409 or defined conflict result;
- invalid category/product IDs do not reveal another tenant's data.

Never perform rate-limit stress against production.

---

# 11. PWA, Mobile and Browser Testing

Test desktop and mobile widths.

Verify:

- merchant dashboard responsive;
- public storefront responsive;
- menus usable by touch;
- no clipped controls;
- readable text;
- product gallery usable;
- Request Price CTA easy to tap;
- PWA manifest loads;
- merchant install prompt/readiness;
- storefront install prompt/readiness;
- service worker behaviour according to current implementation;
- no repeated red console errors.

At least one real Android/mobile test is recommended before production pilot.

---

# 12. Data Integrity Testing

After feature tests:

- hide/unhide price and confirm stored numeric price remains intact;
- suspend/reactivate shop and confirm catalogue remains intact;
- change subscription and confirm catalogue remains intact;
- duplicate product does not alter source;
- Shop A actions do not change Shop B;
- image DB keys still resolve to R2 objects;
- imported product count matches successful import rows.

---

# 13. Full Golden Flow

Run one uninterrupted end-to-end journey:

```text
Register merchant
-> Shop PENDING
-> Admin approves/activates
-> Default trial/subscription assigned
-> Merchant logs in
-> Complete Shop Profile
-> Configure price visibility
-> Create Category
-> Create Product
-> Upload R2 Image
-> Set product price visibility
-> Generate/Open Permanent QR
-> Customer opens Public Store
-> Search/Browse
-> Product Detail
-> Request Price / WhatsApp
-> Call / Directions / Share
-> Merchant Analytics
-> Admin Analytics / Subscription verification
```

Run once with a normal visible-price product and once with a hidden-price enquiry product.

---

# 14. Test Evidence Template

For each failed or important case record:

```text
Test ID:
Tester:
Date:
Branch/Commit:
Browser/Device:
Test Data:
Steps:
Expected:
Actual:
Status: PASS / FAIL / BLOCKED
Screenshot/Console:
Issue/PR:
Retest Result:
```

For release sign-off, both developers should record the commit SHA tested.

---

# 15. Final Release Gate

Before `staging -> main`:

- [ ] local/staging DB migrations clean
- [ ] Prisma validate/generate pass
- [ ] lint pass
- [ ] typecheck pass
- [ ] production build pass
- [ ] smoke pass
- [ ] security regression pass
- [ ] tenant regression pass
- [ ] authentication flow pass
- [ ] admin flow pass
- [ ] merchant flow pass
- [ ] customer/public flow pass
- [ ] R2 image upload/display pass
- [ ] Excel import/export pass
- [ ] QR pass
- [ ] analytics pass
- [ ] subscription/limits pass
- [ ] shop-wide price visibility pass
- [ ] individual price override pass
- [ ] Request Price WhatsApp message pass
- [ ] cross-tenant negative checks pass
- [ ] mobile/PWA check pass
- [ ] browser console free of release-blocking errors
- [ ] `git status` clean
- [ ] tested staging commit SHA recorded
- [ ] production backup/rollback target prepared

Only after the checklist is complete should staging be promoted to `main` / production.
