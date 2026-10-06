-- Add a generic high-level product grouping used by vertical-specific catalogues.
-- Examples: Jewellery Type = Gold/Silver/Diamond, Garments = Men/Women/Kids,
-- Toys & Gifts = Toys/Gifts, Auto Parts = Car/Two Wheeler.
ALTER TABLE `products`
  ADD COLUMN `catalog_group` VARCHAR(120) NULL;

CREATE INDEX `products_shop_id_catalog_group_deleted_at_idx`
  ON `products`(`shop_id`, `catalog_group`, `deleted_at`);

CREATE INDEX `product_attributes_attribute_name_attribute_value_idx`
  ON `product_attributes`(`attribute_name`, `attribute_value`);
