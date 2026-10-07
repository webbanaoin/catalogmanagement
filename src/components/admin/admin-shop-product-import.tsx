"use client";

import { useState, type FormEvent } from "react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type PreviewRow = {
  rowNumber: number;
  status: "READY" | "DUPLICATE" | "INVALID";
  values: Record<string, string>;
  errors: Array<{ field: string; message: string }>;
  duplicate: { message: string } | null;
};

type PreviewResponse = {
  data: {
    job: {
      id: string;
      fileName: string;
      status: string;
      totalRows: number;
      successfulRows: number;
      failedRows: number;
    };
    rows: PreviewRow[];
    summary: {
      readyRows: number;
      duplicateRows: number;
      invalidRows: number;
      remainingProductSlots: number;
      readyWithinPlan: number;
      onboardingPlanName: string;
      productLimit: number;
    };
  };
};

type ConfirmResponse = {
  data: {
    importedCount: number;
    skippedCount: number;
    skipped: Array<{ rowNumber: number; message: string }>;
  };
};

async function errorMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Request could not be completed.";
  } catch {
    return "Request could not be completed.";
  }
}

export function AdminShopProductImport({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["data"] | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState<ConfirmResponse["data"] | null>(null);

  async function previewFile(event: FormEvent) {
    event.preventDefault();
    if (!file) return;

    setWorking(true);
    setMessage(null);
    setCompleted(null);

    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(
        `/api/admin/shops/${encodeURIComponent(shopId)}/imports/products/preview`,
        {
          method: "POST",
          body: form,
          credentials: "same-origin",
        },
      );

      if (!response.ok) throw new Error(await errorMessage(response));
      const body = (await response.json()) as PreviewResponse;
      setPreview(body.data);
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error ? error.message : "Unable to preview Excel file.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirmImport() {
    if (!preview?.job.id) return;

    setWorking(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/shops/${encodeURIComponent(shopId)}/imports/products/${encodeURIComponent(preview.job.id)}/confirm`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );

      if (!response.ok) throw new Error(await errorMessage(response));
      const body = (await response.json()) as ConfirmResponse;
      setCompleted(body.data);
      setMessage(
        `${body.data.importedCount} product${body.data.importedCount === 1 ? "" : "s"} imported for ${shopName}.`,
      );
      setPreview(null);
      setFile(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to confirm import.",
      );
    } finally {
      setWorking(false);
    }
  }

  const issueRows =
    preview?.rows.filter((row) => row.status !== "READY").slice(0, 20) ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>1. Download shop-specific Smart Excel</CardTitle>
          <CardDescription>
            The workbook uses this shop&apos;s assigned business type, categories,
            product groups and Smart Excel defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={`/api/admin/shops/${encodeURIComponent(shopId)}/imports/products/template`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Download Smart Excel for {shopName}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload and validate</CardTitle>
          <CardDescription>
            Nothing is created yet. Review ready, duplicate and invalid rows before
            confirming the onboarding import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={previewFile}>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setCompleted(null);
                setMessage(null);
              }}
              className="block w-full rounded-lg border border-border bg-surface p-2 text-sm"
            />
            <Button type="submit" disabled={!file || working}>
              {working ? "Checking…" : "Check & preview"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Review import preview</CardTitle>
            <CardDescription>
              {preview.job.fileName} · onboarding limit {preview.summary.productLimit} products
              under {preview.summary.onboardingPlanName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Ready", preview.summary.readyRows],
                ["Duplicates", preview.summary.duplicateRows],
                ["Invalid", preview.summary.invalidRows],
                ["Slots left", preview.summary.remainingProductSlots],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {issueRows.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-surface-muted/50 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Rows needing attention
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {issueRows.map((row) => (
                    <div key={row.rowNumber} className="px-4 py-3 text-sm">
                      <p className="font-medium text-foreground">
                        Row {row.rowNumber} · {row.values["Product Name"] || "Unnamed product"}
                      </p>
                      <p className="mt-1 text-muted">
                        {row.duplicate?.message ??
                          row.errors.map((error) => error.message).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert title="Workbook ready">
                All detected product rows are ready to import.
              </Alert>
            )}

            <Button
              type="button"
              onClick={confirmImport}
              disabled={working || preview.summary.readyWithinPlan <= 0}
            >
              {working
                ? "Importing…"
                : `Confirm & import ${preview.summary.readyWithinPlan} ready product${preview.summary.readyWithinPlan === 1 ? "" : "s"}`}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {message ? (
        <Alert title={completed ? "Onboarding import completed" : "Admin onboarding"}>
          {message}
        </Alert>
      ) : null}

      {completed?.skipped.length ? (
        <Alert variant="warning" title="Some rows were skipped">
          {completed.skipped
            .slice(0, 8)
            .map((item) => `Row ${item.rowNumber}: ${item.message}`)
            .join(" · ")}
        </Alert>
      ) : null}
    </div>
  );
}
