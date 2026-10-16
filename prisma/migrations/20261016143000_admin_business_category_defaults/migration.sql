-- Non-destructive catalog default management. Existing shop categories and products are untouched.
ALTER TABLE `business_categories`
  ADD COLUMN `defaults_initialized` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `business_category_defaults` (
  `id` VARCHAR(191) NOT NULL,
  `business_category_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(160) NOT NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `is_preset` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `business_category_defaults_business_category_id_slug_key` (`business_category_id`, `slug`),
  INDEX `bc_defaults_category_status_order_idx` (`business_category_id`, `status`, `display_order`),
  PRIMARY KEY (`id`),
  CONSTRAINT `business_category_defaults_business_category_id_fkey`
    FOREIGN KEY (`business_category_id`) REFERENCES `business_categories`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Keep the historical slug and business_category_id stable for existing shops/media.
UPDATE `business_categories`
SET `name` = 'Gift, Toys & Stationery'
WHERE `id` = 'bc_toys_gifts' AND `name` = 'Toys & Gifts';
