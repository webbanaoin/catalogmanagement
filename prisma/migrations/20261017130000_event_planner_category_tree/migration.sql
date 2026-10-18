-- Add nullable hierarchy metadata to platform-managed category defaults.
-- Existing Jewellery/Toys/default records remain roots (parent_id NULL).
ALTER TABLE `business_category_defaults`
  ADD COLUMN `parent_id` VARCHAR(191) NULL;

CREATE INDEX `bc_defaults_parent_idx` ON `business_category_defaults`(`parent_id`);
ALTER TABLE `business_category_defaults`
  ADD CONSTRAINT `business_category_defaults_parent_id_fkey`
  FOREIGN KEY (`parent_id`) REFERENCES `business_category_defaults`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Register this vertical but do not change existing shops or subscriptions.
-- The application initializes its suggested hierarchy once from the preset.
INSERT IGNORE INTO `business_categories`
  (`id`, `name`, `slug`, `icon`, `status`, `display_order`, `defaults_initialized`)
VALUES
  ('bc_event_planners_decorators', 'Event Planners & Decorators',
   'event-planners-decorators', 'calendar-heart', 'ACTIVE', 70, false);
