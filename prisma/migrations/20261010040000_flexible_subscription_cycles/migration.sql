-- Flexible subscription billing cycles and referral commissions.

ALTER TABLE `plans`
  ADD COLUMN `quarterly_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `monthly_price`,
  ADD COLUMN `half_yearly_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `quarterly_price`;

ALTER TABLE `referral_program_settings`
  ADD COLUMN `quarterly_commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `monthly_commission`,
  ADD COLUMN `half_yearly_commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `quarterly_commission`;

-- Give the untouched default Phase 1 plan the approved launch prices on
-- clean/new installations. Existing admin-configured prices are preserved.
UPDATE `plans`
SET
  `monthly_price` = 299.00,
  `quarterly_price` = 837.00,
  `half_yearly_price` = 1614.00,
  `annual_price` = 2988.00
WHERE
  `id` = 'plan_phase1_trial'
  AND `monthly_price` = 0.00
  AND `annual_price` = 0.00
  AND `quarterly_price` = 0.00
  AND `half_yearly_price` = 0.00;

-- Initialize the existing Webbanao ₹299/₹2,988 commercial plan with the
-- approved launch recommendations. Other plans remain admin-controlled.
UPDATE `plans`
SET
  `quarterly_price` = 837.00,
  `half_yearly_price` = 1614.00
WHERE
  `monthly_price` = 299.00
  AND `annual_price` = 2988.00
  AND `quarterly_price` = 0.00
  AND `half_yearly_price` = 0.00;

-- Initialize the current referral program with the approved launch recommendations.
UPDATE `referral_program_settings`
SET
  `quarterly_commission` = 125.00,
  `half_yearly_commission` = 250.00
WHERE
  `id` = 'default'
  AND `quarterly_commission` = 0.00
  AND `half_yearly_commission` = 0.00;
