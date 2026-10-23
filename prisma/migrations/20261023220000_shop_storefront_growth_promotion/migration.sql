-- Enable the platform growth CTA by default for existing and future shops.
-- Platform admins can disable it independently for each shop.
ALTER TABLE `shops`
  ADD COLUMN `storefront_growth_promo_enabled` BOOLEAN NOT NULL DEFAULT true;
