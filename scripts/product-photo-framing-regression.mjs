import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("src/lib/product-image-framing.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
const clientOptimizer = {
  ImageOptimizationError: class ImageOptimizationError extends Error {},
  MAX_OUTPUT_IMAGE_BYTES: 8 * 1024 * 1024,
  validateSourceImage() {},
};
runInNewContext(compiled, {
  module,
  exports: module.exports,
  require(specifier) {
    assert.equal(specifier, "@/lib/client-image-optimizer");
    return clientOptimizer;
  },
});
const { imageFrameGeometry, DEFAULT_PRODUCT_IMAGE_FRAMING } = module.exports;
assert.equal(typeof imageFrameGeometry, "function");

function approx(actual, expected, label) {
  assert(Math.abs(actual - expected) < 0.00001, `${label}: ${actual} ≠ ${expected}`);
}
// Tall product photo must never clip when merchant selects "Fit entire photo".
const tallFit = imageFrameGeometry(200, 800, DEFAULT_PRODUCT_IMAGE_FRAMING, 1200);
approx(tallFit.width, 300, "tall fit width");
approx(tallFit.height, 1200, "tall fit height");
approx(tallFit.x, 450, "tall fit centered");
approx(tallFit.y, 0, "tall fit no vertical crop");

// Fill intentionally crops but vertical position can reveal the top or bottom.
const tallTop = imageFrameGeometry(200, 800,
  { fit: "fill", zoom: 1, positionX: 50, positionY: 0 }, 1200);
const tallBottom = imageFrameGeometry(200, 800,
  { fit: "fill", zoom: 1, positionX: 50, positionY: 100 }, 1200);
approx(tallTop.y, 0, "fill anchored top");
approx(tallBottom.y, -3600, "fill anchored bottom");

const wideFit = imageFrameGeometry(1600, 800,
  DEFAULT_PRODUCT_IMAGE_FRAMING, 1200);
approx(wideFit.width, 1200, "wide fit width");
approx(wideFit.height, 600, "wide fit height");
approx(wideFit.y, 300, "wide fit centered");

const wideFill = imageFrameGeometry(1600, 800,
  { fit: "fill", zoom: 1, positionX: 0, positionY: 50 }, 1200);
approx(wideFill.x, 0, "wide fill anchored left");
approx(wideFill.width, 2400, "wide fill extra cropped sides");

const zoomed = imageFrameGeometry(200, 800,
  { fit: "fit", zoom: 2, positionX: 50, positionY: 50 }, 1200);
approx(zoomed.height, 2400, "zoom doubles photo height");
assert.throws(() => imageFrameGeometry(10000, 10000, DEFAULT_PRODUCT_IMAGE_FRAMING));

const products = read("src/app/dashboard/products/page.tsx");
const modal = read("src/components/shop-management/product-image-adjuster.tsx");
const cards = read("src/components/storefront/product-card.tsx");
assert(products.includes("onConfirm={uploadAdjustedPhoto}"), "confirmation required before upload");
assert(products.includes("setPendingPhotoUpload({ product, files, index: 0 })"), "multiple photo queue");
assert(modal.includes("Fit entire photo") && modal.includes("Fill & crop"), "two preview modes");
assert(modal.includes("Horizontal position") && modal.includes("Vertical position"), "position controls");
assert(modal.includes("frameProductPhoto(file, frame)"), "framed image must upload");
assert(!cards.includes('fit={product.imageSource === "actual" ? "contain" : "cover"}'),
  "existing catalog layout must retain original cover-style photos");
assert(cards.includes('className="aspect-square w-full transition-transform duration-500 ease-out group-hover:scale-[1.045]"'),
  "original square card and hover style must stay unchanged");
// Verify the optional, single-photo-only background cleanup on synthetic rasters.
const smartSource = read("src/lib/single-photo-variants.ts");
const smartCode = ts.transpileModule(smartSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const smartModule = { exports: {} };
runInNewContext(smartCode, {
  module: smartModule, exports: smartModule.exports,
  require(specifier) {
    if (specifier === "@/lib/client-image-optimizer") return clientOptimizer;
    if (specifier === "@/lib/product-image-framing") {
      return { frameProductPhoto: async () => { throw Error("not called by raster test"); } };
    }
    throw Error(`Unexpected imported module: ${specifier}`);
  },
  Uint8ClampedArray, Uint8Array, Uint32Array, ImageData: undefined,
});
const { removeConnectedPlainBackground } = smartModule.exports;
const w = 8, h = 8;
const sourcePixels = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const idx = (y * w + x) * 4;
    const subject = x >= 2 && x <= 5 && y >= 2 && y <= 5;
    sourcePixels.set(subject ? [200, 20, 20, 255] : [30, 90, 210, 255], idx);
  }
}
const cleaned = removeConnectedPlainBackground(sourcePixels, w, h);
assert.equal(cleaned.confident, true, "flat blue background should be removable");
assert.equal(cleaned.pixels[3], 0, "outer blue background should become transparent");
assert.equal(cleaned.pixels[(3 * w + 3) * 4 + 3], 255, "red subject must remain");
assert.equal(sourcePixels[3], 255, "original image must not be mutated");
const busyPixels = new Uint8ClampedArray(sourcePixels);
for (const [idx, rgb] of [
  [0, [250, 0, 0]], [w - 1, [0, 250, 0]],
  [(h - 1) * w, [0, 0, 250]], [w * h - 1, [250, 250, 0]],
]) {
  busyPixels.set([...rgb, 255], idx * 4);
}
assert.equal(removeConnectedPlainBackground(busyPixels, w, h).confident, false,
  "mixed corner colors must not be removed blindly");

const smartUI = read("src/components/shop-management/product-image-adjuster.tsx");
assert(smartUI.includes("total === 1 && onConfirmVariants !== undefined"),
  "automatic variants must be limited to a single selected photo");
assert(smartUI.includes("Preview white background & variants") &&
  smartUI.includes("selectedKinds.includes(variant.kind)"),
  "explicit preview and selection must precede upload");
assert(smartUI.includes("onConfirmVariants(files)"),
  "upload only the selected final variants");

assert(products.includes("onConfirmVariants={pendingPhotoUpload.files.length === 1 ? uploadEnhancedVariants : undefined}"),
  "multiple-photo uploads must keep the original adjuster flow");
assert(products.includes("for (const [index, file] of files.entries())"),
  "variants must each pass the existing upload and quota flow");

console.log("Product photo fitting, background cleaning, and upload contracts OK");
