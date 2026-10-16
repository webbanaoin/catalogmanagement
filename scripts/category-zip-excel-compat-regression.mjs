// Regression for valid namespace-prefixed XLSX and bulk category ZIP handling.
// Runs without access to a live database and without adding ZIP dependencies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { Blob, File } from "node:buffer";
import vm from "node:vm";
import ts from "typescript";

function moduleFromTypescript(path, customImports = {}) {
  const source = readFileSync(path, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  const exports = {};
  const sandbox = {
    exports, Buffer, Blob, File, Response, DecompressionStream,
    Uint8Array, DataView, TextDecoder, ArrayBuffer, Error, Map, Set,
    require(name) {
      if (name === "server-only") return {};
      if (name === "node:zlib") return { inflateRawSync };
      if (name === "@/server/http/app-error") return {
        AppError: class AppError extends Error { constructor(args) { super(args.message); } },
      };
      if (customImports[name]) return customImports[name];
      throw new Error("Unexpected test import: " + name);
    },
  };
  vm.runInNewContext(js, sandbox, { filename: path });
  return exports;
}

function crc32(input) {
  let crc = 0xffffffff;
  for (const b of input) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = Buffer.from(name);
    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, content);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + content.length;
  }
  const centralBytes = Buffer.concat(centralParts);
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(entries.length, 8);
  footer.writeUInt16LE(entries.length, 10);
  footer.writeUInt32LE(centralBytes.length, 12);
  footer.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBytes, footer]);
}
const xlsx = buildStoredZip([
  ["xl/workbook.xml", '<x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><x:sheets><x:sheet name="Products" sheetId="1" r:id="rId1"/></x:sheets></x:workbook>'],
  ["xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml" /></Relationships>'],
  ["xl/worksheets/sheet1.xml", '<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="1"><x:c r="A1" t="str"><x:v>Product Name</x:v></x:c><x:c r="B1" t="str"><x:v>Category</x:v></x:c></x:row><x:row r="2"><x:c r="A2" t="inlineStr"><x:is><x:t>Classic Teddy Bear</x:t></x:is></x:c><x:c r="B2" t="str"><x:v>Soft Toys</x:v></x:c></x:row></x:sheetData></x:worksheet>'],
]);
const { parseFirstWorksheet } = moduleFromTypescript("src/server/import/xlsx.ts");
const rows = parseFirstWorksheet(xlsx);
assert.equal(rows.length, 2);
assert.deepEqual(Array.from(rows[0].values).slice(0, 2), ["Product Name", "Category"]);
assert.deepEqual(Array.from(rows[1].values).slice(0, 2), ["Classic Teddy Bear", "Soft Toys"]);

const { extractCategoryImages } = moduleFromTypescript("src/lib/category-image-zip.ts");
const sampleZip = buildStoredZip([
  ["Images/01_soft-toys.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
  ["Images/09_office-stationery.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
  ["Images/00_gift-toys-stationery_hero.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
  ["README.txt", "Not an image"],
]);
const files = await extractCategoryImages(new File([sampleZip], "category-images.zip"));
assert.equal(files.length, 3);
assert.equal(files[0].categorySlug, "soft-toys");
assert.equal(files[1].categorySlug, "office-stationery");
assert.equal(files[2].categorySlug, "gift-toys-stationery-hero");
assert.equal(files[0].file.size, 4);
await assert.rejects(
  extractCategoryImages(new File([buildStoredZip([["../01_soft-toys.jpg", Buffer.from([1])]])], "unsafe.zip")),
  /unsafe file path/,
);
console.log("PASS: prefixed Excel worksheet parser and category ZIP matching/safety");
