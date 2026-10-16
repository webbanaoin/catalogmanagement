-- Safe, opt-in customer wishlist flags. Existing shops default OFF.
ALTER TABLE `shops`
  ADD COLUMN `wishlist_allowed_by_admin` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `wishlist_enabled_by_merchant` BOOLEAN NOT NULL DEFAULT false;
