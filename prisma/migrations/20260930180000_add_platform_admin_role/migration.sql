-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `platform_role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX `users_platform_role_idx` ON `users`(`platform_role`);
