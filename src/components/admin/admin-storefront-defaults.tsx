"use client";

import { type ChangeEvent, useEffect, useState } from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdminApiError,
  getAdminPlatformStorefrontBranding,
  removeAdminPlatformStorefrontBranding,
  uploadAdminPlatformStorefrontBranding,
  type AdminPlatformStorefrontBranding,
} from "@/lib/admin-api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export function AdminStorefrontDefaults() {
  const [branding, setBranding] =
    useState<AdminPlatformStorefrontBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getAdminPlatformStorefrontBranding()
      .then((response) => {
        if (!active) return;
        setBranding(response.data);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load platform storefront defaults.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function upload(
    kind: "logo" | "cover",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFeedback("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFeedback("Branding images must be 8 MB or smaller.");
      return;
    }

    setBusyKind(kind);
    setError(null);
    setFeedback(null);

    try {
      const response = await uploadAdminPlatformStorefrontBranding(kind, file);
      setBranding((current) => ({
        ...(current ?? {}),
        ...(kind === "logo"
          ? {
              defaultLogoStorageKey: response.data.storageKey,
              defaultLogoUrl: response.data.url,
            }
          : {
              defaultCoverStorageKey: response.data.storageKey,
              defaultCoverUrl: response.data.url,
            }),
      }));
      setFeedback(
        kind === "logo"
          ? "Default Webbanao storefront logo saved. Shops without their own logo will use it automatically."
          : "Platform fallback cover saved. It is used only when a shop and its business type have no cover.",
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof AdminApiError
          ? uploadError.message
          : "Unable to upload the storefront default.",
      );
    } finally {
      setBusyKind(null);
    }
  }

  async function remove(kind: "logo" | "cover") {
    const label = kind === "logo" ? "default logo" : "platform fallback cover";
    if (!window.confirm(`Remove the ${label}?`)) return;

    setBusyKind(kind);
    setError(null);
    setFeedback(null);

    try {
      await removeAdminPlatformStorefrontBranding(kind);
      setBranding((current) => ({
        ...(current ?? {}),
        ...(kind === "logo"
          ? { defaultLogoStorageKey: null, defaultLogoUrl: null }
          : { defaultCoverStorageKey: null, defaultCoverUrl: null }),
      }));
      setFeedback(`${label} removed.`);
    } catch (removeError) {
      setError(
        removeError instanceof AdminApiError
          ? removeError.message
          : "Unable to remove the storefront default.",
      );
    } finally {
      setBusyKind(null);
    }
  }

  if (loading) {
    return <LoadingState title="Loading storefront defaults" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform storefront defaults</CardTitle>
        <CardDescription>
          Upload these once. Every shop without a custom logo automatically uses
          the Webbanao default logo. The fallback cover is used only when there is
          no shop cover and no business-type cover.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? <Alert title="Storefront defaults">{feedback}</Alert> : null}
        {error ? (
          <ErrorState
            title="Storefront branding action failed"
            description={error}
          />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Default Webbanao logo
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Recommended: square PNG/WebP with transparent or clean background.
              </p>
            </div>
            <StorefrontMedia
              src={branding?.defaultLogoUrl ?? null}
              alt="Default Webbanao storefront logo"
              className="size-32 rounded-2xl border border-border"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "logo"
                  ? "Uploading…"
                  : branding?.defaultLogoUrl
                    ? "Replace logo"
                    : "Upload logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("logo", event)}
                />
              </label>
              {branding?.defaultLogoUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
              <p className="text-sm font-semibold text-foreground">
                Generic fallback cover
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Optional. A business-type cover such as Jewellery or Toys takes
                priority over this fallback.
              </p>
            </div>
            <StorefrontMedia
              src={branding?.defaultCoverUrl ?? null}
              alt="Platform fallback cover"
              className="aspect-[16/6] w-full rounded-2xl border border-border"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                {busyKind === "cover"
                  ? "Uploading…"
                  : branding?.defaultCoverUrl
                    ? "Replace fallback cover"
                    : "Upload fallback cover"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busyKind !== null}
                  onChange={(event) => void upload("cover", event)}
                />
              </label>
              {branding?.defaultCoverUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
