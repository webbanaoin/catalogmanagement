-- Existing plans default to 250 images per shop; the admin can change this per plan.
ALTER TABLE `plans` ADD COLUMN `total_image_limit` INTEGER NOT NULL DEFAULT 250;
