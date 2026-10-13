import { CatalogApiError } from "@/lib/catalog-api";

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: unknown;
  };
}

async function errorFromResponse(response: Response): Promise<CatalogApiError> {
  let body: ErrorEnvelope | null = null;
  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    // Non-JSON errors fall back to a generic message.
  }

  return new CatalogApiError({
    code: body?.error?.code ?? "REQUEST_FAILED",
    message: body?.error?.message ?? "Something went wrong. Please try again.",
    status: response.status,
  });
}

export interface ProductImportError {
  rowNumber: number | null;
  field: string;
  message: string;
}

export interface ProductImportDuplicate {
  rowNumber: number;
  reason: "SKU" | "FINGERPRINT";
  message: string;
  existingProduct: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
}

export interface ProductImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  valid: boolean;
  status: "READY" | "DUPLICATE" | "INVALID";
  errors: ProductImportError[];
  duplicate: ProductImportDuplicate | null;
  autoSku: boolean;
  data: unknown | null;
}

export interface ProductImportJob {
  id: string;
  fileName: string;
  status: "PREVIEW_READY" | "VALIDATION_FAILED" | "COMPLETED" | "FAILED";
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface ProductImportPreviewResponse {
  data: {
    job: ProductImportJob;
    rows: ProductImportPreviewRow[];
    errors: ProductImportError[];
    summary: {
      readyRows: number;
      duplicateRows: number;
      invalidRows: number;
      remainingProductSlots?: number;
      readyWithinPlan?: number;
    };
  };
}

export async function previewProductImport(shopId: string, file: File) {
  const form = new FormData();
  form.set("file", file);

  const response = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/imports/products/preview`,
    {
      method: "POST",
      body: form,
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  if (!response.ok) throw await errorFromResponse(response);
  return (await response.json()) as ProductImportPreviewResponse;
}

export async function confirmProductImport(shopId: string, jobId: string) {
  const response = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/imports/products/${encodeURIComponent(jobId)}/confirm`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  if (!response.ok) throw await errorFromResponse(response);

  return (await response.json()) as {
    data: {
      jobId: string;
      status: "COMPLETED";
      importedCount: number;
      skippedCount: number;
      skipped: Array<{
        rowNumber: number;
        reason: string;
        message: string;
      }>;
      products: Array<{
        id: string;
        name: string;
        slug: string;
        sku: string | null;
      }>;
    };
  };
}

export async function getProductImportJobs(shopId: string) {
  const response = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/imports/products?page=1&pageSize=20`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  if (!response.ok) throw await errorFromResponse(response);

  return (await response.json()) as {
    items: ProductImportJob[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}
