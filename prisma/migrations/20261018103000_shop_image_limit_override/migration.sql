-- Optional administrator quota override; NULL inherits subscription plan.
ALTER TABLE `shops`
  ADD COLUMN `image_limit_per_product_override` INTEGER NULL;
