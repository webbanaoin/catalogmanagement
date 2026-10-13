CREATE TABLE `official_payment_receivers` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `upi_id` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `cash_enabled` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `official_payment_receivers_active_idx`(`active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `official_payment_receivers` (`id`, `name`, `phone`, `upi_id`, `active`, `cash_enabled`, `updated_at`)
VALUES
 ('official-prashant', 'Prashant Patel', '9168720245', 'prashantpatel238-1@okaxis', true, true, CURRENT_TIMESTAMP(3)),
 ('official-parixit', 'Parixit', '9643819986', NULL, true, true, CURRENT_TIMESTAMP(3));

ALTER TABLE `payment_submissions` ADD COLUMN `official_receiver_id` VARCHAR(191) NULL;
CREATE INDEX `payment_submissions_official_receiver_id_status_idx` ON `payment_submissions`(`official_receiver_id`, `status`);
