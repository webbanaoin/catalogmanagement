-- Referral / marketing partner commission management.

CREATE TABLE `referral_program_settings` (
  `id` VARCHAR(32) NOT NULL,
  `commission_mode` ENUM('FIRST_PAID_SUBSCRIPTION', 'EVERY_ELIGIBLE_PAYMENT') NOT NULL DEFAULT 'FIRST_PAID_SUBSCRIPTION',
  `monthly_commission` DECIMAL(12,2) NOT NULL DEFAULT 50.00,
  `yearly_commission` DECIMAL(12,2) NOT NULL DEFAULT 500.00,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_partners` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `code` VARCHAR(80) NOT NULL,
  `mobile` VARCHAR(30) NULL,
  `email` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `referral_partners_code_key`(`code`),
  INDEX `referral_partners_status_name_idx`(`status`, `name`),
  INDEX `referral_partners_mobile_idx`(`mobile`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shops`
  ADD COLUMN `referral_partner_id` VARCHAR(191) NULL,
  ADD COLUMN `referral_assigned_at` DATETIME(3) NULL,
  ADD INDEX `shops_referral_partner_id_idx`(`referral_partner_id`);

CREATE TABLE `referral_commissions` (
  `id` VARCHAR(191) NOT NULL,
  `payment_record_id` VARCHAR(191) NOT NULL,
  `referral_partner_id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `paid_by_user_id` VARCHAR(191) NULL,
  `billing_cycle` ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM') NOT NULL,
  `status` ENUM('EARNED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'EARNED',
  `commission_amount` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `payment_amount_snapshot` DECIMAL(12,2) NOT NULL,
  `partner_name_snapshot` VARCHAR(120) NOT NULL,
  `partner_code_snapshot` VARCHAR(80) NOT NULL,
  `shop_name_snapshot` VARCHAR(160) NOT NULL,
  `earned_at` DATETIME(3) NOT NULL,
  `paid_at` DATETIME(3) NULL,
  `payout_method` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER') NULL,
  `payout_reference` VARCHAR(191) NULL,
  `payout_comment` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `referral_commissions_payment_record_id_key`(`payment_record_id`),
  INDEX `referral_commissions_referral_partner_id_status_earned_at_idx`(`referral_partner_id`, `status`, `earned_at`),
  INDEX `referral_commissions_shop_id_earned_at_idx`(`shop_id`, `earned_at`),
  INDEX `referral_commissions_status_earned_at_idx`(`status`, `earned_at`),
  INDEX `referral_commissions_billing_cycle_earned_at_idx`(`billing_cycle`, `earned_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shops`
  ADD CONSTRAINT `shops_referral_partner_id_fkey`
  FOREIGN KEY (`referral_partner_id`) REFERENCES `referral_partners`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `referral_commissions`
  ADD CONSTRAINT `referral_commissions_payment_record_id_fkey`
  FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_commissions_referral_partner_id_fkey`
  FOREIGN KEY (`referral_partner_id`) REFERENCES `referral_partners`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_commissions_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_commissions_paid_by_user_id_fkey`
  FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `referral_program_settings`
  (`id`, `commission_mode`, `monthly_commission`, `yearly_commission`, `created_at`, `updated_at`)
VALUES
  ('default', 'FIRST_PAID_SUBSCRIPTION', 50.00, 500.00, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
