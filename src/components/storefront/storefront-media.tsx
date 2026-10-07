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
          "relative flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#eef1ec_0%,#f8f8f5_52%,#e7ece8_100%)] text-center text-muted",
          className,
        )}
        role="img"
        aria-label={`No image available for ${alt}`}
      >
        <div className="absolute -right-8 -top-8 size-28 rounded-full border border-primary/10 bg-primary/5" />
        <div className="absolute -bottom-10 -left-7 size-32 rounded-full border border-foreground/5 bg-surface/45" />
        <div className="relative flex flex-col items-center gap-2 px-4">
          <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface/80 text-sm shadow-sm">
            ◇
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:text-xs">
            Image coming soon
          </span>
        </div>
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
