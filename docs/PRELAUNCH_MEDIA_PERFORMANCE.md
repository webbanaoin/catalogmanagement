# Pre-launch image/media performance — staging rollout

## New browser pipeline
- Supported inputs: JPEG, PNG and WebP, including original camera photos larger than the old 8 MB upload limit.
- **Protect the customer's device:** reject raw files above 100 MB, unsupported/corrupt files, images above 45 megapixels, or sides above 20,000px. This is NOT a promise to handle infinite file sizes; browser devices have memory limits.
- No originals go to R2. Before signing a PUT upload, decode and transcode in the browser, preserve image aspect ratio and orientation, and encode WebP (PNG fallback on unsupported browsers). All outputs remain <= 8 MB and are validated server-side.
- Product main image max edge 1400px (WebP quality ~83%).
- Product catalogue thumbnail max edge 480px (WebP quality ~75%), uploaded to a *separate* R2 object; its key is stored in `product_images.thumbnail_key`.
- Shop/platform logo 600px; hero/cover 1600px; category imagery 720px. These assets are resized before uploading by their respective UI flows.
- The public storefront cards select `thumbnail_key` first and fall back to `storage_key`; product detail still loads full image. No schema migration.
- Previously uploaded images keep working; they stay unoptimized until manually re-uploaded/backfilled. Removing an image already deletes both the main and thumbnail keys.

## R2 CORS and private media safety
Keep existing staging R2 bucket PRIVATE. This change continues using presigned PUT/GET URLs; no account key is sent to the browser, only short-lived upload URLs.

Bucket CORS for uploads should allow:
- Origin: `https://staging.webbanao.in` (and later the actual production hostname, not a dummy domain).
- Method: PUT (plus HEAD/GET as relevant to the media deployment).
- Request headers: Content-Type (and headers actually present in the presigned upload response).
- Do not use `*` origins with credentials or unnecessarily broad methods.

Don't set `MEDIA_BASE_URL` to `example.invalid`, the R2 API endpoint, or a hostname without an actual working public media route. Leave it **unset** for the current private-bucket presigned URL flow.

### Future CDN step (requires explicit R2 configuration)
If we want Cloudflare CDN caching with stable public URLs, use a **separate public catalogue-media bucket** or review every object stored in the bucket and decide which content is safe to publish. Configure an authenticated R2 custom domain such as `media.webbanao.in`, cache eligible *public* immutable hashed images, and only then set `MEDIA_BASE_URL=https://media.webbanao.in`. Never expose private documents/receipts via a custom public bucket domain. Existing `getMediaUrl` already supports a verified MEDIA_BASE_URL and private signed URL fallback; do not enable without testing.

Cache headers for immutable public images (e.g. Cache-Control: public,max-age=31536000,immutable) should be applied to the upload objects **only after** CORS/proxy coverage is proven. Changing signed upload request headers without updating R2 CORS will cause upload failures.

## Staging acceptance checks before production
1. Health endpoint returns database ok. `STAGING_MIGRATE_ON_BUILD=false` (no migration for this PR).
2. Upload a merchant product 20 MB JPEG and 2 MB PNG; browser converts both, shop image metadata gains `thumbnailKey`. R2 has two keys for each newly uploaded product image.
3. A product collection with 100 images loads 24 items per page, and the listing references the small thumbnail URL while product detail uses full image.
4. Upload logo, cover, admin default and category images larger than 8 MB and confirm their resulting R2 objects are small/valid; existing fallback media remains unchanged.
5. Upload a corrupt/non-image file; show clear error. Try a file >100 MB; show safe rejection before image decoding.
6. Verify image deletion removes both thumbnail and main objects; existing legacy image with no thumbnail continues rendering.
7. Run controlled Chrome mobile Slow 4G/Lighthouse test and compare total network bytes, LCP, response time, and failure rate. Load-test 10/25/50 concurrent visitors in staging; no unsupported hosting capacity guarantee.
8. Check Hostinger logs and Cloudflare R2 metrics for 4xx/5xx and validate CORS after deployment.

## Limitations
- Pure browser optimisations cannot convert arbitrary unsupported formats such as HEIC on browsers that do not decode them. Ask the user to convert to JPG/WebP.
- Extremely large originals can cause high browser memory use; this is why safe decoding limits remain.
- This change improves media bytes but does not implement public-storefront HTTP response caching or automatically enable the Cloudflare CDN. Do that in a separate, measured staging release.
