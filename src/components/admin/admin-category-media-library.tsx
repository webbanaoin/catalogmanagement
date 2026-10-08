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
  getAdminCategoryMediaLibrary,
  removeAdminCategoryMedia,
  uploadAdminCategoryMedia,
  type AdminCategoryMediaItem,
} from "@/lib/admin-api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export function AdminCategoryMediaLibrary({
  businessCategoryId,
  businessCategoryName,
}: {
  businessCategoryId: string;
  businessCategoryName: string;
}) {
  const [items, setItems] = useState<AdminCategoryMediaItem[]>([]);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getAdminCategoryMediaLibrary(businessCategoryId)
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setPresetKey(response.presetKey);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof AdminApiError
            ? loadError.message
            : "Unable to load the category image library.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessCategoryId]);

  async function upload(
    item: AdminCategoryMediaItem,
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
      setFeedback("Category images must be 8 MB or smaller.");
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
            ? {
                ...currentItem,
                ...response.data,
              }
            : currentItem,
        ),
      );
      setFeedback(
        `${item.categoryName} image saved. It will automatically appear for matching shops unless a shop has its own override image.`,
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
    return <LoadingState title="Loading category media library" />;
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        title="Unable to load category images"
        description={error}
      />
    );
  }

  if (!presetKey || items.length === 0) {
    return (
      <EmptyState
        title="No default category preset"
        description={`${businessCategoryName} does not currently have a shared default category preset. Shop-specific categories will continue using their own images.`}
      />
    );
  }

  return (
    <div className="space-y-4">
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

      {feedback ? <Alert title="Category media">{feedback}</Alert> : null}
      {error ? (
        <ErrorState title="Category media action failed" description={error} />
      ) : null}

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
                    disabled={busySlug !== null}
                    onChange={(event) => void upload(item, event)}
                  />
                </label>
                {item.imageUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busySlug !== null}
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
    </div>
  );
}
