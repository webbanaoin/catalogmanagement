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
assert(cards.includes('fit={product.imageSource === "actual" ? "contain" : "cover"}'),
  "existing product images should not crop in catalog cards");
console.log("Product photo fitting, cropping, and upload contracts OK");
