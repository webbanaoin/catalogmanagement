ALTER TABLE `shops` ADD COLUMN `show_product_prices` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `products` ADD COLUMN `show_price` BOOLEAN NULL;
