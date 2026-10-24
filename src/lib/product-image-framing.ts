import {
  ImageOptimizationError,
  MAX_OUTPUT_IMAGE_BYTES,
  validateSourceImage,
} from "@/lib/client-image-optimizer";

export type ProductImageFit = "fit" | "fill";

export interface ProductImageFraming {
  fit: ProductImageFit;
  zoom: number;
  positionX: number;
  positionY: number;
}

export const DEFAULT_PRODUCT_IMAGE_FRAMING: ProductImageFraming = {
  fit: "fit",
  zoom: 1,
  positionX: 50,
  positionY: 50,
};

export const PRODUCT_IMAGE_FRAME_SIZE = 1200;

const MAX_PIXELS = 45_000_000;
const MAX_EDGE = 20_000;

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

/**
 * Identical geometry is used in the merchant's preview and exported square.
 * Fit shows the entire source, with a white background if needed; Fill crops
 * its edges. Zoom and horizontal/vertical positions are optional.
 */
export function imageFrameGeometry(
  width: number,
  height: number,
  frame: ProductImageFraming,
  size = PRODUCT_IMAGE_FRAME_SIZE,
) {
  if (
    !Number.isFinite(width) || !Number.isFinite(height) ||
    width <= 0 || height <= 0 || width > MAX_EDGE ||
    height > MAX_EDGE || width * height > MAX_PIXELS
  ) {
    throw new ImageOptimizationError(
      "This photo is too large to process safely. Please reduce its dimensions.",
    );
  }

  const baseScale = frame.fit === "fill"
    ? Math.max(size / width, size / height)
    : Math.min(size / width, size / height);
  const scale = baseScale * clamp(frame.zoom, 1, 3);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  return {
    x: (size - drawWidth) * clamp(frame.positionX, 0, 100) / 100,
    y: (size - drawHeight) * clamp(frame.positionY, 0, 100) / 100,
    width: drawWidth,
    height: drawHeight,
  };
}

function decodedPhoto(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageOptimizationError("Could not read this photo. Use JPG, PNG or WebP."));
    };
    image.src = url;
  });
}

/** Creates a new, framed file before the existing R2/thumbnail upload flow. */
export async function frameProductPhoto(
  original: File,
  framing: ProductImageFraming,
): Promise<File> {
  validateSourceImage(original);
  if (typeof document === "undefined") {
    throw new ImageOptimizationError("Photo adjustment requires a browser.");
  }

  const { image, url } = await decodedPhoto(original);
  const canvas = document.createElement("canvas");
  canvas.width = PRODUCT_IMAGE_FRAME_SIZE;
  canvas.height = PRODUCT_IMAGE_FRAME_SIZE;
  try {
    const geometry = imageFrameGeometry(
      image.naturalWidth, image.naturalHeight, framing,
    );
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new ImageOptimizationError("Photo adjustment is unavailable on this device.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image, geometry.x, geometry.y, geometry.width, geometry.height,
    );

    const webp = await new Promise<Blob | null>(
      (resolve) => canvas.toBlob(resolve, "image/webp", 0.86),
    );
    const blob = webp?.type === "image/webp"
      ? webp
      : await new Promise<Blob | null>(
          (resolve) => canvas.toBlob(resolve, "image/png"),
        );

    if (!blob || !blob.size) {
      throw new ImageOptimizationError("Could not prepare the adjusted photo.");
    }
    if (blob.size > MAX_OUTPUT_IMAGE_BYTES) {
      throw new ImageOptimizationError("Adjusted photo is too large. Try another photo.");
    }

    const safeName = original.name.replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 70) || "photo";
    return new File([blob], `${safeName}-adjusted.${blob.type === "image/webp" ? "webp" : "png"}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    URL.revokeObjectURL(url);
  }
}
