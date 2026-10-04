"use client";

import { useState, type ChangeEvent } from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  CatalogApiError,
  removeShopBranding,
  uploadShopBranding,
  type ShopBrandingKind,
} from "@/lib/catalog-api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export function ShopBrandingMedia({
  shopId,
  logoUrl,
  coverUrl,
  onChange,
}: {
  shopId: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  onChange: (kind: ShopBrandingKind, url: string | null) => void;
}) {
  const [busyKind, setBusyKind] = useState<ShopBrandingKind | null>(null);
  const [feedback, setFeedback] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);

  async function upload(
    kind: ShopBrandingKind,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFeedback({
        variant: "error",
        message: "Use a JPG, PNG or WebP image.",
      });
      return;
    }

    if (file.size > MAX_BYTES) {
      setFeedback({
        variant: "error",
        message: "Shop branding images must be 8 MB or smaller.",
      });
      return;
    }

    setBusyKind(kind);
    setFeedback(null);

    try {
      const response = await uploadShopBranding(shopId, kind, file);
      onChange(kind, response.data.url);
      setFeedback({
        variant: "success",
        message: kind === "logo" ? "Shop logo uploaded successfully." : "Shop cover image uploaded successfully.",
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : `Unable to upload the shop ${kind}.`,
      });
    } finally {
      setBusyKind(null);
    }
  }

  async function remove(kind: ShopBrandingKind) {
    const label = kind === "logo" ? "logo" : "cover image";
    if (!window.confirm(`Remove the current shop ${label}?`)) return;

    setBusyKind(kind);
    setFeedback(null);

    try {
      await removeShopBranding(shopId, kind);
      onChange(kind, null);
      setFeedback({
        variant: "success",
        message: `Shop ${label} removed.`,
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : `Unable to remove the shop ${label}.`,
      });
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo and cover</CardTitle>
        <CardDescription>
          Upload customer-facing shop branding to Cloudflare R2. JPG, PNG and WebP are supported up to 8 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Shop logo</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                A square image works best. It appears over the storefront cover.
              </p>
            </div>

            <StorefrontMedia
              src={logoUrl ?? null}
              alt="Shop logo preview"
              className="size-32 rounded-2xl border border-border"
            />

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "logo" ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("logo", event)}
                />
              </label>
              {logoUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyKind !== null}
                  onClick={() => void remove("logo")}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Storefront cover / hero image</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Use a wide landscape image. A 16:6 or similar banner ratio gives the best storefront result.
              </p>
            </div>

            <StorefrontMedia
              src={coverUrl ?? null}
              alt="Shop cover preview"
              className="aspect-[16/6] w-full rounded-2xl border border-border"
            />

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "cover" ? "Uploading…" : coverUrl ? "Replace cover" : "Upload cover"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("cover", event)}
                />
              </label>
              {coverUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyKind !== null}
                  onClick={() => void remove("cover")}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
