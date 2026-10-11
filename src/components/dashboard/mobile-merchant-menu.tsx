"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function MobileMerchantMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Route changes must not leave the navigation panel covering the next screen.
    const closeOnRouteChange = () => setOpen(false);
    closeOnRouteChange();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="merchant-mobile-navigation"
        aria-label={open ? "Close merchant menu" : "Open merchant menu"}
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <div
          id="merchant-mobile-navigation"
          className="absolute right-0 z-40 mt-2 max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg"
          onClickCapture={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
