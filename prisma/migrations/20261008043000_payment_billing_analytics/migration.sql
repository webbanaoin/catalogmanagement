-- Payment analytics fields for manual billing history

ALTER TABLE `payment_records`
  ADD COLUMN `billing_cycle` ENUM('WEEKLY','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY','CUSTOM') NOT NULL DEFAULT 'CUSTOM' AFTER `method`,
  ADD COLUMN `period_start_date` DATETIME(3) NULL AFTER `billing_cycle`,
  ADD COLUMN `period_end_date` DATETIME(3) NULL AFTER `period_start_date`;

CREATE INDEX `payment_records_billing_cycle_received_at_idx`
  ON `payment_records`(`billing_cycle`, `received_at`);
