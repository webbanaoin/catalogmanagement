-- Merchant payment submission and admin verification workflow.

CREATE TABLE `payment_submissions` (
  `id` VARCHAR(191) NOT NULL,
  `shop_id` VARCHAR(191) NOT NULL,
  `submitted_by_user_id` VARCHAR(191) NOT NULL,
  `reviewed_by_user_id` VARCHAR(191) NULL,
  `payment_record_id` VARCHAR(191) NULL,
  `referral_partner_id` VARCHAR(191) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `method` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER') NOT NULL,
  `billing_cycle` ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM') NOT NULL,
  `paid_at` DATETIME(3) NOT NULL,
  `recipient_type` ENUM('WEBBANAO', 'REFERRAL_PARTNER', 'OTHER') NOT NULL,
  `recipient_name_snapshot` VARCHAR(160) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `comment` TEXT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,
  `review_comment` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_submissions_payment_record_id_key`(`payment_record_id`),
  INDEX `payment_submissions_shop_id_submitted_at_idx`(`shop_id`, `submitted_at`),
  INDEX `payment_submissions_status_submitted_at_idx`(`status`, `submitted_at`),
  INDEX `payment_submissions_submitted_by_user_id_submitted_at_idx`(`submitted_by_user_id`, `submitted_at`),
  INDEX `payment_submissions_referral_partner_id_submitted_at_idx`(`referral_partner_id`, `submitted_at`),
  INDEX `payment_submissions_method_paid_at_idx`(`method`, `paid_at`),
  INDEX `payment_submissions_billing_cycle_paid_at_idx`(`billing_cycle`, `paid_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_submissions`
  ADD CONSTRAINT `payment_submissions_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_submissions_submitted_by_user_id_fkey`
  FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_submissions_reviewed_by_user_id_fkey`
  FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_submissions_payment_record_id_fkey`
  FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_submissions_referral_partner_id_fkey`
  FOREIGN KEY (`referral_partner_id`) REFERENCES `referral_partners`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
