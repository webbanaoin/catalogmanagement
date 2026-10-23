-- Anonymous platform growth attribution; no personal information is stored.
-- Conversion events reference an opaque successfully created entity id only.
CREATE TABLE `storefront_growth_events` (
  `id` VARCHAR(191) NOT NULL,
  `source_shop_id` VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(40) NOT NULL,
  `source_page` VARCHAR(24) NULL,
  `session_id` VARCHAR(128) NULL,
  `converted_entity_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `storefront_growth_events_event_type_converted_entity_id_key` (`event_type`, `converted_entity_id`),
  INDEX `storefront_growth_events_source_shop_id_created_at_idx` (`source_shop_id`, `created_at`),
  INDEX `growth_src_event_created_idx` (`source_shop_id`, `event_type`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `storefront_growth_events_source_shop_id_fkey`
    FOREIGN KEY (`source_shop_id`) REFERENCES `shops`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
