-- Sprint 6 security hardening: session revocation, audit trail and production indexes.

ALTER TABLE `users`
  ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `shops_status_created_at_idx`
  ON `shops`(`status`, `created_at`);

CREATE INDEX `password_reset_tokens_user_id_used_at_expires_at_idx`
  ON `password_reset_tokens`(`user_id`, `used_at`, `expires_at`);

CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,
    `action` VARCHAR(120) NOT NULL,
    `entity_type` VARCHAR(80) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    INDEX `audit_logs_shop_id_created_at_idx`(`shop_id`, `created_at`),
    INDEX `audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_actor_user_id_fkey`
  FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_shop_id_fkey`
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
