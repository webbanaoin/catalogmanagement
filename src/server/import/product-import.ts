import "server-only";

import { z } from "zod";

import type {
  CatalogAttributePreset,
  CatalogPreset,
} from "@/lib/catalog-presets";
import { PRODUCT_IMPORT_HEADERS, type WorkbookRow } from "@/server/import/xlsx";

export const PRODUCT_IMPORT_MAX_ROWS = 1000;

const storedAttributeSchema = z.object({
  attributeName: z.string().min(1).max(120),
  attributeValue: z.string().min(1).max(500),
  displayOrder: z.number().int().min(0),
});

const storedProductSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z.string().min(1).max(180),
  sku: z.string().max(100).nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  catalogGroup: z.string().max(120).nullable().optional(),
  price: z.string().nullable(),
  discountPrice: z.string().nullable(),
  priceType: z.enum(["FIXED", "STARTING_FROM", "ASK_PRICE"]),
  description: z.string().max(20000).nullable(),
  availabilityStatus: z.enum(["IN_STOCK", "OUT_OF_STOCK", "ON_REQUEST"]),
  showPrice: z.boolean().nullable().default(null),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  isOffer: z.boolean().default(false),
  attributes: z.array(storedAttributeSchema).max(50).default([]),
});

export const storedProductImportPreviewSchema = z.object({
  version: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  products: z.array(storedProductSchema).max(PRODUCT_IMPORT_MAX_ROWS),
});

export type StoredImportProduct = z.infer<typeof storedProductSchema>;
export type StoredProductImportPreview = z.infer<typeof storedProductImportPreviewSchema>;

export type ProductImportError = {
  rowNumber: number | null;
  field: string;
  message: string;
};

export type ProductImportDuplicate = {
  rowNumber: number;
  reason: "SKU" | "FINGERPRINT";
  message: string;
  existingProduct: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
};

export type ProductImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  valid: boolean;
  status: "READY" | "DUPLICATE" | "INVALID";
  errors: ProductImportError[];
  duplicate: ProductImportDuplicate | null;
  autoSku: boolean;
  data: StoredImportProduct | null;
};

type ShopCategoryForImport = {
  id: string;
  name: string;
  slug: string;
};

export type ExistingProductForImport = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  catalogGroup?: string | null;
  price: string | null;
  discountPrice: string | null;
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
};

const OPTIONAL_HEADERS = [
  "Price Visibility",
  "Visible",
  "Offer",
] as const;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function headerAliases(
  header: (typeof PRODUCT_IMPORT_HEADERS)[number],
  catalogPreset?: CatalogPreset,
): string[] {
  if (header === "SKU") {
    return [
      "sku",
      "product code",
      "sku product code",
      "sku product code optional",
      "sku product code optional auto generated if blank",
    ];
  }

  if (header === "Product Group") {
    return [
      "product group",
      "product group type",
      "catalog group",
      "catalog group type",
      "jewellery type",
      "jewelry type",
      "department",
      "collection",
      "room collection",
      "vehicle type",
      "for",
      ...(catalogPreset ? [normalizeHeader(catalogPreset.groupLabel)] : []),
    ];
  }

  return [normalizeHeader(header)];
}

function normalizeEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedMoney(value: string | null): string {
  if (!value) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

export function productFingerprint(product: {
  name: string;
  categoryId: string | null;
  catalogGroup?: string | null;
  priceType: "FIXED" | "STARTING_FROM" | "ASK_PRICE";
  price: string | null;
  discountPrice?: string | null;
}): string {
  const price = product.priceType === "ASK_PRICE" ? "" : normalizedMoney(product.price);
  const discount =
    product.priceType === "FIXED" ? normalizedMoney(product.discountPrice ?? null) : "";

  return [
    normalizeName(product.name),
    normalizeName(product.catalogGroup ?? ""),
    product.categoryId ?? "",
    product.priceType,
    price,
    discount,
  ].join("|");
}

function nullableText(
  value: string,
  max: number,
  field: string,
  rowNumber: number,
  errors: ProductImportError[],
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > max) {
    errors.push({
      rowNumber,
      field,
      message: `${field} must be ${max} characters or fewer`,
    });
    return null;
  }

  return trimmed;
}

function money(
  value: string,
  field: string,
  rowNumber: number,
  errors: ProductImportError[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/₹/g, "").replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    errors.push({
      rowNumber,
      field,
      message: `${field} must be a non-negative number with at most 2 decimal places`,
    });
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 9_999_999_999.99) {
    errors.push({
      rowNumber,
      field,
      message: `${field} is outside the supported range`,
    });
    return null;
  }

  return parsed.toFixed(2);
}

function booleanValue(
  value: string,
  field: string,
  rowNumber: number,
  errors: ProductImportError[],
  fallback: boolean,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;

  errors.push({
    rowNumber,
    field,
    message: `${field} must be Yes/No or True/False`,
  });
  return fallback;
}

function priceVisibility(
  value: string,
  rowNumber: number,
  errors: ProductImportError[],
): boolean | null {
  const normalized = normalizeEnum(value || "USE_SHOP_SETTING");
  if (
    normalized === "USE_SHOP_SETTING" ||
    normalized === "SHOP_SETTING" ||
    normalized === "INHERIT"
  ) {
    return null;
  }
  if (normalized === "SHOW" || normalized === "YES") return true;
  if (normalized === "HIDE" || normalized === "NO") return false;

  errors.push({
    rowNumber,
    field: "Price Visibility",
    message: "Price Visibility must be Use Shop Setting, Show, or Hide",
  });
  return null;
}

function priceType(
  value: string,
  rowNumber: number,
  errors: ProductImportError[],
): StoredImportProduct["priceType"] {
  const normalized = normalizeEnum(value || "FIXED");
  if (normalized === "FIXED") return "FIXED";
  if (normalized === "STARTING_FROM" || normalized === "STARTINGFROM") return "STARTING_FROM";
  if (normalized === "ASK_PRICE" || normalized === "ASKPRICE") return "ASK_PRICE";

  errors.push({
    rowNumber,
    field: "Price Type",
    message: "Price Type must be Fixed, Starting From, or Ask Price",
  });
  return "FIXED";
}

function availability(
  value: string,
  rowNumber: number,
  errors: ProductImportError[],
): StoredImportProduct["availabilityStatus"] {
  const normalized = normalizeEnum(value || "IN_STOCK");
  if (normalized === "IN_STOCK" || normalized === "INSTOCK") return "IN_STOCK";
  if (normalized === "OUT_OF_STOCK" || normalized === "OUTOFSTOCK") return "OUT_OF_STOCK";
  if (normalized === "ON_REQUEST" || normalized === "ONREQUEST") return "ON_REQUEST";

  errors.push({
    rowNumber,
    field: "Availability",
    message: "Availability must be In Stock, Out of Stock, or On Request",
  });
  return "IN_STOCK";
}

function categoryId(
  value: string,
  categories: ShopCategoryForImport[],
  rowNumber: number,
  errors: ProductImportError[],
): { id: string | null; name: string | null } {
  const normalized = value.trim().toLowerCase();
  if (!normalized || ["(none)", "none", "no category"].includes(normalized)) {
    return { id: null, name: null };
  }

  const slugMatch = categories.find((category) => category.slug.toLowerCase() === normalized);
  if (slugMatch) return { id: slugMatch.id, name: slugMatch.name };

  const nameMatches = categories.filter(
    (category) => category.name.trim().toLowerCase() === normalized,
  );

  if (nameMatches.length === 1) {
    return { id: nameMatches[0]?.id ?? null, name: nameMatches[0]?.name ?? null };
  }

  errors.push({
    rowNumber,
    field: "Category",
    message:
      nameMatches.length > 1
        ? "Category name is ambiguous; use the category slug instead"
        : "Category was not found in this shop",
  });
  return { id: null, name: value.trim() || null };
}

function catalogGroupValue(
  value: string,
  preset: CatalogPreset | undefined,
  rowNumber: number,
  errors: ProductImportError[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed || ["(none)", "none", "no group"].includes(trimmed.toLowerCase())) {
    return null;
  }

  if (!preset?.groups.length) return trimmed;

  const canonical = preset.groups.find(
    (group) => group.toLowerCase() === trimmed.toLowerCase(),
  );
  if (canonical) return canonical;

  errors.push({
    rowNumber,
    field: "Product Group",
    message: `${preset.groupLabel} must be one of: ${preset.groups.join(", ")}`,
  });
  return trimmed;
}

type ColumnIndexes = {
  indexes: Map<string, number>;
  optionalIndexes: Map<string, number>;
  attributeIndexes: Map<string, number>;
  errors: ProductImportError[];
};

function buildColumnIndexes(
  headerRow: WorkbookRow,
  catalogPreset?: CatalogPreset,
): ColumnIndexes {
  const actualHeaders = headerRow.values.map((value) => normalizeHeader(value ?? ""));
  const indexes = new Map<string, number>();
  const optionalIndexes = new Map<string, number>();
  const attributeIndexes = new Map<string, number>();
  const errors: ProductImportError[] = [];

  for (const header of PRODUCT_IMPORT_HEADERS) {
    const aliases = headerAliases(header, catalogPreset);
    const index = actualHeaders.findIndex((actual) => aliases.includes(actual));

    if (index < 0) {
      errors.push({
        rowNumber: null,
        field: header,
        message:
          header === "SKU"
            ? 'Required column "SKU / Product Code (Optional)" is missing'
            : `Required column "${header}" is missing`,
      });
    } else {
      indexes.set(normalizeHeader(header), index);
    }
  }

  for (const header of OPTIONAL_HEADERS) {
    const index = actualHeaders.findIndex(
      (actual) => actual === normalizeHeader(header),
    );
    if (index >= 0) optionalIndexes.set(normalizeHeader(header), index);
  }

  for (const attribute of catalogPreset?.attributes ?? []) {
    const aliases = [
      normalizeHeader(attribute.name),
      normalizeHeader(attribute.label),
      normalizeHeader(`Attribute ${attribute.name}`),
      normalizeHeader(`Attribute ${attribute.label}`),
    ];
    const index = actualHeaders.findIndex((actual) => aliases.includes(actual));
    if (index >= 0) attributeIndexes.set(attribute.name, index);
  }

  return { indexes, optionalIndexes, attributeIndexes, errors };
}

function rowValues(
  row: WorkbookRow,
  columns: ColumnIndexes,
  catalogPreset?: CatalogPreset,
): Record<string, string> {
  const values: Record<string, string> = Object.fromEntries(
    PRODUCT_IMPORT_HEADERS.map((header) => [
      header,
      row.values[columns.indexes.get(normalizeHeader(header)) ?? -1]?.trim() ?? "",
    ]),
  );

  for (const header of OPTIONAL_HEADERS) {
    values[header] =
      row.values[columns.optionalIndexes.get(normalizeHeader(header)) ?? -1]?.trim() ?? "";
  }

  for (const attribute of catalogPreset?.attributes ?? []) {
    values[`Attribute:${attribute.name}`] =
      row.values[columns.attributeIndexes.get(attribute.name) ?? -1]?.trim() ?? "";
  }

  return values;
}

function findHeaderRowIndex(rows: WorkbookRow[]): number {
  return rows.findIndex((row) =>
    row.values.some((value) => normalizeHeader(value ?? "") === "product name"),
  );
}

function parseDefaults(
  rows: WorkbookRow[],
  catalogPreset?: CatalogPreset,
): Map<string, string> {
  const defaults = new Map<string, string>();
  const groupLabels = new Set([
    "default product group",
    "default product group type",
    ...(catalogPreset
      ? [`default ${normalizeHeader(catalogPreset.groupLabel)}`]
      : []),
  ]);

  const baseMap = new Map<string, string>([
    ["default category", "Category"],
    ["default price type", "Price Type"],
    ["default availability", "Availability"],
    ["default price visibility", "Price Visibility"],
    ["default visible", "Visible"],
    ["default featured", "Featured"],
    ["default new arrival", "New Arrival"],
    ["default offer", "Offer"],
  ]);

  for (const row of rows) {
    const label = normalizeHeader(row.values[0] ?? "");
    const value = (row.values[1] ?? "").trim();
    if (!label) continue;

    if (groupLabels.has(label)) {
      defaults.set("Product Group", value);
      continue;
    }

    const baseKey = baseMap.get(label);
    if (baseKey) {
      defaults.set(baseKey, value);
      continue;
    }

    for (const attribute of catalogPreset?.attributes ?? []) {
      if (
        label === `default ${normalizeHeader(attribute.name)}` ||
        label === `default ${normalizeHeader(attribute.label)}`
      ) {
        defaults.set(`Attribute:${attribute.name}`, value);
        break;
      }
    }
  }

  return defaults;
}

function withDefault(
  raw: string | undefined,
  defaults: Map<string, string>,
  key: string,
  fallback = "",
): string {
  const value = raw?.trim() ?? "";
  if (value) return value;
  const configured = defaults.get(key)?.trim() ?? "";
  return configured || fallback;
}

function validateAttributeValue(
  attribute: CatalogAttributePreset,
  rawValue: string,
  catalogGroup: string | null,
  rowNumber: number,
  errors: ProductImportError[],
): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed || ["(none)", "none"].includes(trimmed.toLowerCase())) return null;

  if (trimmed.length > 500) {
    errors.push({
      rowNumber,
      field: attribute.label,
      message: `${attribute.label} must be 500 characters or fewer`,
    });
    return null;
  }

  if (
    attribute.visibleForGroups?.length &&
    (!catalogGroup || !attribute.visibleForGroups.includes(catalogGroup))
  ) {
    errors.push({
      rowNumber,
      field: attribute.label,
      message: catalogGroup
        ? `${attribute.label} does not apply to ${catalogGroup}`
        : `Select a product group before using ${attribute.label}`,
    });
    return null;
  }

  const allowed = attribute.optionsByGroup
    ? catalogGroup
      ? attribute.optionsByGroup[catalogGroup] ?? []
      : []
    : attribute.options ?? [];

  if (
    (attribute.optionsByGroup || attribute.options?.length) &&
    allowed.length > 0
  ) {
    const canonical = allowed.find(
      (option) => option.toLowerCase() === trimmed.toLowerCase(),
    );
    if (canonical) return canonical;

    errors.push({
      rowNumber,
      field: attribute.label,
      message: `${attribute.label} must be one of: ${allowed.join(", ")}`,
    });
    return null;
  }

  if (attribute.optionsByGroup && allowed.length === 0) {
    errors.push({
      rowNumber,
      field: attribute.label,
      message: catalogGroup
        ? `${attribute.label} does not apply to ${catalogGroup}`
        : `Select a product group before using ${attribute.label}`,
    });
    return null;
  }

  return trimmed;
}

function existingSkuMap(products: ExistingProductForImport[]) {
  return new Map(
    products
      .filter((product) => Boolean(product.sku?.trim()))
      .map((product) => [product.sku!.trim().toLowerCase(), product]),
  );
}

function existingFingerprintMap(products: ExistingProductForImport[]) {
  const map = new Map<string, ExistingProductForImport>();
  for (const product of products) {
    const key = productFingerprint(product);
    if (!map.has(key)) map.set(key, product);
  }
  return map;
}

export function previewProductImport(options: {
  rows: WorkbookRow[];
  categories: ShopCategoryForImport[];
  existingProducts: ExistingProductForImport[];
  catalogPreset?: CatalogPreset;
}) {
  const { rows, categories, existingProducts, catalogPreset } = options;

  if (rows.length === 0) {
    return {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
      products: [] as StoredImportProduct[],
      rows: [] as ProductImportPreviewRow[],
      errors: [
        {
          rowNumber: null,
          field: "file",
          message: "The workbook is empty",
        },
      ] satisfies ProductImportError[],
    };
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex < 0) {
    const errors: ProductImportError[] = [
      {
        rowNumber: null,
        field: "Product Name",
        message: 'Required column "Product Name" was not found',
      },
    ];
    return {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
      products: [] as StoredImportProduct[],
      rows: [] as ProductImportPreviewRow[],
      errors,
    };
  }

  const headerRow = rows[headerRowIndex] as WorkbookRow;
  const columns = buildColumnIndexes(headerRow, catalogPreset);
  const defaults = parseDefaults(rows.slice(0, headerRowIndex), catalogPreset);
  const dataRows = rows.slice(headerRowIndex + 1);
  const globalErrors = [...columns.errors];

  if (dataRows.length === 0) {
    globalErrors.push({
      rowNumber: null,
      field: "file",
      message: "The workbook does not contain any product rows",
    });
  }

  if (dataRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    globalErrors.push({
      rowNumber: null,
      field: "file",
      message: `A single import can contain at most ${PRODUCT_IMPORT_MAX_ROWS} product rows`,
    });
  }

  if (globalErrors.length > 0) {
    const limitedRows = dataRows.slice(0, PRODUCT_IMPORT_MAX_ROWS);
    return {
      totalRows: dataRows.length,
      successfulRows: 0,
      failedRows: dataRows.length,
      duplicateRows: 0,
      invalidRows: dataRows.length,
      products: [] as StoredImportProduct[],
      rows: limitedRows.map((row) => ({
        rowNumber: row.rowNumber,
        values: rowValues(row, columns, catalogPreset),
        valid: false,
        status: "INVALID" as const,
        errors: globalErrors,
        duplicate: null,
        autoSku: false,
        data: null,
      })),
      errors: globalErrors,
    };
  }

  const existingBySku = existingSkuMap(existingProducts);
  const existingByFingerprint = existingFingerprintMap(existingProducts);
  const seenSkus = new Set<string>();
  const seenFingerprints = new Map<string, StoredImportProduct>();
  const previewRows: ProductImportPreviewRow[] = [];
  const products: StoredImportProduct[] = [];
  const allErrors: ProductImportError[] = [];

  for (const row of dataRows.slice(0, PRODUCT_IMPORT_MAX_ROWS)) {
    const values = rowValues(row, columns, catalogPreset);
    const errors: ProductImportError[] = [];

    values.Category = withDefault(values.Category, defaults, "Category");
    values["Product Group"] = withDefault(
      values["Product Group"],
      defaults,
      "Product Group",
    );
    values["Price Type"] = withDefault(
      values["Price Type"],
      defaults,
      "Price Type",
      "Fixed",
    );
    values.Availability = withDefault(
      values.Availability,
      defaults,
      "Availability",
      "In Stock",
    );
    values["Price Visibility"] = withDefault(
      values["Price Visibility"],
      defaults,
      "Price Visibility",
      "Use Shop Setting",
    );
    values.Visible = withDefault(values.Visible, defaults, "Visible", "Yes");
    values.Featured = withDefault(values.Featured, defaults, "Featured", "No");
    values["New Arrival"] = withDefault(
      values["New Arrival"],
      defaults,
      "New Arrival",
      "No",
    );
    values.Offer = withDefault(values.Offer, defaults, "Offer", "No");

    for (const attribute of catalogPreset?.attributes ?? []) {
      const key = `Attribute:${attribute.name}`;
      values[key] = withDefault(values[key], defaults, key);
    }

    const name = values["Product Name"]?.trim() ?? "";

    if (!name) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Product Name",
        message: "Product Name is required",
      });
    } else if (name.length > 180) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Product Name",
        message: "Product Name must be 180 characters or fewer",
      });
    }

    const sku = nullableText(
      values.SKU ?? "",
      100,
      "SKU / Product Code",
      row.rowNumber,
      errors,
    );
    const category = categoryId(
      values.Category ?? "",
      categories,
      row.rowNumber,
      errors,
    );
    const catalogGroup = catalogGroupValue(
      values["Product Group"] ?? "",
      catalogPreset,
      row.rowNumber,
      errors,
    );
    const type = priceType(values["Price Type"] ?? "", row.rowNumber, errors);
    const price = money(values.Price ?? "", "Price", row.rowNumber, errors);
    const discountPrice = money(
      values["Discount Price"] ?? "",
      "Discount Price",
      row.rowNumber,
      errors,
    );

    if (price === null && discountPrice !== null) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Discount Price",
        message: "Discount Price requires a base Price",
      });
    }

    if (price !== null && discountPrice !== null && Number(discountPrice) > Number(price)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Discount Price",
        message: "Discount Price cannot exceed Price",
      });
    }

    const description = nullableText(
      values.Description ?? "",
      20_000,
      "Description",
      row.rowNumber,
      errors,
    );
    const availabilityStatus = availability(
      values.Availability ?? "",
      row.rowNumber,
      errors,
    );
    const showPrice = priceVisibility(
      values["Price Visibility"] ?? "",
      row.rowNumber,
      errors,
    );
    const isVisible = booleanValue(
      values.Visible ?? "",
      "Visible",
      row.rowNumber,
      errors,
      true,
    );
    const isFeatured = booleanValue(
      values.Featured ?? "",
      "Featured",
      row.rowNumber,
      errors,
      false,
    );
    const isNewArrival = booleanValue(
      values["New Arrival"] ?? "",
      "New Arrival",
      row.rowNumber,
      errors,
      false,
    );
    const isOffer = booleanValue(
      values.Offer ?? "",
      "Offer",
      row.rowNumber,
      errors,
      false,
    );

    const attributes = (catalogPreset?.attributes ?? [])
      .map((attribute, displayOrder) => {
        const attributeValue = validateAttributeValue(
          attribute,
          values[`Attribute:${attribute.name}`] ?? "",
          catalogGroup,
          row.rowNumber,
          errors,
        );
        return attributeValue
          ? {
              attributeName: attribute.name,
              attributeValue,
              displayOrder,
            }
          : null;
      })
      .filter(
        (
          attribute,
        ): attribute is {
          attributeName: string;
          attributeValue: string;
          displayOrder: number;
        } => Boolean(attribute),
      );

    const candidate: StoredImportProduct | null =
      errors.length === 0
        ? {
            rowNumber: row.rowNumber,
            name,
            sku,
            categoryId: category.id,
            categoryName: category.name,
            catalogGroup,
            price,
            discountPrice,
            priceType: type,
            description,
            availabilityStatus,
            showPrice,
            isVisible,
            isFeatured,
            isNewArrival,
            isOffer,
            attributes,
          }
        : null;

    let duplicate: ProductImportDuplicate | null = null;

    if (candidate) {
      const normalizedSku = candidate.sku?.trim().toLowerCase() ?? null;

      if (normalizedSku) {
        const existing = existingBySku.get(normalizedSku);
        if (existing) {
          duplicate = {
            rowNumber: row.rowNumber,
            reason: "SKU",
            message: `Product code ${candidate.sku} already exists in this shop`,
            existingProduct: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
            },
          };
        } else if (seenSkus.has(normalizedSku)) {
          duplicate = {
            rowNumber: row.rowNumber,
            reason: "SKU",
            message: `Product code ${candidate.sku} is repeated in this workbook`,
            existingProduct: null,
          };
        } else {
          seenSkus.add(normalizedSku);
        }
      } else {
        const fingerprint = productFingerprint(candidate);
        const existing = existingByFingerprint.get(fingerprint);
        const previous = seenFingerprints.get(fingerprint);

        if (existing) {
          duplicate = {
            rowNumber: row.rowNumber,
            reason: "FINGERPRINT",
            message: "A very similar product already exists; skipped to avoid a duplicate",
            existingProduct: {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
            },
          };
        } else if (previous) {
          duplicate = {
            rowNumber: row.rowNumber,
            reason: "FINGERPRINT",
            message: `Similar to row ${previous.rowNumber}; skipped to avoid a duplicate`,
            existingProduct: null,
          };
        } else {
          seenFingerprints.set(fingerprint, candidate);
        }
      }
    }

    const status: ProductImportPreviewRow["status"] =
      errors.length > 0 ? "INVALID" : duplicate ? "DUPLICATE" : "READY";
    const data = status === "READY" ? candidate : null;

    const previewRow: ProductImportPreviewRow = {
      rowNumber: row.rowNumber,
      values,
      valid: status === "READY",
      status,
      errors,
      duplicate,
      autoSku: status === "READY" && !candidate?.sku,
      data,
    };

    previewRows.push(previewRow);
    allErrors.push(...errors);
    if (data) products.push(data);
  }

  const duplicateRows = previewRows.filter((row) => row.status === "DUPLICATE").length;
  const invalidRows = previewRows.filter((row) => row.status === "INVALID").length;

  return {
    totalRows: dataRows.length,
    successfulRows: products.length,
    failedRows: dataRows.length - products.length,
    duplicateRows,
    invalidRows,
    products,
    rows: previewRows,
    errors: allErrors,
  };
}
