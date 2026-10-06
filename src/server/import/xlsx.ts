import "server-only";

import { inflateRawSync } from "node:zlib";

import { AppError } from "@/server/http/app-error";

export const PRODUCT_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UNCOMPRESSED_ENTRY_BYTES = 20 * 1024 * 1024;

export const PRODUCT_IMPORT_HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Product Group",
  "Price",
  "Price Type",
  "Discount Price",
  "Description",
  "Availability",
  "Featured",
  "New Arrival",
] as const;

export type WorkbookRow = {
  rowNumber: number;
  values: string[];
};

function workbookError(message: string): never {
  throw new AppError({
    code: "INVALID_EXCEL_FILE",
    message,
    status: 400,
  });
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function attribute(source: string, name: string): string | null {
  const match = source.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match ? decodeXml(match[1] ?? "") : null;
}

function normalizeZipPath(path: string): string {
  const normalized: string[] = [];

  for (const part of path.replace(/\\/g, "/").replace(/^\/+/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }

  return normalized.join("/");
}

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function readZipDirectory(buffer: Buffer): Map<string, ZipEntry> {
  if (buffer.length > PRODUCT_IMPORT_MAX_FILE_BYTES) {
    workbookError("Excel file must be 5 MiB or smaller");
  }

  const eocdSignature = 0x06054b50;
  const minimumEocdSize = 22;
  const searchStart = Math.max(0, buffer.length - 65_557);
  let eocdOffset = -1;

  for (let offset = buffer.length - minimumEocdSize; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) workbookError("The uploaded file is not a supported .xlsx workbook");

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (totalEntries === 0xffff || centralDirectoryOffset === 0xffffffff) {
    workbookError("ZIP64 Excel workbooks are not supported");
  }

  const entries = new Map<string, ZipEntry>();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      workbookError("Excel workbook ZIP directory is invalid");
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd > buffer.length) workbookError("Excel workbook ZIP entry is invalid");

    const name = normalizeZipPath(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    entries.set(name, {
      name,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  if (entry.uncompressedSize > MAX_UNCOMPRESSED_ENTRY_BYTES) {
    workbookError("Excel workbook contains an entry that is too large");
  }

  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    workbookError("Excel workbook ZIP local header is invalid");
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;

  if (dataEnd > buffer.length) workbookError("Excel workbook ZIP data is incomplete");

  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compression === 0) return Buffer.from(compressed);
  if (entry.compression === 8) {
    try {
      return inflateRawSync(compressed);
    } catch {
      workbookError("Excel workbook contains invalid compressed data");
    }
  }

  workbookError("Excel workbook uses an unsupported ZIP compression method");
}

function xmlEntry(buffer: Buffer, entries: Map<string, ZipEntry>, path: string): string {
  const normalized = normalizeZipPath(path);
  const entry = entries.get(normalized);
  if (!entry) workbookError(`Excel workbook is missing ${normalized}`);
  return readZipEntry(buffer, entry).toString("utf8");
}

function optionalXmlEntry(
  buffer: Buffer,
  entries: Map<string, ZipEntry>,
  path: string,
): string | null {
  const entry = entries.get(normalizeZipPath(path));
  return entry ? readZipEntry(buffer, entry).toString("utf8") : null;
}

function workbookSheetPath(buffer: Buffer, entries: Map<string, ZipEntry>): string {
  const workbookXml = xmlEntry(buffer, entries, "xl/workbook.xml");
  const sheetsMatch = workbookXml.match(/<sheet\b([^>]*)\/?\s*>/i);
  if (!sheetsMatch) workbookError("Excel workbook does not contain a worksheet");

  const relationshipId = attribute(sheetsMatch[1] ?? "", "r:id");
  if (!relationshipId) workbookError("Excel workbook worksheet relationship is invalid");

  const relationsXml = xmlEntry(buffer, entries, "xl/_rels/workbook.xml.rels");
  const relationMatches = relationsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi);

  for (const match of relationMatches) {
    const attrs = match[1] ?? "";
    if (attribute(attrs, "Id") !== relationshipId) continue;

    const target = attribute(attrs, "Target");
    if (!target) break;

    return normalizeZipPath(target.startsWith("/") ? target : `xl/${target}`);
  }

  workbookError("Excel workbook worksheet target was not found");
}

function sharedStrings(buffer: Buffer, entries: Map<string, ZipEntry>): string[] {
  const xml = optionalXmlEntry(buffer, entries, "xl/sharedStrings.xml");
  if (!xml) return [];

  const result: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)) {
    const body = match[1] ?? "";
    const text = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((part) => decodeXml(part[1] ?? ""))
      .join("");
    result.push(text);
  }

  return result;
}

function columnIndex(cellReference: string): number {
  const letters = cellReference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;

  let result = 0;
  for (const letter of letters) {
    result = result * 26 + (letter.charCodeAt(0) - 64);
  }

  return result - 1;
}

function cellValue(attributes: string, body: string, strings: string[]): string {
  const type = attribute(attributes, "t");

  if (type === "inlineStr") {
    return [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((match) => decodeXml(match[1] ?? ""))
      .join("");
  }

  const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] ?? "";
  const decoded = decodeXml(raw);

  if (type === "s") {
    const index = Number.parseInt(decoded, 10);
    return Number.isInteger(index) ? strings[index] ?? "" : "";
  }

  if (type === "b") return decoded === "1" ? "TRUE" : "FALSE";
  return decoded;
}

export function parseFirstWorksheet(buffer: Buffer): WorkbookRow[] {
  const entries = readZipDirectory(buffer);
  const worksheetPath = workbookSheetPath(buffer, entries);
  const worksheetXml = xmlEntry(buffer, entries, worksheetPath);
  const strings = sharedStrings(buffer, entries);
  const rows: WorkbookRow[] = [];

  for (const rowMatch of worksheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi)) {
    const rowAttributes = rowMatch[1] ?? "";
    const rowBody = rowMatch[2] ?? "";
    const explicitRowNumber = Number.parseInt(attribute(rowAttributes, "r") ?? "", 10);
    const values: string[] = [];
    let inferredColumn = 0;

    for (const cellMatch of rowBody.matchAll(
      /<c\b([^>]*?)\s*\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/gi,
    )) {
      const cellAttributes = cellMatch[1] ?? cellMatch[2] ?? "";
      const cellBody = cellMatch[3] ?? "";
      const reference = attribute(cellAttributes, "r");
      const index = reference ? columnIndex(reference) : inferredColumn;
      if (index < 0) continue;

      values[index] = cellValue(cellAttributes, cellBody, strings).trim();
      inferredColumn = index + 1;
    }

    if (values.some((value) => Boolean(value?.trim()))) {
      rows.push({
        rowNumber: Number.isInteger(explicitRowNumber) ? explicitRowNumber : rows.length + 1,
        values,
      });
    }
  }

  return rows;
}

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date: Date): { date: number; time: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function buildZip(files: Array<{ name: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  const stamp = dosTimestamp(new Date());

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);

    centralParts.push(central, name);
    localOffset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function inlineCell(reference: string, value: string): string {
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function columnName(index: number): string {
  let column = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

const PRODUCT_WORKBOOK_HEADERS = [
  "Product Name",
  "SKU / Product Code (Optional)",
  "Category",
  "Product Group / Type",
  "Price",
  "Price Type",
  "Discount Price",
  "Description",
  "Availability",
  "Featured",
  "New Arrival",
] as const;

export type ProductWorkbookRow = {
  name: string;
  sku: string | null;
  category: string | null;
  catalogGroup: string | null;
  price: string | null;
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  discountPrice: string | null;
  description: string | null;
  availabilityStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";
  isFeatured: boolean;
  isNewArrival: boolean;
};

function priceTypeLabel(value: ProductWorkbookRow["priceType"]): string {
  if (value === "STARTING_FROM") return "Starting From";
  if (value === "ASK_PRICE") return "Ask Price";
  return "Fixed";
}

function availabilityLabel(value: ProductWorkbookRow["availabilityStatus"]): string {
  if (value === "OUT_OF_STOCK") return "Out of Stock";
  if (value === "ON_REQUEST") return "On Request";
  return "In Stock";
}

function workbookRowValues(row: ProductWorkbookRow): string[] {
  return [
    row.name,
    row.sku ?? "",
    row.category ?? "",
    row.catalogGroup ?? "",
    row.price ?? "",
    priceTypeLabel(row.priceType),
    row.discountPrice ?? "",
    row.description ?? "",
    availabilityLabel(row.availabilityStatus),
    row.isFeatured ? "Yes" : "No",
    row.isNewArrival ? "Yes" : "No",
  ];
}

function buildProductWorkbook(rows: ProductWorkbookRow[], sheetName = "Products"): Buffer {
  const headerCells = PRODUCT_WORKBOOK_HEADERS.map((header, index) =>
    inlineCell(`${columnName(index)}1`, header),
  ).join("");

  const dataRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = workbookRowValues(row)
        .map((value, columnIndex) =>
          inlineCell(`${columnName(columnIndex)}${excelRow}`, value),
        )
        .join("");
      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join("");

  const lastRow = Math.max(1, rows.length + 1);
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:K${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="30" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="4" width="22" customWidth="1"/>
    <col min="5" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="42" customWidth="1"/>
    <col min="9" max="11" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  <autoFilter ref="A1:K${lastRow}"/>
</worksheet>`;

  return buildZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
  ]);
}

export function buildProductImportTemplate(): Buffer {
  return buildProductWorkbook([]);
}

export function buildProductExportWorkbook(rows: ProductWorkbookRow[]): Buffer {
  return buildProductWorkbook(rows, "Current Products");
}
