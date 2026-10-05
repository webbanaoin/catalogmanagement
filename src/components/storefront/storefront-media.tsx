/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/cn";

export function StorefrontMedia({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
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

  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
