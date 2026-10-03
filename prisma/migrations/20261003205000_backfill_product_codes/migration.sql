-- Sprint 4 usability hardening: ensure existing products have stable product codes.
-- New product creation/import paths generate PRD-* codes automatically when merchants leave the field blank.

UPDATE `products`
SET `sku` = CONCAT('PRD-', UPPER(SUBSTRING(SHA2(`id`, 256), 1, 8)))
WHERE `sku` IS NULL OR TRIM(`sku`) = '';
