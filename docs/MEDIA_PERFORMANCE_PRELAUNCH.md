# Pre-launch media performance and Cloudflare R2 checklist

## Code behaviour

- Product, logo, cover and category images are compressed and resized in the browser **before** an authorised direct upload to R2. Hostinger handles the upload authorization and DB metadata, not the original large file.
- Every product upload generates a full image and a smaller thumbnail. Storefront cards and product-gallery thumbnail strips use the thumbnail; detail and zoom use the full image. Older product images without a thumbnail still display.
- JPG, PNG and WebP input only. Source limit **100 MiB**, decoded-image limit **55 megapixels** and hard stored-derivative limit **8 MiB**; these guard against mobile browser crashes. True unlimited upload is not safe. Very large files still require a sufficiently capable browser/device.
- Best-effort compression budgets: product **1.5 MB / 1600 px longest edge**, thumbnail **140 KB / 480 px**, logo **300 KB / 600 px**, cover **1.6 MB / 1800 px**, category **350 KB / 720 px**. Output may exceed the target but never 8 MiB; transparent imagery stays transparent through WebP or PNG.
- R2 PUT retries twice for transient network failures (three attempts in total) using the same signed key and identical content. 4xx/CORS rejections surface an error rather than retrying indefinitely.
- Product catalogue returns **24 products per page** and noncritical images lazy-load. The cover is eagerly loaded at higher priority.
- Unique UUID object keys make immutable caching safe for new and replaced images.

## R2 + CDN setup (manual operator tasks)

1. Use `AWS_REGION=auto`, `AWS_S3_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` and existing secret credentials **only on the server**. Do not make credentials public.
2. Connect a **Cloudflare R2 custom domain** (for example `media.example.com`) to the bucket if all objects in it are meant for public viewing. Never put confidential media in a publicly accessible bucket. Prefer the custom domain to the developer `r2.dev` URL for production.
3. Verify that images are reachable from the HTTPS custom domain. Set `MEDIA_BASE_URL=https://media.example.com` in staging, then in production after successful checks. The DB continues storing object keys only; it needs no migration.
4. Configure the R2 bucket CORS for your exact staging and production origins. Allow `PUT` and `GET` and the request header `Content-Type`; expose `ETag` for diagnostics as desired. Do not use blanket '*' origins in production if the policy can be restricted.
5. **Optional cache headers:** To enable `MEDIA_IMMUTABLE_CACHE=true`, also allow `Cache-Control` as a PUT request header in R2 CORS, then test a browser merchant/admin upload from staging. The app sets `Cache-Control: public, max-age=31536000, immutable` on **new** uploads only when both `MEDIA_BASE_URL` and this flag are configured. Default is false so existing CORS setups do not break.
6. Use Cloudflare cache rules for the static media domain if needed, and check the second GET for `CF-Cache-Status: HIT` and sensible `Age` / `Cache-Control`. Do not cache login, admin, API or dynamic HTML routes. Object keys change on replacement, so a year-long cached image will not replace an updated image accidentally.
7. Keep a proper object-lifecycle/retention policy. Never blindly delete media already referenced in DB. Presigned PUT/metadata failures can leave orphan objects: monitor and clean up only after reference checks.
8. Without `MEDIA_BASE_URL`, the application still supports **private presigned reads**, but 15-minute signed URLs are not safe to put in cross-request caches and will not benefit from stable cross-visit CDN URLs.

## Testing before staging promotion

- Upload transparent PNG logo and JPG/WebP product photos at 1, 15 and 50 MB, and test a 48 MP camera photo. Verify orientation, readable fine product details and thumbnail quality after conversion.
- Test corrupt images, source over 100 MiB, dimensions over 55 MP, cancelled network and unreliable 3G/4G. A low-memory phone might still be unable to decode a huge image, even within supported caps.
- View a product with 5–6 photos on mobile: the gallery strip must request small thumbnails, and zoom/main view should request original optimized images. Legacy products without `thumbnailKey` must still work.
- Test full merchant registration through images, admin branding and public storefront, while signed upload URLs are active.
- Only after updating bucket CORS and domain settings, test `MEDIA_IMMUTABLE_CACHE=true`, including the browser OPTIONS preflight and PUT response, then inspect GET response headers and cache HITs.
- Run `npm run lint`, `npm run typecheck`, `npm run build` and Sprint 6 smoke/security/tenant flows; compare Lighthouse mobile LCP, CLS, transferred image bytes and network waterfall.
- A customer-capacity number and actual mobile load time require measurement under representative concurrent traffic. Do not infer either from image-size configuration alone.
- **No schema migration** is needed, existing product media remains valid, and caching is opt-in to avoid regression.
