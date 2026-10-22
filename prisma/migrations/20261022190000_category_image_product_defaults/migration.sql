-- Opt-in category artwork as a representative product image. No media is copied.
ALTER TABLE `business_category_media`
  ADD COLUMN `visible_as_product_default` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `shop_categories`
  ADD COLUMN `visible_as_product_default` BOOLEAN NOT NULL DEFAULT false;