-- Sprint 5 database-driven plans, subscriptions, trial/grace lifecycle and pilot backfill

CREATE TABLE `plans` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(160) NOT NULL,
  `description` VARCHAR(500) NULL,
  `monthly_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `annual_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `product_limit` INTEGER NOT NULL,
  `image_limit_per_product` INTEGER NOT NULL,
  `analytics_enabled` BOOLEAN NOT NULL DEFAULT false,
  `excel_import_enabled` BOOLEAN NOT NULL DEFAULT false,
  `custom_branding_enabled` BOOLEAN NOT NULL DEFAULT false,
  `trial_days` INTEGER NOT NULL DEFAULT 0,
  `grace_days` INTEGER NOT NULL DEFAULT 0,
  `is_default_trial` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `plans_slug_key`(`slug`),
  INDEX `plans_status_idx`(`status`),
  INDEX `plans_is_default_trial_status_idx`(`is_default_trial`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `plan_id` VARCHAR(191) NOT NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `grace_ends_at` DATETIME(3) NULL,
  `status` ENUM('TRIAL','ACTIVE','GRACE','EXPIRED','CANCELLED') NOT NULL,
  `payment_status` ENUM('NOT_REQUIRED','PENDING','PAID','WAIVED') NOT NULL DEFAULT 'NOT_REQUIRED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `subscriptions_shop_id_key`(`shop_id`),
  INDEX `subscriptions_plan_id_status_idx`(`plan_id`, `status`),
  INDEX `subscriptions_status_end_date_idx`(`status`, `end_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_plan_id_fkey`
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- A database-owned pilot trial keeps existing approved/active shops working after
-- entitlement enforcement is enabled. Admins can edit or replace this plan later.
INSERT INTO `plans` (
  `id`, `name`, `slug`, `description`,
  `monthly_price`, `annual_price`,
  `product_limit`, `image_limit_per_product`,
  `analytics_enabled`, `excel_import_enabled`, `custom_branding_enabled`,
  `trial_days`, `grace_days`, `is_default_trial`, `status`,
  `created_at`, `updated_at`
) VALUES (
  'plan_phase1_trial',
  'Phase 1 Trial',
  'phase-1-trial',
  'Default 30-day pilot trial. Limits and prices can be changed by a platform administrator.',
  0, 0,
  1000, 10,
  true, true, false,
  30, 7, true, 'ACTIVE',
  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
);

INSERT INTO `subscriptions` (
  `id`, `shop_id`, `plan_id`,
  `start_date`, `end_date`, `grace_ends_at`,
  `status`, `payment_status`, `created_at`, `updated_at`
)
SELECT
  CONCAT('sub_trial_', `id`),
  `id`,
  'plan_phase1_trial',
  CURRENT_TIMESTAMP(3),
  DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY),
  DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 37 DAY),
  'TRIAL',
  'NOT_REQUIRED',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `shops`
WHERE `status` IN ('APPROVED','ACTIVE','SUSPENDED');
