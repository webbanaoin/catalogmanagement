-- Existing paid prices are preserved as-is. Regular prices must be configured
-- explicitly by an administrator; no synthetic crossed-out prices are seeded.
ALTER TABLE `plans`
 ADD COLUMN `regular_monthly_price` DECIMAL(12,2) NULL,
 ADD COLUMN `regular_quarterly_price` DECIMAL(12,2) NULL,
 ADD COLUMN `regular_half_yearly_price` DECIMAL(12,2) NULL,
 ADD COLUMN `regular_annual_price` DECIMAL(12,2) NULL,
 ADD COLUMN `offer_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN `offer_duration_days` INTEGER NOT NULL DEFAULT 7,
 ADD COLUMN `offer_starts_at` DATETIME(3) NULL,
 ADD COLUMN `offer_ends_at` DATETIME(3) NULL;
