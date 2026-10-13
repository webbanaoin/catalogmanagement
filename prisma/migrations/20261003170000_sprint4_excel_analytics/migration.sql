-- Sprint 4 Excel import tracking and customer analytics

CREATE TABLE `import_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `total_rows` INTEGER NOT NULL DEFAULT 0,
  `successful_rows` INTEGER NOT NULL DEFAULT 0,
  `failed_rows` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('PREVIEW_READY','VALIDATION_FAILED','COMPLETED','FAILED') NOT NULL,
  `preview_data` JSON NULL,
  `error_summary` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NULL,
  INDEX `import_jobs_shop_id_status_created_at_idx`(`shop_id`, `status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `catalog_visits` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `source` VARCHAR(80) NULL,
  `device_type` ENUM('MOBILE','TABLET','DESKTOP','OTHER','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `visited_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `catalog_visits_shop_id_visited_at_idx`(`shop_id`, `visited_at`),
  INDEX `catalog_visits_shop_id_session_id_visited_at_idx`(`shop_id`, `session_id`, `visited_at`),
  INDEX `catalog_visits_shop_id_source_visited_at_idx`(`shop_id`, `source`, `visited_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_views` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `product_id` VARCHAR(191) NOT NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `source` VARCHAR(80) NULL,
  `viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `product_views_shop_id_viewed_at_idx`(`shop_id`, `viewed_at`),
  INDEX `product_views_shop_id_product_id_viewed_at_idx`(`shop_id`, `product_id`, `viewed_at`),
  INDEX `product_views_shop_id_session_id_viewed_at_idx`(`shop_id`, `session_id`, `viewed_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `customer_actions` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `product_id` VARCHAR(191) NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `action_type` ENUM('WHATSAPP','CALL','DIRECTIONS','SHARE','PWA_INSTALL') NOT NULL,
  `source` VARCHAR(80) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `customer_actions_shop_id_created_at_idx`(`shop_id`, `created_at`),
  INDEX `customer_actions_shop_id_action_type_created_at_idx`(`shop_id`, `action_type`, `created_at`),
  INDEX `customer_actions_shop_id_product_id_created_at_idx`(`shop_id`, `product_id`, `created_at`),
  INDEX `customer_actions_shop_id_session_id_created_at_idx`(`shop_id`, `session_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `import_jobs`
  ADD CONSTRAINT `import_jobs_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `catalog_visits`
  ADD CONSTRAINT `catalog_visits_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_views`
  ADD CONSTRAINT `product_views_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_views`
  ADD CONSTRAINT `product_views_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `customer_actions`
  ADD CONSTRAINT `customer_actions_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `customer_actions`
  ADD CONSTRAINT `customer_actions_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
