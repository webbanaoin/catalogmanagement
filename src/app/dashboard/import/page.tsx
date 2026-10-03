"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingState,
  PageHeader,
  buttonClassName,
} from "@/components/ui";
import {
  CatalogApiError,
  getCurrentMerchantShop,
  type MerchantShop,
} from "@/lib/catalog-api";
import {
  confirmProductImport,
  getProductImportJobs,
  previewProductImport,
  type ProductImportJob,
  type ProductImportPreviewResponse,
  type ProductImportPreviewRow,
} from "@/lib/import-api";

function statusVariant(
  status: ProductImportJob["status"],
): "success" | "warning" | "error" | "info" {
  if (status === "COMPLETED") return "success";
  if (status === "PREVIEW_READY") return "info";
  if (status === "VALIDATION_FAILED") return "warning";
  return "error";
}

function rowVariant(
  status: ProductImportPreviewRow["status"],
): "success" | "warning" | "error" {
  if (status === "READY") return "success";
  if (status === "DUPLICATE") return "warning";
  return "error";
}

function rowLabel(status: ProductImportPreviewRow["status"]) {
  if (status === "READY") return "Ready";
  if (status === "DUPLICATE") return "Duplicate";
  return "Fix row";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ProductImportPage() {
  const [shop, setShop] = useState<MerchantShop | null>(null);
  const [jobs, setJobs] = useState<ProductImportJob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreviewResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const templateUrl = useMemo(
    () =>
      shop
        ? `/api/shops/${encodeURIComponent(shop.id)}/imports/products/template`
        : "#",
    [shop],
  );

  const exportUrl = useMemo(
    () =>
      shop
        ? `/api/shops/${encodeURIComponent(shop.id)}/exports/products`
        : "#",
    [shop],
  );

  async function refreshJobs(shopId: string) {
    const response = await getProductImportJobs(shopId);
    setJobs(response.items);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentShop = await getCurrentMerchantShop();
        if (!active) return;
        setShop(currentShop);
        const history = await getProductImportJobs(currentShop.id);
        if (active) setJobs(history.items);
      } catch (error) {
        if (!active) return;
        setFeedback({
          variant: "error",
          message:
            error instanceof CatalogApiError
              ? error.message
              : "Unable to load the Excel import workspace.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setFeedback(null);
  }

  async function handlePreview() {
    if (!shop || !file) {
      setFeedback({
        variant: "warning",
        message: "Choose a completed .xlsx file before validating the import.",
      });
      return;
    }

    setPreviewing(true);
    setPreview(null);
    setFeedback(null);

    try {
      const response = await previewProductImport(shop.id, file);
      setPreview(response.data);
      await refreshJobs(shop.id);

      const { readyRows, duplicateRows, invalidRows } = response.data.summary;
      if (readyRows > 0) {
        setFeedback({
          variant: "info",
          message:
            `Preview ready: ${readyRows} product${readyRows === 1 ? "" : "s"} can be imported. ` +
            `${duplicateRows} duplicate${duplicateRows === 1 ? "" : "s"} and ${invalidRows} invalid row${invalidRows === 1 ? "" : "s"} will be skipped. Products are NOT imported until you click the import button below.`,
        });
      } else {
        setFeedback({
          variant: "warning",
          message:
            "No rows are ready to import. Duplicate products are skipped automatically; fix invalid rows and upload again.",
        });
      }
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : "Unable to validate this Excel file.",
      });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (!shop || !preview || preview.job.status !== "PREVIEW_READY") return;

    setConfirming(true);
    setFeedback(null);

    try {
      const response = await confirmProductImport(shop.id, preview.job.id);
      setFeedback({
        variant: "success",
        message:
          `${response.data.importedCount} product${response.data.importedCount === 1 ? "" : "s"} imported successfully. ` +
          `${response.data.skippedCount} row${response.data.skippedCount === 1 ? "" : "s"} skipped. Blank product codes were generated automatically and are included when you download the current catalogue.`,
      });
      setPreview((current) =>
        current
          ? {
              ...current,
              job: {
                ...current.job,
                status: "COMPLETED",
                successfulRows: response.data.importedCount,
                failedRows: response.data.skippedCount,
              },
            }
          : current,
      );
      await refreshJobs(shop.id);
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : "Unable to confirm this product import.",
      });
      await refreshJobs(shop.id);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading Excel import"
        description="Preparing the product import workspace for your shop."
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 4"
        title="Easy Excel product import"
        description="Product Code is optional. Leave it blank and the system will generate one automatically. Existing or likely duplicate products are detected and skipped."
        actions={<Badge variant="success">API connected</Badge>}
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Start with Excel</CardTitle>
          <CardDescription>
            Download a blank template for new products, or download your current catalogue when you want a backup/editable sheet with saved product codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <a href={templateUrl} className={buttonClassName("primary", "md")}>
              Download blank template
            </a>
            <a href={exportUrl} className={buttonClassName("secondary", "md")}>
              Download current catalogue
            </a>
          </div>
          <p className="text-sm leading-6 text-muted">
            SKU / Product Code is optional. If blank, a code such as PRD-A1B2C3D4 is generated automatically. Keep generated codes when editing/re-uploading exported products so duplicates are easy to identify.
          </p>
          <p className="text-xs text-muted">
            Maximum file size 5 MiB · Maximum 1000 product rows
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload and check</CardTitle>
          <CardDescription>
            The system checks price rules, categories, product codes and likely duplicates before creating anything. Good rows can still be imported even when other rows need attention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              Completed Excel file
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFileChange}
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-medium file:text-primary"
            />
          </label>

          {file ? (
            <p className="text-sm text-muted">
              Selected: <span className="font-medium text-foreground">{file.name}</span>{" "}
              · {(file.size / 1024).toFixed(1)} KB
            </p>
          ) : null}

          <Button onClick={() => void handlePreview()} disabled={!file || previewing}>
            {previewing ? "Checking products…" : "Check & preview"}
          </Button>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>3. Review before import</CardTitle>
                <CardDescription>
                  {preview.summary.readyRows} ready · {preview.summary.duplicateRows} duplicate · {preview.summary.invalidRows} invalid · {preview.job.totalRows} total
                </CardDescription>
              </div>
              <Badge variant={statusVariant(preview.job.status)}>
                {preview.job.status === "PREVIEW_READY" ? "READY TO IMPORT" : preview.job.status.replaceAll("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[1040px] w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-strong">
                  <tr>
                    <th className="px-3 py-3">Row</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Product code</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Price type</th>
                    <th className="px-3 py-3">Availability</th>
                    <th className="px-3 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="bg-background align-top">
                      <td className="px-3 py-3 font-medium">{row.rowNumber}</td>
                      <td className="px-3 py-3">
                        <Badge variant={rowVariant(row.status)}>{rowLabel(row.status)}</Badge>
                      </td>
                      <td className="px-3 py-3">{row.values["Product Name"] || "—"}</td>
                      <td className="px-3 py-3">
                        {row.values.SKU || (row.autoSku ? "Auto-generate" : "—")}
                      </td>
                      <td className="px-3 py-3">{row.values.Category || "—"}</td>
                      <td className="px-3 py-3">{row.values["Price Type"] || "—"}</td>
                      <td className="px-3 py-3">{row.values.Availability || "—"}</td>
                      <td className="px-3 py-3">
                        {row.status === "READY" ? (
                          <span className="text-success-strong">
                            {row.autoSku ? "Ready · product code will be generated" : "Ready"}
                          </span>
                        ) : row.status === "DUPLICATE" ? (
                          <div className="space-y-1 text-warning-strong">
                            <p>{row.duplicate?.message ?? "Duplicate product skipped"}</p>
                            {row.duplicate?.existingProduct ? (
                              <p className="text-xs text-muted">
                                Existing: {row.duplicate.existingProduct.name}
                                {row.duplicate.existingProduct.sku
                                  ? ` · ${row.duplicate.existingProduct.sku}`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <ul className="space-y-1 text-danger">
                            {row.errors.map((error, index) => (
                              <li key={`${error.field}-${index}`}>
                                {error.field}: {error.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.job.status === "PREVIEW_READY" ? (
              <div className="rounded-xl border border-info/20 bg-info-soft p-4">
                <p className="font-semibold text-info-strong">
                  Products are not imported yet.
                </p>
                <p className="mt-1 text-sm leading-6 text-info-strong">
                  Click below to import only the {preview.summary.readyRows} ready product
                  {preview.summary.readyRows === 1 ? "" : "s"}. Duplicate and invalid rows will be skipped automatically.
                </p>
                <Button
                  className="mt-3"
                  onClick={() => void handleConfirm()}
                  disabled={confirming}
                >
                  {confirming
                    ? "Importing…"
                    : `Import ${preview.summary.readyRows} ready product${preview.summary.readyRows === 1 ? "" : "s"}`}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
          <CardDescription>
            Latest Excel checks and imports for {shop?.name ?? "this shop"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              title="No import jobs yet"
              description="Download the template and check your first Excel file."
              className="min-h-40"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-strong">
                  <tr>
                    <th className="px-3 py-3">File</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Rows</th>
                    <th className="px-3 py-3">Imported / ready</th>
                    <th className="px-3 py-3">Skipped / failed</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job.id} className="bg-background">
                      <td className="px-3 py-3 font-medium text-foreground">{job.fileName}</td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(job.status)}>
                          {job.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">{job.totalRows}</td>
                      <td className="px-3 py-3">{job.successfulRows}</td>
                      <td className="px-3 py-3">{job.failedRows}</td>
                      <td className="px-3 py-3 text-muted">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert title="Designed for shopkeepers">
        You do not need to maintain product codes manually. Leave the field blank, import ready rows, and download the current catalogue whenever you need the saved auto-generated codes.
      </Alert>
    </div>
  );
}
