import { ImageOptimizationError, validateSourceImage } from "@/lib/client-image-optimizer";
import {
  frameProductPhoto,
  type ProductImageFraming,
} from "@/lib/product-image-framing";

export type PhotoVariantKind = "standard" | "white" | "closeup";
export type PhotoVariant = { kind: PhotoVariantKind; label: string; file: File };
export type PhotoVariantResult = {
  variants: PhotoVariant[];
  warning?: string;
};

/**
 * Remove a flat/near-uniform backdrop by flood-filling similarly colored
 * pixels that are connected to the image boundary. Never invent product
 * details or rely on a remote AI service. Works best on plain backgrounds;
 * photos with busy backgrounds must keep their original version.
 */
export function removeConnectedPlainBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 46,
): { pixels: Uint8ClampedArray; removedRatio: number; confident: boolean } {
  const pixelCount = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width <= 1 || height <= 1 || pixelCount > 1_600_000 ||
      rgba.length !== pixelCount * 4) {
    throw new ImageOptimizationError("Image dimensions are unsuitable for background cleaning.");
  }

  const corner = [0, width - 1, (height - 1) * width, pixelCount - 1];
  const matchSq = (a: number, b: number, threshold: number) => {
    const a4 = a * 4;
    const b4 = b * 4;
    const dr = rgba[a4]! - rgba[b4]!;
    const dg = rgba[a4 + 1]! - rgba[b4 + 1]!;
    const db = rgba[a4 + 2]! - rgba[b4 + 2]!;
    return dr * dr + dg * dg + db * db <= threshold * threshold * 3;
  };

  // At least two corners should agree. This limits false removal in busy photos.
  let chosen = -1;
  let best = 0;
  for (const idx of corner) {
    const agreeing = corner.filter(other => matchSq(idx, other, 25)).length;
    if (agreeing > best) { best = agreeing; chosen = idx; }
  }
  if (best < 2 || chosen < 0) {
    return { pixels: rgba, removedRatio: 0, confident: false };
  }
  const at = chosen * 4;
  const reference = [rgba[at]!, rgba[at + 1]!, rgba[at + 2]!];
  const threshold = Math.min(85, Math.max(15, tolerance));
  const thresholdSquared = threshold * threshold * 3;
  const nearBackdrop = (idx: number) => {
    const p = idx * 4;
    const dr = rgba[p]! - reference[0]!;
    const dg = rgba[p + 1]! - reference[1]!;
    const db = rgba[p + 2]! - reference[2]!;
    return dr * dr + dg * dg + db * db <= thresholdSquared;
  };

  // Queue is bounded to the raster size. Complexity O(width * height).
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = (idx: number) => {
    if (visited[idx] || !nearBackdrop(idx)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const idx = queue[head++]!;
    const x = idx % width;
    if (x > 0) enqueue(idx - 1);
    if (x + 1 < width) enqueue(idx + 1);
    if (idx >= width) enqueue(idx - width);
    if (idx + width < pixelCount) enqueue(idx + width);
  }

  const ratio = tail / pixelCount;
  // Too little separation or nearly the whole photo removed: do not alter it.
  if (ratio < 0.04 || ratio > 0.88) {
    return { pixels: rgba, removedRatio: ratio, confident: false };
  }

  const pixels = new Uint8ClampedArray(rgba);
  for (let i = 0; i < pixelCount; i++) {
    if (visited[i]) pixels[i * 4 + 3] = 0;
  }
  return { pixels, removedRatio: ratio, confident: true };
}

async function decodeFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(
        new ImageOptimizationError("The selected photo could not be decoded."),
      );
      image.src = objectUrl;
    });
    return image;
  } finally {
    // image bytes remain decoded in this image element for canvas drawing.
    URL.revokeObjectURL(objectUrl);
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new ImageOptimizationError("Could not prepare the preview.")),
      "image/png",
    );
  });
}

async function makeWhiteBackgroundSource(
  file: File,
  tolerance: number,
): Promise<File | null> {
  validateSourceImage(file);
  const image = await decodeFile(file);
  // Limit expensive segmentation to a reasonable browser-side raster.
  const scale = Math.min(1, 1050 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(2, Math.round(image.naturalWidth * scale));
  const height = Math.max(2, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new ImageOptimizationError("Your browser does not support photo editing.");
    ctx.drawImage(image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    const result = removeConnectedPlainBackground(data.data, width, height, tolerance);
    if (!result.confident) return null;
    data.data.set(result.pixels);
    ctx.putImageData(data, 0, 0);
    const blob = await toBlob(canvas);
    return new File([blob], "white-background-source.png", { type: "image/png" });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Opt-in ONLY for one selected photo. Multi-photo queue never calls this. */
export async function generateSinglePhotoVariants(
  file: File,
  frame: ProductImageFraming,
  tolerance = 46,
): Promise<PhotoVariantResult> {
  validateSourceImage(file);
  // Original remains intact. All 3 derivatives are produced only on demand.
  const standard = await frameProductPhoto(file, frame);
  const variants: PhotoVariant[] = [
    { kind: "standard", label: "Standard", file: standard },
  ];
  let warning: string | undefined;
  try {
    const cleaned = await makeWhiteBackgroundSource(file, tolerance);
    if (cleaned) {
      const result = await frameProductPhoto(cleaned, frame);
      variants.push({ kind: "white", label: "White Background", file: result });
    } else {
      warning = "A clean plain backdrop was not detected. White background is unavailable for this photo; keep Standard or use a photo with a simple backdrop.";
    }
  } catch {
    warning = "White background could not be prepared on this device. Your original photo is safe.";
  }

  // A close-up from the SAME camera photo, not a fake AI-generated angle.
  const closer = {
    ...frame,
    fit: "fill" as const,
    zoom: 1.1,
  };
  // Validate the prospective fit geometry using dimensions at export time.
  const closeup = await frameProductPhoto(file, closer);
  variants.push({ kind: "closeup", label: "Close-up", file: closeup });

  return { variants, warning };
}
