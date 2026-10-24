# Product photo adjustment

Merchant workflow:
1. Open Dashboard > Products and select Upload images for an existing product.
2. Pick one or several JPG, PNG or WebP files.
3. Before each upload, preview the **square catalog card** and choose:
   - **Fit entire photo** (default) — shows the entire source with white padding;
   - **Fill & crop** — fills the square and allows intentionally cropping edges.
4. Fine-tune Zoom (100–300%), Horizontal position, Vertical position, or drag the preview.
5. Confirm to upload. Each file gets its own preview before its upload. Cancel aborts remaining queued photos.
6. The browser exports a 1200 × 1200 optimized framed file; existing upload pipeline then creates main/thumbnail WebP derivatives and uploads with signed R2 URLs. The existing tenant, image count, and rate-limit validations are retained.

Display policy:
- Existing catalog photos retain the original object-cover sizing and square cards (same look as before photo adjustment). No stored images are modified.
- Category-default images also retain the existing cover display.
- Merchants can use Fit entire photo in the upload adjustment window to produce square-padded files when they need the whole item visible without changing the appearance of existing product cards.
- Detail gallery retains full-size viewer and existing zoom behavior.
- Adjustment affects new uploaded images only. To replace a previously uploaded photo permanently, upload the corrected image, set it primary, confirm appearance, then delete the old image if desired.

Release checklist:
- Run `npm run test:photos:framing`, `npm run lint`, `npm run typecheck`, `npm run build` before deployment.
- Test tall/landscape/square JPG, PNG and WebP on mobile and desktop.
- Confirm default Fit shows whole product; Fill & crop adjusts top/bottom correctly.
- Confirm uploaded thumbnails match preview, existing primary remains primary, and new images respect per-product quota.
- Try multi-select, cancellation, upload failure/retry, and oversized/invalid photos.
- No Prisma migration or storage configuration changes required.
