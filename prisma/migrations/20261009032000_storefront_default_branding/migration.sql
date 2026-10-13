-- Central storefront defaults: platform logo/fallback cover and per-business default cover.

CREATE TABLE `platform_branding` (
  `id` VARCHAR(32) NOT NULL,
  `default_logo_storage_key` VARCHAR(512) NULL,
  `default_cover_storage_key` VARCHAR(512) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `business_categories`
  ADD COLUMN `default_cover_storage_key` VARCHAR(512) NULL AFTER `icon`;

INSERT INTO `platform_branding` (
  `id`,
  `default_logo_storage_key`,
  `default_cover_storage_key`,
  `created_at`,
  `updated_at`
) VALUES (
  'default',
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
