/**
 * Browser-side optimisation before obtaining an R2 presigned upload URL.
 * Never uploads the original camera file. R2 still validates the 8 MB *output*
 * payload, and existing stored images are unaffected.
 */
export type ImageUse = "product" | "thumbnail" | "logo" | "cover" | "category";

export const MAX_SOURCE_IMAGE_BYTES = 100 * 1024 * 1024;
export const MAX_OUTPUT_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DECODED_PIXELS = 45_000_000;
const MAX_SOURCE_EDGE = 20_000;
export const SUPPORTED_SOURCE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const imageSizes: Record<ImageUse, { maxEdge: number; quality: number }> = {
  product: { maxEdge: 1400, quality: 0.83 },
  thumbnail: { maxEdge: 480, quality: 0.75 },
  logo: { maxEdge: 600, quality: 0.86 },
  cover: { maxEdge: 1600, quality: 0.8 },
  category: { maxEdge: 720, quality: 0.78 },
};

export class ImageOptimizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageOptimizationError";
  }
}

export function validateSourceImage(file: File): void {
  if (!SUPPORTED_SOURCE_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_SOURCE_IMAGE_TYPES)[number])) {
    throw new ImageOptimizationError("Please select a JPG, PNG or WebP image. HEIC/other formats must be converted to JPG first.");
  }
  if (!file.size) throw new ImageOptimizationError("This image is empty. Select another file.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ImageOptimizationError(
      "This original image exceeds 100 MB. Please reduce its size before uploading to protect your device's memory.",
    );
  }
}

type SourceBitmap = { width: number; height: number; draw: CanvasImageSource; dispose: () => void };

async function decode(file: File): Promise<SourceBitmap> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bitmap.width, height: bitmap.height, draw: bitmap, dispose: () => bitmap.close() };
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unsupported or corrupt image"));
      image.src = objectUrl;
    });
    return { width: image.naturalWidth, height: image.naturalHeight, draw: image, dispose: () => {} };
  } catch {
    throw new ImageOptimizationError("Could not read this image. Try JPG or WebP instead.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function exportImage(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (output?.type === "image/webp") return output;
  // Preserve transparent logos on browsers that lack canvas WebP encoding.
  const fallback = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!fallback) throw new ImageOptimizationError("Image conversion failed in this browser.");
  return fallback;
}

function outputName(name: string, kind: ImageUse, mimeType: string): string {
  const safe = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80) || "image";
  return `${safe}-${kind}.${mimeType === "image/webp" ? "webp" : "png"}`;
}

/** Processes all derivatives from one decoded source, minimizing mobile memory use. */
export async function optimizeImageForUpload(
  original: File,
  types: readonly ImageUse[],
): Promise<Record<ImageUse, File>> {
  validateSourceImage(original);
  if (typeof document === "undefined") throw new ImageOptimizationError("Image optimisation requires a browser.");
  let source: SourceBitmap;
  try {
    source = await decode(original);
  } catch {
    throw new ImageOptimizationError("The browser could not decode the selected photo. Use JPG, PNG or WebP.");
  }
  try {
    const { width, height } = source;
    if (
      width < 1 || height < 1 || width > MAX_SOURCE_EDGE ||
      height > MAX_SOURCE_EDGE || width * height > MAX_DECODED_PIXELS
    ) {
      throw new ImageOptimizationError(
        "This photo is too large to process safely on this device. Please reduce its dimensions and try again.",
      );
    }
    const results = {} as Record<ImageUse, File>;
    for (const kind of types) {
      const { maxEdge, quality } = imageSizes[kind];
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      try {
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new ImageOptimizationError("Unable to optimise images on this device.");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source.draw, 0, 0, canvas.width, canvas.height);
        const blob = await exportImage(canvas, quality);
        if (blob.size > MAX_OUTPUT_IMAGE_BYTES) {
          throw new ImageOptimizationError("Converted image is too large. Try a different photo.");
        }
        results[kind] = new File([blob], outputName(original.name, kind, blob.type), {
          type: blob.type,
          lastModified: Date.now(),
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    return results;
  } finally {
    source.dispose();
  }
}
