"use client";

import { type ChangeEvent, useEffect, useState } from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdminApiError,
  getAdminBusinessCategoryBranding,
  getAdminCategoryMediaLibrary,
  removeAdminBusinessCategoryCover,
  removeAdminCategoryMedia,
  uploadAdminBusinessCategoryCover,
  uploadAdminCategoryMedia,
  type AdminCategoryMediaItem,
} from "@/lib/admin-api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Use a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "Images must be 8 MB or smaller.";
  }
  return null;
}

export function AdminCategoryMediaLibrary({
  businessCategoryId,
  businessCategoryName,
}: {
  businessCategoryId: string;
  businessCategoryName: string;
}) {
  const [items, setItems] = useState<AdminCategoryMediaItem[]>([]);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [defaultCoverUrl, setDefaultCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      getAdminCategoryMediaLibrary(businessCategoryId),
      getAdminBusinessCategoryBranding(businessCategoryId),
    ])
      .then(([media, branding]) => {
        if (!active) return;
        setItems(media.items);
        setPresetKey(media.presetKey);
        setDefaultCoverUrl(branding.data.defaultCoverUrl ?? null);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load storefront media defaults.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessCategoryId]);

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateFile(file);
    if (validation) {
      setFeedback(validation);
      return;
    }

    setCoverBusy(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await uploadAdminBusinessCategoryCover(
        businessCategoryId,
        file,
      );
      setDefaultCoverUrl(response.data.defaultCoverUrl ?? null);
      setFeedback(
        `${businessCategoryName} default cover saved. Every matching shop without its own cover will use it automatically.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof AdminApiError
          ? uploadError.message
          : "Unable to upload the business default cover.",
      );
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    if (
      !window.confirm(
        `Remove the ${businessCategoryName} default cover? Shops without custom covers will fall back to the platform cover.`,
      )
    ) {
      return;
    }

    setCoverBusy(true);
    setFeedback(null);
    setError(null);

    try {
      await removeAdminBusinessCategoryCover(businessCategoryId);
      setDefaultCoverUrl(null);
      setFeedback(
        `${businessCategoryName} default cover removed. Matching shops will now use the platform fallback when they have no custom cover.`,
      );
    } catch (removeError) {
      setError(
        removeError instanceof AdminApiError
          ? removeError.message
          : "Unable to remove the business default cover.",
      );
    } finally {
      setCoverBusy(false);
    }
  }

  async function upload(
    item: AdminCategoryMediaItem,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateFile(file);
    if (validation) {
      setFeedback(validation);
      return;
    }

    setBusySlug(item.categorySlug);
    setFeedback(null);
    setError(null);

    try {
      const response = await uploadAdminCategoryMedia(
        businessCategoryId,
        item.categorySlug,
        file,
      );
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.categorySlug === item.categorySlug
            ? { ...currentItem, ...response.data }
            : currentItem,
        ),
      );
      setFeedback(
        `${item.categoryName} image saved. It will automatically appear for matching shops unless a shop has its own category image.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof AdminApiError
          ? uploadError.message
          : "Unable to upload the category image.",
      );
    } finally {
      setBusySlug(null);
    }
  }

  async function remove(item: AdminCategoryMediaItem) {
    if (
      !window.confirm(
        `Remove the global image for ${item.categoryName}? Matching shops without their own image will return to the fallback artwork.`,
      )
    ) {
      return;
    }

    setBusySlug(item.categorySlug);
    setFeedback(null);
    setError(null);

    try {
      await removeAdminCategoryMedia(
        businessCategoryId,
        item.categorySlug,
      );
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.categorySlug === item.categorySlug
            ? {
                ...currentItem,
                imageStorageKey: null,
                imageUrl: null,
                updatedAt: null,
              }
            : currentItem,
        ),
      );
      setFeedback(`${item.categoryName} global image removed.`);
    } catch (removeError) {
      setError(
        removeError instanceof AdminApiError
          ? removeError.message
          : "Unable to remove the category image.",
      );
    } finally {
      setBusySlug(null);
    }
  }

  if (loading) {
    return <LoadingState title="Loading storefront media defaults" />;
  }

  return (
    <div className="space-y-5">
      {feedback ? <Alert title="Storefront media">{feedback}</Alert> : null}
      {error ? (
        <ErrorState title="Storefront media action failed" description={error} />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold text-foreground">
            Default storefront cover
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Upload once for {businessCategoryName}. Every matching shop inherits
            this cover until the merchant uploads a custom shop cover.
          </p>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <StorefrontMedia
            src={defaultCoverUrl}
            alt={`${businessCategoryName} default storefront cover`}
            className="aspect-[16/6] w-full rounded-xl border border-border"
          />
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
              {coverBusy
                ? "Uploading…"
                : defaultCoverUrl
                  ? "Replace default cover"
                  : "Upload default cover"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={coverBusy || busySlug !== null}
                onChange={(event) => void uploadCover(event)}
              />
            </label>
            {defaultCoverUrl ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={coverBusy || busySlug !== null}
                onClick={() => void removeCover()}
              >
                Remove cover
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-primary-soft/40 p-4">
        <p className="text-sm font-semibold text-foreground">
          Shared category image library
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Upload once here. The image is inherited by every {businessCategoryName}
          shop using the same preset category. A shop-specific category image,
          when present, always takes priority.
        </p>
      </div>

      {!presetKey || items.length === 0 ? (
        <EmptyState
          title="No default category preset"
          description={`${businessCategoryName} does not currently have a shared default category preset. The business cover above still works for all matching shops.`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.categorySlug}
              className="overflow-hidden rounded-2xl border border-border bg-background"
            >
              <StorefrontMedia
                src={item.imageUrl ?? null}
                alt={`${item.categoryName} category image`}
                className="aspect-[4/3] w-full"
              />
              <div className="p-4">
                <p className="font-semibold text-foreground">
                  {item.categoryName}
                </p>
                <p className="mt-1 text-xs text-muted">{item.categorySlug}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover">
                    {busySlug === item.categorySlug
                      ? "Uploading…"
                      : item.imageUrl
                        ? "Replace image"
                        : "Upload image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busySlug !== null || coverBusy}
                      onChange={(event) => void upload(item, event)}
                    />
                  </label>
                  {item.imageUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busySlug !== null || coverBusy}
                      onClick={() => void remove(item)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
