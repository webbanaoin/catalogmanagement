"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { currentTrackingSource, trackPublicEvent } from "@/lib/public-analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function standaloneMode() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function PwaInstallPrompt({
  mode,
  shopSlug,
  compact = false,
  className,
}: {
  mode: "merchant" | "shop";
  shopSlug?: string;
  compact?: boolean;
  className?: string;
}) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(standaloneMode());
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standaloneMode());

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const appInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      if (mode === "shop" && shopSlug) {
        void trackPublicEvent({
          shopSlug,
          eventType: "PWA_INSTALL",
          source: currentTrackingSource(shopSlug),
        });
      }
      setInstalled(true);
      setPromptEvent(null);
    }
  }

  if (installed) return null;

  if (promptEvent) {
    if (compact) {
      return (
        <Button type="button" size="sm" variant="secondary" onClick={install}>
          Install
        </Button>
      );
    }

    return (
      <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {mode === "merchant" ? "Install merchant dashboard" : "Add this shop to your home screen"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Open this Digital Showroom in its own app-like window from your device.
            </p>
          </div>
          <Button type="button" size="sm" onClick={install}>
            Install
          </Button>
        </div>
      </div>
    );
  }

  if (isIos && !compact) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
        <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          In Safari, use Share and choose Add to Home Screen.
        </p>
      </div>
    );
  }

  return null;
}
