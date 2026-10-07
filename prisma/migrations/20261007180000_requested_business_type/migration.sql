ALTER TABLE `shops`
ADD COLUMN `requested_business_type` VARCHAR(160) NULL AFTER `business_category_id`;
