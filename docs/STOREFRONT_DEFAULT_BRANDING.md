# Storefront Default Branding

## Goal

Every public Digital Showroom should look complete from day one, even before a merchant uploads branding.

Images are stored in Cloudflare R2/object storage. MySQL stores only storage keys and inheritance metadata; image binaries are never stored in the database.

## Branding priority

### Shop logo

1. Merchant custom shop logo
2. Platform default Webbanao Digital Showroom logo
3. Premium image fallback

### Storefront cover

1. Merchant custom shop cover
2. Business-type default cover (for example Jewellery)
3. Platform generic fallback cover
4. Premium image fallback

### Category image

1. Shop-specific category image
2. Admin global Business Type + Category image
3. Premium image fallback

## Admin workflow

Admin -> Business categories contains two levels of defaults:

1. Platform storefront defaults
   - Default Webbanao logo
   - Optional generic fallback cover

2. Manage category images for each business type
   - Default storefront cover for that business type
   - Shared category image library for preset categories

Replacing an admin default immediately affects every existing and future matching shop that has not created its own override.

## Merchant workflow

Dashboard -> Shop Profile -> Logo and cover shows the effective image and its source.

Merchants can upload a custom logo or cover. A custom image affects only that shop.

When a merchant selects Revert to default, the shop-specific storage key is removed and the storefront immediately falls back to the current admin default.

## Storage

Platform defaults:
- platform/branding/logo/<uuid>.<ext>
- platform/branding/cover/<uuid>.<ext>

Business covers:
- business-categories/<businessCategoryId>/cover/<uuid>.<ext>

Shared category media keeps the existing business-category media structure.

## Database

- platform_branding stores platform default keys.
- business_categories.default_cover_storage_key stores each business vertical's default cover.
- business_category_media stores shared category image keys.
- shops.logo_storage_key and shops.cover_storage_key remain merchant overrides.
- shop_categories.image_storage_key remains the shop-specific category override.

## Deployment requirement

After pulling the feature, run:

```
npm run prisma:generate
npm run db:migrate:deploy
```

Migration:
`20261009032000_storefront_default_branding`

For best public-media performance in production, configure `MEDIA_BASE_URL` to the public/custom Cloudflare R2 media domain.
