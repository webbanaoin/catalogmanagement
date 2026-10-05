"use client";

import { useState } from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import { Button } from "@/components/ui";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export function ProductGallery({
  productName,
  images,
}: {
  productName: string;
  images: Array<{ id: string; url: string; isPrimary: boolean; displayOrder: number }>;
}) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const selected = images.find((image) => image.id === selectedId) ?? images[0] ?? null;

  function selectImage(id: string) {
    setSelectedId(id);
    setZoom(MIN_ZOOM);
  }

  function zoomIn() {
    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div
          className="aspect-square w-full transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        >
          <StorefrontMedia
            src={selected?.url ?? null}
            alt={selected ? productName : `${productName} product image`}
            className="h-full w-full bg-surface"
            eager
          />
        </div>

        {selected ? (
          <div
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-border bg-surface/95 p-2 shadow-sm backdrop-blur"
            aria-label="Product image zoom controls"
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              −
            </Button>
            <span className="min-w-12 text-center text-xs font-medium text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              +
            </Button>
            {zoom > MIN_ZOOM ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setZoom(MIN_ZOOM)}
              >
                Reset
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Product image gallery">
          {images.map((image, index) => {
            const selectedImage = image.id === selected?.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => selectImage(image.id)}
                className={[
                  "overflow-hidden rounded-lg border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  selectedImage ? "border-primary" : "border-border",
                ].join(" ")}
                aria-pressed={selectedImage}
                aria-label={`Show image ${index + 1} of ${productName}`}
              >
                <StorefrontMedia
                  src={image.url}
                  alt=""
                  className="aspect-square w-full"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {selected ? (
        <p className="text-xs leading-5 text-muted">
          Use + and − to inspect product details up to 300%. Selecting another image resets the zoom.
        </p>
      ) : null}
    </div>
  );
}
