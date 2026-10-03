import "server-only";

import { z } from "zod";

import { PRODUCT_IMPORT_HEADERS, type WorkbookRow } from "@/server/import/xlsx";

export const PRODUCT_IMPORT_MAX_ROWS = 1000;

const storedProductSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z.string().min(1).max(180),
  sku: z.string().max(100).nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  price: z.string().nullable(),
  discountPrice: z.string().nullable(),
  priceType: z.enum(["FIXED", "STARTING_FROM", "ASK_PRICE"]),
  description: z.string().max(20000).nullable(),
  availabilityStatus: z.enum(["IN_STOCK", "OUT_OF_STOCK", "ON_REQUEST"]),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
});

export const storedProductImportPreviewSchema = z.object({
  version: z.literal(1),
  products: z.array(storedProductSchema).max(PRODUCT_IMPORT_MAX_ROWS),
});

export type StoredImportProduct = z.infer<typeof storedProductSchema>;
export type StoredProductImportPreview = z.infer<typeof storedProductImportPreviewSchema>;

export type ProductImportError = {
  rowNumber: number | null;
  field: string;
  message: string;
};

export type ProductImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  valid: boolean;
  errors: ProductImportError[];
  data: StoredImportProduct | null;
};

type ShopCategoryForImport = {
  id: string;
  name: string;
  slug: string;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function normalizeEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function nullableText(value: string, max: number, field: string, rowNumber: number, errors: ProductImportError[]) {
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
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;

  errors.push({
    rowNumber,
    field,
    message: `${field} must be Yes/No or True/False`,
  });
  return false;
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
  if (!normalized) return { id: null, name: null };

  const slugMatch = categories.find((category) => category.slug.toLowerCase() === normalized);
  if (slugMatch) return { id: slugMatch.id, name: slugMatch.name };

  const nameMatches = categories.filter((category) => category.name.trim().toLowerCase() === normalized);
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

function rowValues(
  row: WorkbookRow,
  indexes: Map<string, number>,
): Record<string, string> {
  return Object.fromEntries(
    PRODUCT_IMPORT_HEADERS.map((header) => [
      header,
      row.values[indexes.get(normalizeHeader(header)) ?? -1]?.trim() ?? "",
    ]),
  );
}

export function previewProductImport(options: {
  rows: WorkbookRow[];
  categories: ShopCategoryForImport[];
  existingSkus: ReadonlySet<string>;
}) {
  const { rows, categories, existingSkus } = options;
  const globalErrors: ProductImportError[] = [];

  if (rows.length === 0) {
    return {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
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

  const headerRow = rows[0] as WorkbookRow;
  const indexes = new Map<string, number>();

  headerRow.values.forEach((value, index) => {
    const normalized = normalizeHeader(value ?? "");
    if (normalized && !indexes.has(normalized)) indexes.set(normalized, index);
  });

  for (const header of PRODUCT_IMPORT_HEADERS) {
    if (!indexes.has(normalizeHeader(header))) {
      globalErrors.push({
        rowNumber: null,
        field: header,
        message: `Required column "${header}" is missing`,
      });
    }
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    globalErrors.push({
      rowNumber: null,
      field: "file",
      message: `A single import can contain at most ${PRODUCT_IMPORT_MAX_ROWS} product rows`,
    });
  }

  if (globalErrors.length > 0) {
    return {
      totalRows: dataRows.length,
      successfulRows: 0,
      failedRows: dataRows.length,
      products: [] as StoredImportProduct[],
      rows: dataRows.slice(0, PRODUCT_IMPORT_MAX_ROWS).map((row) => ({
        rowNumber: row.rowNumber,
        values: rowValues(row, indexes),
        valid: false,
        errors: globalErrors,
        data: null,
      })),
      errors: globalErrors,
    };
  }

  const seenSkus = new Set<string>();
  const previewRows: ProductImportPreviewRow[] = [];
  const products: StoredImportProduct[] = [];
  const allErrors: ProductImportError[] = [];

  for (const row of dataRows) {
    const values = rowValues(row, indexes);
    const errors: ProductImportError[] = [];
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

    const sku = nullableText(values.SKU ?? "", 100, "SKU", row.rowNumber, errors);
    const normalizedSku = sku?.toLowerCase() ?? null;
    if (normalizedSku) {
      if (existingSkus.has(normalizedSku)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "SKU",
          message: "SKU already exists in this shop",
        });
      } else if (seenSkus.has(normalizedSku)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "SKU",
          message: "SKU is duplicated within this workbook",
        });
      } else {
        seenSkus.add(normalizedSku);
      }
    }

    const category = categoryId(values.Category ?? "", categories, row.rowNumber, errors);
    const type = priceType(values["Price Type"] ?? "", row.rowNumber, errors);
    const price = money(values.Price ?? "", "Price", row.rowNumber, errors);
    const discountPrice = money(
      values["Discount Price"] ?? "",
      "Discount Price",
      row.rowNumber,
      errors,
    );

    if (type !== "ASK_PRICE" && price === null) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Price",
        message: "Price is required for Fixed and Starting From price types",
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
    const isFeatured = booleanValue(
      values.Featured ?? "",
      "Featured",
      row.rowNumber,
      errors,
    );
    const isNewArrival = booleanValue(
      values["New Arrival"] ?? "",
      "New Arrival",
      row.rowNumber,
      errors,
    );

    const data: StoredImportProduct | null =
      errors.length === 0
        ? {
            rowNumber: row.rowNumber,
            name,
            sku,
            categoryId: category.id,
            categoryName: category.name,
            price,
            discountPrice,
            priceType: type,
            description,
            availabilityStatus,
            isFeatured,
            isNewArrival,
          }
        : null;

    const preview: ProductImportPreviewRow = {
      rowNumber: row.rowNumber,
      values,
      valid: errors.length === 0,
      errors,
      data,
    };
    previewRows.push(preview);
    allErrors.push(...errors);
    if (data) products.push(data);
  }

  const failedRows = previewRows.filter((row) => !row.valid).length;

  return {
    totalRows: previewRows.length,
    successfulRows: previewRows.length - failedRows,
    failedRows,
    products,
    rows: previewRows,
    errors: allErrors,
  };
}
