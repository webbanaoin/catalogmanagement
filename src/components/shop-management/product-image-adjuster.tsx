"use client";

/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  DEFAULT_PRODUCT_IMAGE_FRAMING,
  frameProductPhoto,
  imageFrameGeometry,
  type ProductImageFraming,
} from "@/lib/product-image-framing";
import { Button } from "@/components/ui";

type Dimensions = { width: number; height: number };
type DragStart = {
  x: number;
  y: number;
  positionX: number;
  positionY: number;
  frameWidth: number;
  frameHeight: number;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ProductImageAdjuster({
  file,
  productName,
  index,
  total,
  onConfirm,
  onCancel,
}: {
  file: File;
  productName: string;
  index: number;
  total: number;
  onConfirm: (adjusted: File) => Promise<void>;
  onCancel: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [frame, setFrame] = useState<ProductImageFraming>(DEFAULT_PRODUCT_IMAGE_FRAMING);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const drag = useRef<DragStart | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setDimensions(null);
    setError(null);
    setFrame({ ...DEFAULT_PRODUCT_IMAGE_FRAMING });
    dialogRef.current?.focus();
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [saving, onCancel]);

  const preview = dimensions
    ? imageFrameGeometry(dimensions.width, dimensions.height, frame, 100)
    : null;

  function onPhotoLoaded(image: HTMLImageElement) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    try {
      imageFrameGeometry(width, height, frame);
      setDimensions({ width, height });
      setError(null);
    } catch (cause) {
      setDimensions(null);
      setError(cause instanceof Error ? cause.message : "This photo cannot be adjusted.");
    }
  }

  function moveStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dimensions || saving) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const geometry = imageFrameGeometry(dimensions.width, dimensions.height, frame, bounds.width);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      positionX: frame.positionX,
      positionY: frame.positionY,
      frameWidth: bounds.width - geometry.width,
      frameHeight: bounds.height - geometry.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || saving) return;
    const start = drag.current;
    setFrame((current) => ({
      ...current,
      positionX: Math.abs(start.frameWidth) < 0.5
        ? current.positionX
        : clamp(start.positionX + (event.clientX - start.x) * 100 / start.frameWidth),
      positionY: Math.abs(start.frameHeight) < 0.5
        ? current.positionY
        : clamp(start.positionY + (event.clientY - start.y) * 100 / start.frameHeight),
    }));
  }

  async function confirm() {
    if (!dimensions || saving) return;
    setSaving(true);
    setError(null);
    try {
      const processed = await frameProductPhoto(file, frame);
      await onConfirm(processed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the adjusted photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-photo-adjust-title"
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none"
        style={{ maxHeight: "min(94dvh, 900px)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Image {index + 1} of {total} · {productName}</p>
            <h2 id="product-photo-adjust-title" className="mt-1 text-lg font-bold text-foreground sm:text-xl">
              Adjust photo before uploading
            </h2>
            <p className="mt-1 text-xs text-muted">
              Make sure the entire product is visible. Nothing is uploaded until you confirm.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onCancel} aria-label="Cancel upload">
            ✕
          </Button>
        </div>

        <div className="grid min-h-0 gap-5 overflow-y-auto p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.85fr)]">
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative aspect-square w-full max-w-[370px] overflow-hidden rounded-xl border-2 border-primary/25 bg-white shadow-inner"
              style={{ touchAction: "none", cursor: dimensions && !saving ? "grab" : "default" }}
              onPointerDown={moveStart}
              onPointerMove={move}
              onPointerUp={() => { drag.current = null; }}
              onPointerCancel={() => { drag.current = null; }}
              aria-label="Product photo square preview; drag to reposition"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Preview of ${file.name}`}
                  draggable={false}
                  onLoad={(event) => onPhotoLoaded(event.currentTarget)}
                  onError={() => setError("Photo preview could not load. Select another image.")}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={preview ? {
                    left: `${preview.x}%`,
                    top: `${preview.y}%`,
                    width: `${preview.width}%`,
                    height: `${preview.height}%`,
                  } : { visibility: "hidden" }}
                />
              ) : null}
              {!dimensions ? (
                <div className="absolute inset-0 flex items-center justify-center p-5 text-center text-xs text-muted">
                  {error ?? "Preparing preview…"}
                </div>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted">
              Square preview matches the product catalog card. Drag the picture to adjust its position.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">How should the photo fit?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  aria-pressed={frame.fit === "fit"}
                  onClick={() => setFrame({ ...DEFAULT_PRODUCT_IMAGE_FRAMING, fit: "fit" })}
                  className={`min-h-[72px] rounded-xl border p-3 text-left transition ${
                    frame.fit === "fit" ? "border-primary bg-primary-soft ring-1 ring-primary/25" : "border-border bg-background"
                  }`}
                >
                  <span className="block text-sm font-bold text-foreground">Fit entire photo</span>
                  <span className="mt-1 block text-xs text-muted">No edges cropped · recommended</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  aria-pressed={frame.fit === "fill"}
                  onClick={() => setFrame({ ...DEFAULT_PRODUCT_IMAGE_FRAMING, fit: "fill" })}
                  className={`min-h-[72px] rounded-xl border p-3 text-left transition ${
                    frame.fit === "fill" ? "border-primary bg-primary-soft ring-1 ring-primary/25" : "border-border bg-background"
                  }`}
                >
                  <span className="block text-sm font-bold text-foreground">Fill & crop</span>
                  <span className="mt-1 block text-xs text-muted">Square frame filled · edges may crop</span>
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <label htmlFor="photo-zoom" className="font-semibold text-foreground">Zoom</label>
                <span className="tabular-nums text-muted">{Math.round(frame.zoom * 100)}%</span>
              </div>
              <input
                id="photo-zoom"
                type="range"
                min="1" max="3" step="0.05"
                value={frame.zoom}
                disabled={saving || !dimensions}
                onChange={(event) => setFrame({ ...frame, zoom: Number(event.target.value) })}
                className="w-full accent-emerald-700"
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <label htmlFor="photo-horizontal" className="font-semibold text-foreground">Horizontal position</label>
                <span className="tabular-nums text-muted">{Math.round(frame.positionX)}%</span>
              </div>
              <input
                id="photo-horizontal"
                type="range"
                min="0" max="100" step="1"
                value={frame.positionX}
                disabled={saving || !dimensions}
                onChange={(event) => setFrame({ ...frame, positionX: Number(event.target.value) })}
                className="w-full accent-emerald-700"
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <label htmlFor="photo-vertical" className="font-semibold text-foreground">Vertical position</label>
                <span className="tabular-nums text-muted">{Math.round(frame.positionY)}%</span>
              </div>
              <input
                id="photo-vertical"
                type="range"
                min="0" max="100" step="1"
                value={frame.positionY}
                disabled={saving || !dimensions}
                onChange={(event) => setFrame({ ...frame, positionY: Number(event.target.value) })}
                className="w-full accent-emerald-700"
              />
            </div>
            <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => setFrame({ ...DEFAULT_PRODUCT_IMAGE_FRAMING })}>
              Reset adjustments
            </Button>
            <p className="rounded-lg bg-background p-3 text-xs leading-5 text-muted">
              Fit entire photo keeps tall and wide products complete. Blank edges are filled with white.
              Fill & crop is suitable for close-up designs. You can adjust each selected photo individually.
            </p>
          </div>
        </div>

        {error ? <p role="alert" className="px-4 pb-2 text-sm font-medium text-danger sm:px-6">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-4 py-3 sm:px-6">
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>Cancel</Button>
          <Button type="button" disabled={!dimensions || saving} onClick={() => void confirm()}>
            {saving ? "Preparing & uploading…" : total > index + 1 ? "Upload & adjust next →" : "Upload adjusted photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
