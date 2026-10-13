"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { StorefrontMedia } from "@/components/storefront/storefront-media";
import { Button } from "@/components/ui";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

type GalleryImage = {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
};

type Point = { x: number; y: number };

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ZoomSurface({
  src,
  alt,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  className = "",
}: {
  src: string;
  alt: string;
  zoom: number;
  pan: Point;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: Point) => void;
  className?: string;
}) {
  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<{ pointer: Point; pan: Point } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const active = [...pointers.current.values()];
    if (active.length >= 2) {
      pinchStart.current = {
        distance: distance(active[0]!, active[1]!),
        zoom,
      };
      dragStart.current = null;
      setDragging(false);
      return;
    }

    if (zoom > MIN_ZOOM) {
      dragStart.current = {
        pointer: { x: event.clientX, y: event.clientY },
        pan,
      };
      setDragging(true);
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;

    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const active = [...pointers.current.values()];
    if (active.length >= 2 && pinchStart.current) {
      const nextDistance = distance(active[0]!, active[1]!);
      const ratio =
        pinchStart.current.distance > 0
          ? nextDistance / pinchStart.current.distance
          : 1;
      onZoomChange(clampZoom(pinchStart.current.zoom * ratio));
      return;
    }

    if (active.length === 1 && dragStart.current && zoom > MIN_ZOOM) {
      onPanChange({
        x:
          dragStart.current.pan.x +
          (event.clientX - dragStart.current.pointer.x),
        y:
          dragStart.current.pan.y +
          (event.clientY - dragStart.current.pointer.y),
      });
    }
  }

  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);

    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }

    if (pointers.current.size === 0) {
      dragStart.current = null;
      setDragging(false);
    }
  }

  function doubleClick() {
    if (zoom > MIN_ZOOM) {
      onZoomChange(MIN_ZOOM);
      onPanChange({ x: 0, y: 0 });
    } else {
      onZoomChange(2);
    }
  }

  return (
    <div
      className={[
        "h-full w-full overflow-hidden select-none",
        zoom > MIN_ZOOM
          ? dragging
            ? "cursor-grabbing"
            : "cursor-grab"
          : "cursor-zoom-in",
        className,
      ].join(" ")}
      style={{ touchAction: "none" }}
      onDoubleClick={doubleClick}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
      aria-label="Zoomable product image"
    >
      <div
        className="h-full w-full transition-transform duration-150 ease-out"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        <StorefrontMedia
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          eager
        />
      </div>
    </div>
  );
}

function ZoomToolbar({
  zoom,
  onZoomOut,
  onZoomIn,
  onReset,
  onExpand,
  compact = false,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onExpand?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </Button>

      <span className="min-w-14 px-1 text-center text-xs font-semibold tabular-nums text-foreground">
        {Math.round(zoom * 100)}%
      </span>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </Button>

      {zoom > MIN_ZOOM ? (
        <Button type="button" size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      ) : null}

      {!compact && onExpand ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onExpand}
          aria-label="Open full screen image viewer"
          title="Full screen"
        >
          Expand
        </Button>
      ) : null}
    </div>
  );
}

export function ProductGallery({
  productName,
  images,
}: {
  productName: string;
  images: GalleryImage[];
}) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selectedIndex = Math.max(
    0,
    images.findIndex((image) => image.id === selectedId),
  );
  const selected = images[selectedIndex] ?? images[0] ?? null;

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }

      if (event.key === "ArrowLeft" && images.length > 1) {
        event.preventDefault();
        const previousIndex =
          (selectedIndex - 1 + images.length) % images.length;
        setSelectedId(images[previousIndex]?.id ?? null);
        setZoom(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
      }

      if (event.key === "ArrowRight" && images.length > 1) {
        event.preventDefault();
        const nextIndex = (selectedIndex + 1) % images.length;
        setSelectedId(images[nextIndex]?.id ?? null);
        setZoom(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images, lightboxOpen, selectedIndex]);

  function applyZoom(next: number) {
    const clamped = clampZoom(next);
    setZoom(clamped);
    if (clamped === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }

  function resetZoom() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function selectImage(id: string) {
    setSelectedId(id);
    resetZoom();
  }

  function previousImage() {
    if (images.length <= 1) return;
    const previousIndex = (selectedIndex - 1 + images.length) % images.length;
    setSelectedId(images[previousIndex]?.id ?? null);
    resetZoom();
  }

  function nextImage() {
    if (images.length <= 1) return;
    const nextIndex = (selectedIndex + 1) % images.length;
    setSelectedId(images[nextIndex]?.id ?? null);
    resetZoom();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="group relative aspect-square overflow-hidden rounded-[1.5rem] border border-border/90 bg-surface shadow-[0_18px_50px_rgba(23,32,29,0.08)] sm:rounded-[1.75rem]">
          {selected ? (
            <ZoomSurface
              src={selected.url}
              alt={productName}
              zoom={zoom}
              pan={pan}
              onZoomChange={applyZoom}
              onPanChange={setPan}
            />
          ) : (
            <StorefrontMedia
              src={null}
              alt={`${productName} product image`}
              className="h-full w-full bg-surface"
              eager
            />
          )}

          {selected ? (
            <>
              <div className="absolute right-3 top-3 hidden rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur sm:block">
                Double-click to zoom
              </div>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <ZoomToolbar
                  zoom={zoom}
                  onZoomOut={() => applyZoom(zoom - ZOOM_STEP)}
                  onZoomIn={() => applyZoom(zoom + ZOOM_STEP)}
                  onReset={resetZoom}
                  onExpand={() => {
                    resetZoom();
                    setLightboxOpen(true);
                  }}
                />
              </div>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div
            className="storefront-scroll flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible"
            aria-label="Product image gallery"
          >
            {images.map((image, index) => {
              const selectedImage = image.id === selected?.id;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => selectImage(image.id)}
                  className={[
                    "w-16 shrink-0 overflow-hidden rounded-xl border bg-surface p-0.5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-auto",
                    selectedImage
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border",
                  ].join(" ")}
                  aria-pressed={selectedImage}
                  aria-label={`Show image ${index + 1} of ${productName}`}
                >
                  <StorefrontMedia
                    src={image.url}
                    alt=""
                    className="aspect-square w-full rounded-[0.6rem]"
                  />
                </button>
              );
            })}
          </div>
        ) : null}

        {selected ? (
          <p className="text-[11px] leading-5 text-muted sm:text-xs">
            Tap Expand for a closer look. Pinch to zoom on mobile, or use + / − and drag on larger screens.
          </p>
        ) : null}
      </div>

      {lightboxOpen && selected ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 p-3 text-white sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} full-screen image viewer`}
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{productName}</p>
              <p className="text-xs text-white/70">
                Image {selectedIndex + 1} of {Math.max(1, images.length)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setLightboxOpen(false);
                resetZoom();
              }}
              aria-label="Close full-screen image viewer"
            >
              Close
            </Button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/15 bg-black/30">
            <ZoomSurface
              src={selected.url}
              alt={productName}
              zoom={zoom}
              pan={pan}
              onZoomChange={applyZoom}
              onPanChange={setPan}
            />

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={previousImage}
                  className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl text-white shadow-lg backdrop-blur transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Previous product image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl text-white shadow-lg backdrop-blur transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Next product image"
                >
                  ›
                </button>
              </>
            ) : null}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <ZoomToolbar
                compact
                zoom={zoom}
                onZoomOut={() => applyZoom(zoom - ZOOM_STEP)}
                onZoomIn={() => applyZoom(zoom + ZOOM_STEP)}
                onReset={resetZoom}
              />
            </div>
          </div>

          <p className="pt-3 text-center text-xs text-white/70">
            Drag to inspect details while zoomed · pinch on mobile · Esc closes · arrow keys change images
          </p>
        </div>
      ) : null}
    </>
  );
}
