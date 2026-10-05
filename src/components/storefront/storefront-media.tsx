/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/cn";

export function StorefrontMedia({
  src,
  alt,
  className,
  eager = false,
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
  fit?: "cover" | "contain" | "native";
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-muted text-center text-xs text-muted",
          className,
        )}
        role="img"
        aria-label={`No image available for ${alt}`}
      >
        No image
      </div>
    );
  }

  const fitClass =
    fit === "native"
      ? "max-h-full max-w-full object-contain"
      : fit === "contain"
        ? "object-contain"
        : "object-cover";

  return (
    <img
      src={src}
      alt={alt}
      className={cn(fitClass, className)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
