# Database Schema — Phase 1 Design

This is the target logical model. Prisma migrations are the canonical implementation mechanism once the application is initialized.

## users
id, name, email, mobile, password_hash, status, created_at, updated_at.\n\nSprint 1 status values: `ACTIVE`, `DISABLED`. Email is globally unique and normalized by the application before persistence.

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

## product_images
id, product_id, storage_key, thumbnail_key, display_order, is_primary, file_size, mime_type, created_at.

## product_attributes
id, product_id, attribute_name, attribute_value, display_order.

## shop_hours
id, shop_id, day_of_week, is_closed, open_time, close_time.

## plans
id, name, monthly_price, annual_price, product_limit, image_limit_per_product, analytics_enabled, excel_import_enabled, custom_branding_enabled, status.

## subscriptions
id, shop_id, plan_id, start_date, end_date, status, payment_status, created_at, updated_at.

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
id, shop_id, file_name, total_rows, successful_rows, failed_rows, status, created_at.

## audit_logs
id, actor_user_id nullable, shop_id nullable, action, entity_type, entity_id, metadata, created_at.

## Indexing principles
Index foreign keys and common filters, especially shop_id, category_id, slug, sku, status and created_at. Composite unique/index choices must account for tenant scope; for example SKU/slug uniqueness may be scoped by shop where product requirements allow it.

## Data rules
Use soft deletion for recoverable merchant catalogue records. Avoid category-specific product columns. Avoid fixed image columns. All tenant access is authorized server-side.
