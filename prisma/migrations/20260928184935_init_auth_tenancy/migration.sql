-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(30) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shops` (
    `id` VARCHAR(191) NOT NULL,
    `business_category_id` VARCHAR(191) NULL,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `tagline` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `logo_storage_key` VARCHAR(512) NULL,
    `cover_storage_key` VARCHAR(512) NULL,
    `phone` VARCHAR(30) NULL,
    `whatsapp` VARCHAR(30) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(500) NULL,
    `city` VARCHAR(120) NULL,
    `state` VARCHAR(120) NULL,
    `pincode` VARCHAR(20) NULL,
    `google_maps_url` VARCHAR(1024) NULL,
    `instagram_url` VARCHAR(1024) NULL,
    `facebook_url` VARCHAR(1024) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shops_slug_key`(`slug`),
    INDEX `shops_business_category_id_idx`(`business_category_id`),
    INDEX `shops_status_idx`(`status`),
    INDEX `shops_city_idx`(`city`),
    INDEX `shops_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shop_users` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `shop_users_shop_id_role_idx`(`shop_id`, `role`),
    INDEX `shop_users_user_id_role_idx`(`user_id`, `role`),
    UNIQUE INDEX `shop_users_user_id_shop_id_key`(`user_id`, `shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `shop_users` ADD CONSTRAINT `shop_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_users` ADD CONSTRAINT `shop_users_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
