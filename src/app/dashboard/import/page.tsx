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
} from "@/lib/import-api";

function statusVariant(
  status: ProductImportJob["status"],
): "success" | "warning" | "error" | "info" {
  if (status === "COMPLETED") return "success";
  if (status === "PREVIEW_READY") return "info";
  if (status === "VALIDATION_FAILED") return "warning";
  return "error";
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

      setFeedback({
        variant:
          response.data.job.status === "PREVIEW_READY" ? "success" : "warning",
        message:
          response.data.job.status === "PREVIEW_READY"
            ? "Validation passed. Review the rows below, then confirm the import."
            : "Validation found issues. Fix the highlighted rows in Excel and upload the file again.",
      });
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
        message: `${response.data.importedCount} product${
          response.data.importedCount === 1 ? "" : "s"
        } imported successfully.`,
      });
      setPreview((current) =>
        current
          ? {
              ...current,
              job: {
                ...current.job,
                status: "COMPLETED",
                successfulRows: response.data.importedCount,
                failedRows: 0,
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
        title="Excel product import"
        description="Download the standard template, validate product rows, preview any issues, and confirm an all-or-nothing import."
        actions={<Badge variant="success">API connected</Badge>}
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Download the template</CardTitle>
          <CardDescription>
            Keep the column headers unchanged. Category can be an active shop category name or slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <a href={templateUrl} className={buttonClassName("secondary", "md")}>
            Download Excel template
          </a>
          <p className="text-sm text-muted">
            Maximum file size 5 MiB · Maximum 1000 product rows
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload and validate</CardTitle>
          <CardDescription>
            Validation checks required columns, price rules, categories, duplicate SKUs, availability and flags before any product is created.
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
            {previewing ? "Validating…" : "Validate & preview"}
          </Button>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>3. Review preview</CardTitle>
                <CardDescription>
                  {preview.job.successfulRows} valid · {preview.job.failedRows} invalid · {preview.job.totalRows} total
                </CardDescription>
              </div>
              <Badge variant={statusVariant(preview.job.status)}>
                {preview.job.status.replaceAll("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-strong">
                  <tr>
                    <th className="px-3 py-3">Row</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Price type</th>
                    <th className="px-3 py-3">Availability</th>
                    <th className="px-3 py-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="bg-background align-top">
                      <td className="px-3 py-3 font-medium">{row.rowNumber}</td>
                      <td className="px-3 py-3">
                        <Badge variant={row.valid ? "success" : "error"}>
                          {row.valid ? "Valid" : "Fix row"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">{row.values["Product Name"] || "—"}</td>
                      <td className="px-3 py-3">{row.values.SKU || "—"}</td>
                      <td className="px-3 py-3">{row.values.Category || "—"}</td>
                      <td className="px-3 py-3">{row.values["Price Type"] || "—"}</td>
                      <td className="px-3 py-3">{row.values.Availability || "—"}</td>
                      <td className="px-3 py-3">
                        {row.errors.length === 0 ? (
                          <span className="text-success-strong">Ready</span>
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
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void handleConfirm()} disabled={confirming}>
                  {confirming ? "Importing…" : "Confirm import"}
                </Button>
                <p className="text-sm text-muted">
                  Products are created only after this confirmation.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
          <CardDescription>
            Latest preview and import jobs for {shop?.name ?? "this shop"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              title="No import jobs yet"
              description="Download the template and validate your first Excel file."
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
                    <th className="px-3 py-3">Valid</th>
                    <th className="px-3 py-3">Failed</th>
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

      <Alert title="Safe import flow">
        Preview never creates products. Confirmation rechecks SKU/category conflicts and then creates all validated rows in one transaction.
      </Alert>
    </div>
  );
}
