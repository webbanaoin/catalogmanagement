"use client";

import { type ChangeEvent, useMemo, useState } from "react";

import { uploadAdminCategoryMedia, type AdminCategoryMediaItem } from "@/lib/admin-api";
import { extractCategoryImages, type CategoryZipImage } from "@/lib/category-image-zip";
import { Alert, Button } from "@/components/ui";

type FileMatch = {
  image: CategoryZipImage;
  item: AdminCategoryMediaItem | null;
  duplicate: boolean;
  alreadyUploaded: boolean;
};

export function AdminBulkCategoryZipUploader({
  categoryId,
  items,
  onUploaded,
}: {
  categoryId: string;
  items: AdminCategoryMediaItem[];
  onUploaded: (item: AdminCategoryMediaItem) => void;
}) {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [images, setImages] = useState<CategoryZipImage[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);

  const matches = useMemo<FileMatch[]>(() => {
    const counts = new Map<string, number>();
    images.forEach((image) => {
      counts.set(image.categorySlug, (counts.get(image.categorySlug) ?? 0) + 1);
    });
    const categoryBySlug = new Map(items.map((item) => [item.categorySlug, item]));
    return images.map((image) => {
      const item = categoryBySlug.get(image.categorySlug) ?? null;
      return {
        image,
        item,
        duplicate: (counts.get(image.categorySlug) ?? 0) > 1,
        alreadyUploaded: uploaded.includes(image.categorySlug),
      };
    });
  }, [images, items, uploaded]);

  const ready = matches.filter((entry) =>
    entry.item && !entry.duplicate && !entry.alreadyUploaded &&
    (replaceExisting || !entry.item.imageStorageKey),
  );

  async function chooseZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImages([]);
    setSelectedZip(file.name);
    setUploaded([]);
    setError(null);
    setMessage(null);
    setProgress("");
    setReplaceExisting(false);
    setExtracting(true);
    try {
      const unpacked = await extractCategoryImages(file);
      setImages(unpacked);
      setMessage("Review filename matches below. Only known active categories will be uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read category ZIP file.");
    } finally {
      setExtracting(false);
    }
  }

  async function uploadAll() {
    if (!ready.length || uploading) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    const successful: string[] = [];
    const failures: string[] = [];
    try {
      for (const [index, entry] of ready.entries()) {
        const category = entry.item;
        if (!category) continue;
        setProgress(`Uploading ${index + 1} / ${ready.length}: ${category.categoryName}`);
        try {
          const response = await uploadAdminCategoryMedia(
            categoryId,
            category.categorySlug,
            entry.image.file,
          );
          successful.push(category.categorySlug);
          onUploaded(response.data);
        } catch (cause) {
          const details = cause instanceof Error ? cause.message : "Upload failed";
          failures.push(`${category.categoryName}: ${details}`);
        }
      }
      setUploaded((current) => [...new Set([...current, ...successful])]);
      setProgress("");
      if (successful.length) {
        setMessage(`${successful.length} category image(s) uploaded successfully.`);
      }
      if (failures.length) {
        setError(`${failures.length} image(s) failed: ${failures.slice(0, 4).join("; ")}`);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Bulk category images — ZIP</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            Upload a ZIP containing named JPG, PNG or WebP files, such as
            <strong> 01_soft-toys.jpg</strong> or <strong>02_baby-toys.jpg</strong>.
            Files are matched to this business type&apos;s active category slugs.
            ZIP contents stay in your browser; individual images use the existing secure R2 upload.
          </p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-background">
          {extracting ? "Reading ZIP…" : "Choose category ZIP"}
          <input type="file" className="sr-only" accept=".zip,application/zip,application/x-zip-compressed"
            disabled={extracting || uploading}
            onChange={(event) => void chooseZip(event)} />
        </label>
      </div>

      <p className="mt-2 text-xs text-muted">
        Up to 45 MB per ZIP and 40 images (maximum 8 MB each).
        Non-image files and unmatched names are ignored. Hero/cover images must be uploaded separately.
      </p>

      {error ? <div className="mt-3"><Alert title="ZIP image upload issue">{error}</Alert></div> : null}
      {message ? <div className="mt-3"><Alert title="Bulk upload">{message}</Alert></div> : null}
      {selectedZip ? <p className="mt-3 text-xs font-semibold text-foreground">Selected: {selectedZip}</p> : null}
      {matches.length > 0 ? (
        <>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
            {matches.map((match, index) => {
              const label = !match.item ? "No category match — skip"
                : match.duplicate ? "Duplicate filename slug — skip"
                : match.alreadyUploaded ? "Uploaded"
                : match.item.imageStorageKey && !replaceExisting ? "Already has image — skip"
                : match.item.imageStorageKey ? "Will replace (approved)" : "Ready to upload";
              return (
                <div key={`${match.image.filename}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-foreground">{match.image.filename}</p>
                    <p className="mt-1 text-muted">{match.item?.categoryName ?? "Unmatched"}</p>
                  </div>
                  <span className="text-muted">{label}</span>
                </div>
              );
            })}
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-foreground">
            <input type="checkbox" className="mt-0.5" checked={replaceExisting}
              disabled={uploading} onChange={(event) => setReplaceExisting(event.target.checked)} />
            I approve replacing category images already configured in this business type
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" disabled={extracting || uploading || ready.length === 0}
              onClick={() => void uploadAll()}>
              {uploading ? "Uploading…" : `Upload ${ready.length} matched image(s)`}
            </Button>
            <span className="text-xs text-muted">{progress || `${ready.length} ready · ${matches.length - ready.length} skipped/completed`}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
