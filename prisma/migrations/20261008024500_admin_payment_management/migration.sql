-- Admin Payment Management: append-only manual payment ledger

CREATE TABLE `payment_records` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `subscription_id` VARCHAR(191) NULL,
  `plan_id` VARCHAR(191) NULL,
  `recorded_by_user_id` VARCHAR(191) NULL,
  `plan_name_snapshot` VARCHAR(120) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `method` ENUM('CASH','UPI','BANK_TRANSFER','OTHER') NOT NULL,
  `reference` VARCHAR(191) NULL,
  `comment` TEXT NULL,
  `received_at` DATETIME(3) NOT NULL,
  `extend_days` INTEGER NOT NULL DEFAULT 0,
  `previous_end_date` DATETIME(3) NULL,
  `new_end_date` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `payment_records_shop_id_received_at_idx`(`shop_id`, `received_at`),
  INDEX `payment_records_subscription_id_idx`(`subscription_id`),
  INDEX `payment_records_plan_id_idx`(`plan_id`),
  INDEX `payment_records_method_received_at_idx`(`method`, `received_at`),
  INDEX `payment_records_recorded_by_user_id_created_at_idx`(`recorded_by_user_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_plan_id_fkey`
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_recorded_by_user_id_fkey`
  FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
