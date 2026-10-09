CREATE TABLE `subscription_reminders` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `recipient_email` VARCHAR(191) NOT NULL,
  `expiry_date` DATETIME(3) NOT NULL,
  `days_before` INTEGER NOT NULL,
  `sent_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `subscription_reminders_dedupe_key`(`shop_id`, `recipient_email`, `expiry_date`, `days_before`),
  INDEX `subscription_reminders_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `subscription_reminders` ADD CONSTRAINT `subscription_reminders_shop_id_fkey`
FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
