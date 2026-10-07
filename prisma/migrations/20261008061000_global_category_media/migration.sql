-- Global category media library shared by shops of the same business type.

CREATE TABLE `business_category_media` (
  `id` VARCHAR(191) NOT NULL,
  `business_category_id` VARCHAR(191) NOT NULL,
  `category_slug` VARCHAR(160) NOT NULL,
  `category_name` VARCHAR(120) NOT NULL,
  `image_storage_key` VARCHAR(512) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `business_category_media_business_category_id_category_slug_key`(`business_category_id`, `category_slug`),
  INDEX `business_category_media_business_category_id_idx`(`business_category_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `business_category_media`
  ADD CONSTRAINT `business_category_media_business_category_id_fkey`
  FOREIGN KEY (`business_category_id`) REFERENCES `business_categories`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
