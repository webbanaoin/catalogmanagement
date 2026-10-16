// Client-side ZIP reader for category images. The ZIP never goes to our server:
// files are extracted in the browser then uploaded via existing R2 presigned URLs.
// Deliberately supports only ordinary ZIP (stored/deflate), not ZIP64/encrypted ZIP.
const MAX_ZIP_BYTES = 45 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 120;
const MAX_IMAGE_FILES = 40;

export type CategoryZipImage = {
  filename: string;
  categorySlug: string;
  file: File;
};

function invalid(reason: string): never {
  throw new Error(reason);
}

function slugFromFilename(filename: string) {
  const leaf = filename.replace(/\\/g, "/").split("/").at(-1) ?? "";
  const base = leaf.replace(/\.(?:jpg|jpeg|png|webp)$/i, "").replace(/^\d{1,3}[-_\s]+/, "");
  return base
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function bytesWithin(view: DataView, offset: number, length: number) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) ||
    offset < 0 || length < 0 || offset + length > view.byteLength) {
    invalid("The ZIP archive has an invalid directory or truncated image entry.");
  }
}

export async function extractCategoryImages(zip: File): Promise<CategoryZipImage[]> {
  if (zip.size === 0 || zip.size > MAX_ZIP_BYTES) {
    invalid("Choose a ZIP smaller than 45 MB.");
  }
  const buffer = await zip.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // The end-of-central-directory may be followed by a comment (<=65535 bytes).
  let end = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      const commentLength = view.getUint16(i + 20, true);
      if (i + 22 + commentLength === view.byteLength) { end = i; break; }
    }
  }
  if (end < 0) invalid("Invalid ZIP file: central directory was not found.");

  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  if (count === 0xffff || start === 0xffffffff || directorySize === 0xffffffff ||
      count > MAX_ZIP_ENTRIES || count === 0) {
    invalid("ZIP is empty, too large, or uses an unsupported ZIP64 format.");
  }
  bytesWithin(view, start, directorySize);
  let cursor = start;
  const images: CategoryZipImage[] = [];
  const decoder = new TextDecoder();

  for (let index = 0; index < count; index++) {
    bytesWithin(view, cursor, 46);
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      invalid("Invalid ZIP directory entry.");
    }

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true);
    const inflatedSize = view.getUint32(cursor + 24, true);
    const filenameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const local = view.getUint32(cursor + 42, true);
    const endEntry = cursor + 46 + filenameLength + extraLength + commentLength;
    bytesWithin(view, cursor, endEntry - cursor);
    const filename = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + filenameLength));
    cursor = endEntry;

    if (filename.endsWith("/") || !/\.(?:jpe?g|png|webp)$/i.test(filename)) continue;
    if (filename.split(/[\\/]/).some((part) => part === ".." || part === "__MACOSX")) {
      invalid("ZIP contains an unsafe file path.");
    }
    if (flags & 1) invalid("Password-protected ZIP files are not supported.");
    if (![0, 8].includes(method)) invalid("Use a standard ZIP with stored or deflated images.");
    if (inflatedSize === 0 || inflatedSize > MAX_IMAGE_BYTES || size > MAX_IMAGE_BYTES) {
      invalid("Images inside the ZIP must each be at most 8 MB.");
    }
    if (images.length >= MAX_IMAGE_FILES) invalid("A ZIP may contain at most 40 category images.");
    bytesWithin(view, local, 30);
    if (view.getUint32(local, true) !== 0x04034b50) invalid("Invalid ZIP image header.");
    const localFilenameLength = view.getUint16(local + 26, true);
    const localExtraLength = view.getUint16(local + 28, true);
    const dataStart = local + 30 + localFilenameLength + localExtraLength;
    bytesWithin(view, dataStart, size);
    const compressed = bytes.slice(dataStart, dataStart + size);

    let uncompressed: ArrayBuffer;
    if (method === 0) {
      uncompressed = compressed.buffer;
    } else {
      if (typeof DecompressionStream === "undefined") {
        invalid("ZIP extraction is unavailable in this browser. Please use an updated Edge or Chrome.");
      }
      try {
        uncompressed = await new Response(
          new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat)),
        ).arrayBuffer();
      } catch {
        invalid("ZIP could not be decompressed. Recreate the ZIP and try again.");
      }
    }
    if (uncompressed.byteLength !== inflatedSize) {
      invalid("A ZIP image is corrupted or has an invalid file size.");
    }
    const name = filename.split(/[\\/]/).at(-1) ?? "";
    const mime = /\.png$/i.test(name) ? "image/png"
      : /\.webp$/i.test(name) ? "image/webp" : "image/jpeg";
    images.push({
      filename,
      categorySlug: slugFromFilename(filename),
      file: new File([uncompressed], name, { type: mime }),
    });
  }

  if (!images.length) invalid("No JPG, PNG or WebP category images found in the ZIP.");
  return images;
}
