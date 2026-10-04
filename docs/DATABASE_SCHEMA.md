# Database Schema — Phase 1 Design

This is the target logical model. Prisma migrations are the canonical implementation mechanism once the application is initialized.

## users
id, name, email, mobile, password_hash, status, platform_role, session_version, created_at, updated_at.\n\nSprint 1 status values: `ACTIVE`, `DISABLED`. Email is globally unique and normalized by the application before persistence. Sprint 6 uses `session_version` to revoke older session JWTs after a password reset without storing raw sessions server-side.

## shops
id, business_category_id, name, slug, tagline, description, logo_storage_key, cover_storage_key, phone, whatsapp, email, address, city, state, pincode, google_maps_url, instagram_url, facebook_url, status, created_at, updated_at.\n\nSprint 1 lifecycle values: `PENDING`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `REJECTED`. `business_category_id` remains a scalar until the Sprint 2 `business_categories` model owns that relation.

## shop_users
id, user_id, shop_id, role, created_at. Unique membership constraints should prevent accidental duplicates.\n\nInitial roles: `OWNER`, `MANAGER`, `STAFF`. `(user_id, shop_id)` is unique; tenant authorization must always resolve this membership server-side.

## business_categories
id, name, slug, icon, status, display_order.

## shop_categories
id, shop_id, parent_id nullable, name, slug, image_storage_key nullable, display_order, status, created_at, updated_at.

## products
id, shop_id, category_id, name, slug, sku, description, price, discount_price, price_type, availability_status, is_featured, is_new_arrival, is_offer, is_visible, created_at, updated_at, deleted_at.

`sku` is the stored Product Code. Merchant input is optional, but current application flows auto-generate a `PRD-*` code when it is omitted and legacy blank values are backfilled. Product Code uniqueness is scoped per shop.

## product_images
id, product_id, storage_key, thumbnail_key, display_order, is_primary, file_size, mime_type, created_at.

## product_attributes
id, product_id, attribute_name, attribute_value, display_order.

## shop_hours
id, shop_id, day_of_week, is_closed, open_time, close_time.

## plans
id, name, slug, description, monthly_price, annual_price, product_limit, image_limit_per_product, analytics_enabled, excel_import_enabled, custom_branding_enabled, trial_days, grace_days, is_default_trial, status, created_at, updated_at.

Plans are database-driven. A single ACTIVE plan is selected by application/admin rules as the default trial; it must have at least one trial day.

## subscriptions
id, shop_id, plan_id, start_date, end_date, grace_ends_at, status, payment_status, created_at, updated_at.

Phase 1 keeps one current subscription row per shop. Subscription statuses: `TRIAL`, `ACTIVE`, `GRACE`, `EXPIRED`, `CANCELLED`. Payment status is administrative tracking only; no payment gateway is required. Effective access is date-aware and expiry does not delete catalogue data.

## catalog_visits
id, shop_id, session_id, source, device_type, visited_at.

## product_views
id, shop_id, product_id, session_id, viewed_at.

## customer_actions
id, shop_id, product_id nullable, session_id, action_type, source, created_at.
Initial action types: whatsapp, call, directions, share, pwa_install.

## qr_codes
id, shop_id, qr_type, target_url, created_at.

## import_jobs
id, shop_id, file_name, total_rows, successful_rows, failed_rows, status, preview_data, error_summary, created_at, updated_at, completed_at.

Import jobs are always shop-scoped. Preview data stores only import-ready normalized rows for confirmation, while error/duplicate summaries support the merchant preview/history flow.

## audit_logs
id, actor_user_id nullable, shop_id nullable, action, entity_type, entity_id, metadata, created_at.

Sprint 6 persists audit rows for high-impact platform administration such as shop status, plan and subscription changes. Actor/shop foreign keys use `SET NULL` on deletion so the historical event can remain.

## Indexing principles
Index foreign keys and common filters, especially shop_id, category_id, slug, sku, status and created_at. Composite unique/index choices must account for tenant scope; for example SKU/slug uniqueness may be scoped by shop where product requirements allow it.

Sprint 6 adds `shops(status, created_at)` for admin queues, a password-reset cleanup index, and actor/shop/entity indexes on `audit_logs`.

## Data rules
Use soft deletion for recoverable merchant catalogue records. Avoid category-specific product columns. Avoid fixed image columns. All tenant access is authorized server-side.
