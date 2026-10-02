"use client";

import { useState } from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";

export function ProductGallery({
  productName,
  images,
}: {
  productName: string;
  images: Array<{ id: string; url: string; isPrimary: boolean; displayOrder: number }>;
}) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? null);
  const selected = images.find((image) => image.id === selectedId) ?? images[0] ?? null;

  return (
    <div className="space-y-3">
      <StorefrontMedia
        src={selected?.url ?? null}
        alt={selected ? productName : `${productName} product image`}
        className="aspect-square w-full rounded-2xl border border-border bg-surface"
        eager
      />

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Product image gallery">
          {images.map((image, index) => {
            const selectedImage = image.id === selected?.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedId(image.id)}
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
    </div>
  );
}
