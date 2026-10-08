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
  type ShopBrandingSource,
} from "@/lib/catalog-api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

function sourceLabel(
  kind: ShopBrandingKind,
  source: ShopBrandingSource | undefined,
) {
  if (source === "SHOP") return "Custom shop image";
  if (source === "BUSINESS_DEFAULT") return "Using business-type default";
  if (source === "PLATFORM_DEFAULT") {
    return kind === "logo"
      ? "Using Webbanao default logo"
      : "Using platform fallback cover";
  }
  return "No image configured";
}

export function ShopBrandingMedia({
  shopId,
  logoUrl,
  coverUrl,
  customLogoUrl,
  customCoverUrl,
  logoSource,
  coverSource,
  onChange,
}: {
  shopId: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
  logoSource?: ShopBrandingSource;
  coverSource?: ShopBrandingSource;
  onChange: (value: {
    kind: ShopBrandingKind;
    effectiveLogoUrl: string | null;
    effectiveCoverUrl: string | null;
    logoSource: ShopBrandingSource;
    coverSource: ShopBrandingSource;
    customUrl: string | null;
  }) => void;
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
      onChange({
        kind,
        effectiveLogoUrl: response.data.effectiveLogoUrl,
        effectiveCoverUrl: response.data.effectiveCoverUrl,
        logoSource: response.data.logoSource,
        coverSource: response.data.coverSource,
        customUrl: response.data.url,
      });
      setFeedback({
        variant: "success",
        message:
          kind === "logo"
            ? "Custom shop logo uploaded successfully."
            : "Custom shop cover uploaded successfully.",
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
    const fallback =
      kind === "logo"
        ? "the Webbanao default logo"
        : "the configured business/platform default cover";

    if (
      !window.confirm(
        `Remove the custom shop ${label}? The storefront will automatically use ${fallback}.`,
      )
    ) {
      return;
    }

    setBusyKind(kind);
    setFeedback(null);

    try {
      const response = await removeShopBranding(shopId, kind);
      onChange({
        kind,
        effectiveLogoUrl: response.data.effectiveLogoUrl,
        effectiveCoverUrl: response.data.effectiveCoverUrl,
        logoSource: response.data.logoSource,
        coverSource: response.data.coverSource,
        customUrl: null,
      });
      setFeedback({
        variant: "success",
        message: `Custom shop ${label} removed. The inherited default is now active.`,
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
          Your storefront always has branding. Platform and business defaults are
          used automatically until you upload your own images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? (
          <Alert variant={feedback.variant}>{feedback.message}</Alert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Shop logo</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {sourceLabel("logo", logoSource)}. Uploading your own logo
                overrides the default only for this shop.
              </p>
            </div>

            <StorefrontMedia
              src={logoUrl ?? null}
              alt="Shop logo preview"
              className="size-32 rounded-2xl border border-border"
            />

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "logo"
                  ? "Uploading…"
                  : customLogoUrl
                    ? "Replace custom logo"
                    : "Upload your logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("logo", event)}
                />
              </label>
              {customLogoUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyKind !== null}
                  onClick={() => void remove("logo")}
                >
                  Revert to default
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Storefront cover / hero image
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {sourceLabel("cover", coverSource)}. A wide 16:6 image gives the
                best result.
              </p>
            </div>

            <StorefrontMedia
              src={coverUrl ?? null}
              alt="Shop cover preview"
              className="aspect-[16/6] w-full rounded-2xl border border-border"
            />

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "cover"
                  ? "Uploading…"
                  : customCoverUrl
                    ? "Replace custom cover"
                    : "Upload custom cover"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("cover", event)}
                />
              </label>
              {customCoverUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyKind !== null}
                  onClick={() => void remove("cover")}
                >
                  Revert to default
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
