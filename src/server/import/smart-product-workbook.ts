import "server-only";

import type { CatalogAttributePreset, CatalogPreset } from "@/lib/catalog-presets";

export interface SmartWorkbookCategory {
  name: string;
}

export interface SmartWorkbookConfig {
  shopName: string;
  businessCategoryName: string | null;
  showProductPrices: boolean;
  categories: SmartWorkbookCategory[];
  preset: CatalogPreset;
}

export interface SmartWorkbookProductRow {
  name: string;
  sku: string | null;
  category: string | null;
  catalogGroup: string | null;
  price: string | null;
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  discountPrice: string | null;
  description: string | null;
  availabilityStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_REQUEST";
  showPrice: boolean | null;
  isVisible: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  attributes: Array<{ name: string; value: string }>;
}

const DATA_ROWS = 1000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellRef(columnIndex: number, row: number): string {
  let column = "";
  let value = columnIndex + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }
  return `${column}${row}`;
}

function inlineCell(
  columnIndex: number,
  row: number,
  value: string,
  style = 0,
): string {
  return `<c r="${cellRef(columnIndex, row)}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function normalizedName(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1");
}

function priceTypeLabel(value: SmartWorkbookProductRow["priceType"]): string {
  if (value === "STARTING_FROM") return "Starting From";
  if (value === "ASK_PRICE") return "Ask Price";
  return "Fixed";
}

function availabilityLabel(
  value: SmartWorkbookProductRow["availabilityStatus"],
): string {
  if (value === "OUT_OF_STOCK") return "Out of Stock";
  if (value === "ON_REQUEST") return "On Request";
  return "In Stock";
}

function priceVisibilityLabel(value: boolean | null): string {
  if (value === true) return "Show";
  if (value === false) return "Hide";
  return "Use Shop Setting";
}

function boolLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function attributeValue(
  row: SmartWorkbookProductRow,
  attributeName: string,
): string {
  return (
    row.attributes.find((attribute) => attribute.name === attributeName)?.value ??
    ""
  );
}

function presetDefaultPriceType(preset: CatalogPreset): string {
  return preset.key === "jewellery" ? "Ask Price" : "Fixed";
}

function baseHeaders(config: SmartWorkbookConfig): string[] {
  return [
    "Product Name",
    "SKU / Product Code (Optional)",
    "Category",
    config.preset.groupLabel,
    "Price",
    "Price Type",
    "Discount Price",
    "Description",
    "Availability",
    "Price Visibility",
    "Visible",
    "Featured",
    "New Arrival",
    "Offer",
  ];
}

function defaultSettings(config: SmartWorkbookConfig) {
  const settings: Array<{
    key: string;
    label: string;
    value: string;
    validation?: string;
    attribute?: CatalogAttributePreset;
  }> = [
    {
      key: "category",
      label: "Default Category",
      value: "",
      validation: "CategoryList",
    },
    {
      key: "group",
      label: `Default ${config.preset.groupLabel}`,
      value: "",
      validation: config.preset.groups.length ? "ProductGroupList" : undefined,
    },
    {
      key: "priceType",
      label: "Default Price Type",
      value: presetDefaultPriceType(config.preset),
      validation: "PriceTypeList",
    },
    {
      key: "availability",
      label: "Default Availability",
      value: "In Stock",
      validation: "AvailabilityList",
    },
    {
      key: "priceVisibility",
      label: "Default Price Visibility",
      value: "Use Shop Setting",
      validation: "PriceVisibilityList",
    },
    {
      key: "visible",
      label: "Default Visible",
      value: "Yes",
      validation: "YesNoList",
    },
    {
      key: "featured",
      label: "Default Featured",
      value: "No",
      validation: "YesNoList",
    },
    {
      key: "newArrival",
      label: "Default New Arrival",
      value: "No",
      validation: "YesNoList",
    },
    {
      key: "offer",
      label: "Default Offer",
      value: "No",
      validation: "YesNoList",
    },
  ];

  for (const attribute of config.preset.attributes) {
    settings.push({
      key: `attribute:${attribute.name}`,
      label: `Default ${attribute.label}`,
      value: "",
      attribute,
    });
  }

  return settings;
}

function productRowValues(
  config: SmartWorkbookConfig,
  row: SmartWorkbookProductRow,
): string[] {
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
    priceVisibilityLabel(row.showPrice),
    boolLabel(row.isVisible),
    boolLabel(row.isFeatured),
    boolLabel(row.isNewArrival),
    boolLabel(row.isOffer),
    ...config.preset.attributes.map((attribute) =>
      attributeValue(row, attribute.name),
    ),
  ];
}

type ListColumn = {
  title: string;
  values: string[];
  definedName: string;
};

function listColumns(config: SmartWorkbookConfig): {
  columns: ListColumn[];
  dependentAttributeNames: Map<string, Map<string, string>>;
  simpleAttributeNames: Map<string, string>;
} {
  const columns: ListColumn[] = [];
  const dependentAttributeNames = new Map<string, Map<string, string>>();
  const simpleAttributeNames = new Map<string, string>();

  const add = (title: string, values: string[], definedName: string) => {
    columns.push({
      title,
      values: values.length ? values : [""],
      definedName: normalizedName(definedName),
    });
    return normalizedName(definedName);
  };

  add(
    "Categories",
    config.categories.map((category) => category.name),
    "CategoryList",
  );
  add(config.preset.groupLabel, config.preset.groups, "ProductGroupList");
  add("Price Type", ["Fixed", "Starting From", "Ask Price"], "PriceTypeList");
  add(
    "Availability",
    ["In Stock", "Out of Stock", "On Request"],
    "AvailabilityList",
  );
  add(
    "Price Visibility",
    ["Use Shop Setting", "Show", "Hide"],
    "PriceVisibilityList",
  );
  add("Yes / No", ["Yes", "No"], "YesNoList");

  for (const attribute of config.preset.attributes) {
    if (attribute.optionsByGroup) {
      const groupMap = new Map<string, string>();
      for (const group of config.preset.groups) {
        const definedName = add(
          `${attribute.label} - ${group}`,
          attribute.optionsByGroup[group] ?? [],
          `Attr_${attribute.name}_${group}`,
        );
        groupMap.set(group, definedName);
      }
      dependentAttributeNames.set(attribute.name, groupMap);
    } else if (attribute.options?.length) {
      const definedName = add(
        attribute.label,
        attribute.options,
        `Attr_${attribute.name}`,
      );
      simpleAttributeNames.set(attribute.name, definedName);
    }
  }

  return { columns, dependentAttributeNames, simpleAttributeNames };
}

function dependentFormula(
  attributeName: string,
  groupCell: string,
): string {
  const prefix = normalizedName(`Attr_${attributeName}_`);
  return `INDIRECT("${prefix}"&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${groupCell}," ","_"),"/","_"),"&","_"))`;
}

function dataValidation(
  formula: string,
  range: string,
  error = "Select a value from the list.",
): string {
  return `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Invalid value" error="${escapeXml(error)}" sqref="${range}"><formula1>${escapeXml(formula)}</formula1></dataValidation>`;
}

function productsWorksheet(
  config: SmartWorkbookConfig,
  rows: SmartWorkbookProductRow[],
): {
  xml: string;
  headerRow: number;
} {
  const headers = [
    ...baseHeaders(config),
    ...config.preset.attributes.map((attribute) => attribute.label),
  ];
  const settings = defaultSettings(config);
  const headerRow = 7;
  const firstDataRow = headerRow + 1;
  const lastDataRow = firstDataRow + DATA_ROWS - 1;
  const lastColumn = headers.length - 1;

  const settingCells = new Map(
    settings.map((setting, index) => [setting.key, cellRef(index, 5)]),
  );

  const sheetRows: string[] = [];
  sheetRows.push(
    `<row r="1" ht="28" customHeight="1">${inlineCell(0, 1, `Smart Product Import - ${config.shopName}`, 1)}</row>`,
  );
  sheetRows.push(
    `<row r="2">${inlineCell(
      0,
      2,
      `Business type: ${config.businessCategoryName ?? "General"} | Set common values once below. Product-row blanks inherit these defaults.`,
      2,
    )}</row>`,
  );
  sheetRows.push(
    `<row r="3" ht="22" customHeight="1">${inlineCell(0, 3, "QUICK DEFAULTS - set once for the whole upload", 3)}</row>`,
  );

  sheetRows.push(
    `<row r="4" ht="28" customHeight="1">${settings
      .map((setting, index) => inlineCell(index, 4, setting.label, 4))
      .join("")}</row>`,
  );
  sheetRows.push(
    `<row r="5" ht="24" customHeight="1">${settings
      .map((setting, index) => inlineCell(index, 5, setting.value, 6))
      .join("")}</row>`,
  );
  sheetRows.push(
    `<row r="6" ht="22" customHeight="1">${inlineCell(
      0,
      6,
      "PRODUCTS - add one product per row below. Product Name is required; SKU and Price are optional.",
      3,
    )}</row>`,
  );

  const headerCells = headers
    .map((header, index) => inlineCell(index, headerRow, header, 7))
    .join("");
  sheetRows.push(
    `<row r="${headerRow}" ht="32" customHeight="1">${headerCells}</row>`,
  );

  for (const [rowIndex, row] of rows.entries()) {
    const excelRow = firstDataRow + rowIndex;
    const values = productRowValues(config, row);
    sheetRows.push(
      `<row r="${excelRow}">${values
        .map((value, columnIndex) =>
          inlineCell(columnIndex, excelRow, value, 0),
        )
        .join("")}</row>`,
    );
  }

  const lists = listColumns(config);
  const validations: string[] = [];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const addColumnValidation = (header: string, formula: string) => {
    const index = headerIndex.get(header);
    if (index == null) return;
    validations.push(
      dataValidation(
        formula,
        `${cellRef(index, firstDataRow)}:${cellRef(index, lastDataRow)}`,
      ),
    );
  };

  addColumnValidation("Category", "CategoryList");
  if (config.preset.groups.length) {
    addColumnValidation(config.preset.groupLabel, "ProductGroupList");
  }
  addColumnValidation("Price Type", "PriceTypeList");
  addColumnValidation("Availability", "AvailabilityList");
  addColumnValidation("Price Visibility", "PriceVisibilityList");
  for (const header of ["Visible", "Featured", "New Arrival", "Offer"]) {
    addColumnValidation(header, "YesNoList");
  }

  const topListValidations = new Map<string, string>([
    ["category", "CategoryList"],
    ["group", "ProductGroupList"],
    ["priceType", "PriceTypeList"],
    ["availability", "AvailabilityList"],
    ["priceVisibility", "PriceVisibilityList"],
    ["visible", "YesNoList"],
    ["featured", "YesNoList"],
    ["newArrival", "YesNoList"],
    ["offer", "YesNoList"],
  ]);

  for (const [key, listName] of topListValidations) {
    const ref = settingCells.get(key);
    if (!ref) continue;
    if (key === "group" && config.preset.groups.length === 0) continue;
    validations.push(dataValidation(listName, ref));
  }

  const groupColumnIndex = headerIndex.get(config.preset.groupLabel) ?? 3;
  const groupColumnName = cellRef(groupColumnIndex, firstDataRow).replace(/\d+$/, "");
  const defaultGroupCell = settingCells.get("group")
    ? `$${settingCells.get("group")!.replace(/\d+/, "")}$${settingCells.get("group")!.match(/\d+/)?.[0]}`
    : '""';

  for (const attribute of config.preset.attributes) {
    const attributeColumnIndex = headerIndex.get(attribute.label);
    if (attributeColumnIndex == null) continue;

    const settingCell = settingCells.get(`attribute:${attribute.name}`);
    const simpleList = lists.simpleAttributeNames.get(attribute.name);
    const dependentLists = lists.dependentAttributeNames.get(attribute.name);

    if (simpleList) {
      validations.push(
        dataValidation(
          simpleList,
          `${cellRef(attributeColumnIndex, firstDataRow)}:${cellRef(attributeColumnIndex, lastDataRow)}`,
        ),
      );
      if (settingCell) {
        validations.push(dataValidation(simpleList, settingCell));
      }
    } else if (dependentLists && settingCell && settingCells.get("group")) {
      const firstGroupCell = `$${groupColumnName}${firstDataRow}`;
      const groupExpression = `IF(${firstGroupCell}="",${defaultGroupCell},${firstGroupCell})`;
      validations.push(
        dataValidation(
          dependentFormula(attribute.name, groupExpression),
          `${cellRef(attributeColumnIndex, firstDataRow)}:${cellRef(attributeColumnIndex, lastDataRow)}`,
          `Select a ${attribute.label} valid for the selected ${config.preset.groupLabel}.`,
        ),
      );
      validations.push(
        dataValidation(
          dependentFormula(attribute.name, defaultGroupCell),
          settingCell,
        ),
      );
    }
  }

  const validationXml = validations.length
    ? `<dataValidations count="${validations.length}">${validations.join("")}</dataValidations>`
    : "";

  const widthColumns = headers
    .map((header, index) => {
      const width =
        index === 0
          ? 30
          : header === "Description"
            ? 42
            : header.includes("Code")
              ? 26
              : 18;
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  return {
    headerRow,
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${cellRef(lastColumn, Math.max(lastDataRow, headerRow))}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="${headerRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A${firstDataRow}" sqref="A${firstDataRow}"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${widthColumns}</cols>
  <sheetData>${sheetRows.join("")}</sheetData>
  <mergeCells count="4">
    <mergeCell ref="A1:${cellRef(lastColumn, 1)}"/>
    <mergeCell ref="A2:${cellRef(lastColumn, 2)}"/>
    <mergeCell ref="A3:${cellRef(lastColumn, 3)}"/>
    <mergeCell ref="A6:${cellRef(lastColumn, 6)}"/>
  </mergeCells>
  <autoFilter ref="A${headerRow}:${cellRef(lastColumn, headerRow)}"/>
  ${validationXml}
</worksheet>`,
  };
}

function listsWorksheet(config: SmartWorkbookConfig): {
  xml: string;
  definedNames: Array<{ name: string; formula: string }>;
} {
  const { columns } = listColumns(config);
  const listStartRow = 10;
  const rows: string[] = [];

  rows.push(
    `<row r="1">${inlineCell(0, 1, "Lists & Help", 1)}</row>`,
    `<row r="2">${inlineCell(0, 2, "Use the Products sheet for import. Dropdown lists below are generated from this shop and business type.", 2)}</row>`,
    `<row r="4">${inlineCell(0, 4, "How to use", 3)}</row>`,
    `<row r="5">${inlineCell(0, 5, "1. Set common values once in QUICK DEFAULTS on the Products sheet.", 2)}</row>`,
    `<row r="6">${inlineCell(0, 6, "2. Add Product Name for each row. Leave SKU blank for auto-generation and Price blank for enquiry-led products.", 2)}</row>`,
    `<row r="7">${inlineCell(0, 7, "3. Fill a row value only when that product should differ from the default. Then upload the same workbook.", 2)}</row>`,
  );

  const maxValues = Math.max(...columns.map((column) => column.values.length), 1);
  rows.push(
    `<row r="${listStartRow}">${columns
      .map((column, index) =>
        inlineCell(index, listStartRow, column.title, 5),
      )
      .join("")}</row>`,
  );

  for (let offset = 0; offset < maxValues; offset += 1) {
    const rowNumber = listStartRow + 1 + offset;
    const cells = columns
      .map((column, index) => {
        const value = column.values[offset];
        return value == null ? "" : inlineCell(index, rowNumber, value, 0);
      })
      .join("");
    if (cells) rows.push(`<row r="${rowNumber}">${cells}</row>`);
  }

  const definedNames = columns.map((column, index) => {
    const lastRow = listStartRow + Math.max(1, column.values.length);
    const columnLetter = cellRef(index, 1).replace(/\d+$/, "");
    return {
      name: column.definedName,
      formula: `'Lists & Help'!$${columnLetter}$${listStartRow + 1}:$${columnLetter}$${lastRow}`,
    };
  });

  const lastColumn = Math.max(0, columns.length - 1);
  return {
    definedNames,
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${cellRef(lastColumn, listStartRow + maxValues)}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${listStartRow}" topLeftCell="A${listStartRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="24" customWidth="1"/>`).join("")}</cols>
  <sheetData>${rows.join("")}</sheetData>
</worksheet>`,
  };
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
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
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

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFill="1" applyFont="1"/>
  </cellXfs>
</styleSheet>`;

function buildWorkbook(
  config: SmartWorkbookConfig,
  rows: SmartWorkbookProductRow[],
): Buffer {
  const products = productsWorksheet(config, rows);
  const lists = listsWorksheet(config);
  const definedNames = lists.definedNames
    .map(
      (item) =>
        `<definedName name="${escapeXml(item.name)}">${escapeXml(item.formula)}</definedName>`,
    )
    .join("");

  return buildZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
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
  <sheets>
    <sheet name="Products" sheetId="1" r:id="rId1"/>
    <sheet name="Lists &amp; Help" sheetId="2" r:id="rId2"/>
  </sheets>
  <definedNames>${definedNames}</definedNames>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: products.xml },
    { name: "xl/worksheets/sheet2.xml", content: lists.xml },
  ]);
}

export function buildSmartProductImportTemplate(
  config: SmartWorkbookConfig,
): Buffer {
  return buildWorkbook(config, []);
}

export function buildSmartProductExportWorkbook(
  config: SmartWorkbookConfig,
  rows: SmartWorkbookProductRow[],
): Buffer {
  return buildWorkbook(config, rows);
}
