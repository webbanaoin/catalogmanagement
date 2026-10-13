-- Sprint 2 catalogue core
CREATE TABLE `business_categories` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(160) NOT NULL,
  `icon` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `display_order` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `business_categories_slug_key`(`slug`),
  INDEX `business_categories_status_display_order_idx`(`status`, `display_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shop_categories` (
  `id` VARCHAR(191) NOT NULL, `shop_id` VARCHAR(191) NOT NULL, `parent_id` VARCHAR(191) NULL,
  `name` VARCHAR(120) NOT NULL, `slug` VARCHAR(160) NOT NULL, `image_storage_key` VARCHAR(512) NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0, `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `shop_categories_shop_id_slug_key`(`shop_id`, `slug`),
  INDEX `shop_categories_shop_id_status_display_order_idx`(`shop_id`, `status`, `display_order`),
  INDEX `shop_categories_parent_id_idx`(`parent_id`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` VARCHAR(191) NOT NULL, `shop_id` VARCHAR(191) NOT NULL, `category_id` VARCHAR(191) NULL,
  `name` VARCHAR(180) NOT NULL, `slug` VARCHAR(191) NOT NULL, `sku` VARCHAR(100) NULL,
  `description` TEXT NULL, `price` DECIMAL(12,2) NULL, `discount_price` DECIMAL(12,2) NULL,
  `price_type` ENUM('FIXED','STARTING_FROM','ASK_PRICE') NOT NULL DEFAULT 'FIXED',
  `availability_status` ENUM('IN_STOCK','OUT_OF_STOCK','ON_REQUEST') NOT NULL DEFAULT 'IN_STOCK',
  `is_featured` BOOLEAN NOT NULL DEFAULT false, `is_new_arrival` BOOLEAN NOT NULL DEFAULT false,
  `is_offer` BOOLEAN NOT NULL DEFAULT false, `is_visible` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  UNIQUE INDEX `products_shop_id_slug_key`(`shop_id`, `slug`),
  UNIQUE INDEX `products_shop_id_sku_key`(`shop_id`, `sku`),
  INDEX `products_shop_id_is_visible_deleted_at_created_at_idx`(`shop_id`, `is_visible`, `deleted_at`, `created_at`),
  INDEX `products_shop_id_category_id_deleted_at_idx`(`shop_id`, `category_id`, `deleted_at`),
  INDEX `products_shop_id_availability_status_deleted_at_idx`(`shop_id`, `availability_status`, `deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_images` (
  `id` VARCHAR(191) NOT NULL, `product_id` VARCHAR(191) NOT NULL, `storage_key` VARCHAR(512) NOT NULL,
  `thumbnail_key` VARCHAR(512) NULL, `display_order` INTEGER NOT NULL DEFAULT 0,
  `is_primary` BOOLEAN NOT NULL DEFAULT false, `file_size` INTEGER NULL, `mime_type` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `product_images_product_id_display_order_idx`(`product_id`, `display_order`),
  INDEX `product_images_product_id_is_primary_idx`(`product_id`, `is_primary`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_attributes` (
  `id` VARCHAR(191) NOT NULL, `product_id` VARCHAR(191) NOT NULL, `attribute_name` VARCHAR(120) NOT NULL,
  `attribute_value` VARCHAR(500) NOT NULL, `display_order` INTEGER NOT NULL DEFAULT 0,
  INDEX `product_attributes_product_id_display_order_idx`(`product_id`, `display_order`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shop_hours` (
  `id` VARCHAR(191) NOT NULL, `shop_id` VARCHAR(191) NOT NULL, `day_of_week` TINYINT NOT NULL,
  `is_closed` BOOLEAN NOT NULL DEFAULT false, `open_time` VARCHAR(5) NULL, `close_time` VARCHAR(5) NULL,
  UNIQUE INDEX `shop_hours_shop_id_day_of_week_key`(`shop_id`, `day_of_week`),
  INDEX `shop_hours_shop_id_idx`(`shop_id`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shops` ADD CONSTRAINT `shops_business_category_id_fkey` FOREIGN KEY (`business_category_id`) REFERENCES `business_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `shop_categories` ADD CONSTRAINT `shop_categories_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `shop_categories` ADD CONSTRAINT `shop_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `shop_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `products` ADD CONSTRAINT `products_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `shop_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `product_attributes` ADD CONSTRAINT `product_attributes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `shop_hours` ADD CONSTRAINT `shop_hours_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Initial platform business categories. These are database records, not application constants.
INSERT INTO `business_categories` (`id`, `name`, `slug`, `icon`, `status`, `display_order`) VALUES
('bc_jewellery', 'Jewellery', 'jewellery', NULL, 'ACTIVE', 10),
('bc_toys_gifts', 'Toys & Gifts', 'toys-gifts', NULL, 'ACTIVE', 20),
('bc_furniture_home_decor', 'Furniture & Home Decor', 'furniture-home-decor', NULL, 'ACTIVE', 30),
('bc_clothing_boutique_saree', 'Clothing / Boutique / Saree', 'clothing-boutique-saree', NULL, 'ACTIVE', 40),
('bc_footwear', 'Footwear', 'footwear', NULL, 'ACTIVE', 50);
