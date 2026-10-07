CREATE TABLE `payment_records` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `subscription_id` VARCHAR(191) NULL,
  `plan_id` VARCHAR(191) NULL,
  `received_by_user_id` VARCHAR(191) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','PAID','FAILED','REFUNDED','WAIVED') NOT NULL,
  `method` ENUM('CASH','UPI','BANK_TRANSFER','ONLINE','OTHER') NOT NULL,
  `payment_date` DATETIME(3) NOT NULL,
  `reference_id` VARCHAR(191) NULL,
  `gateway_order_id` VARCHAR(191) NULL,
  `gateway_payment_id` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `payment_records_shop_id_payment_date_idx`(`shop_id`, `payment_date`),
  INDEX `payment_records_subscription_id_payment_date_idx`(`subscription_id`, `payment_date`),
  INDEX `payment_records_status_payment_date_idx`(`status`, `payment_date`),
  INDEX `payment_records_method_payment_date_idx`(`method`, `payment_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_plan_id_fkey`
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_received_by_user_id_fkey`
  FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
