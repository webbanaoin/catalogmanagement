"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { currentTrackingSource, trackPublicEvent } from "@/lib/public-analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallPromptWindow = Window & {
  __digitalShowroomInstallPrompt?: BeforeInstallPromptEvent | null;
  __digitalShowroomInstalled?: boolean;
};

function standaloneMode() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function subscribeStandalone(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(display-mode: standalone)");
  const changed = () => onStoreChange();

  media.addEventListener("change", changed);
  window.addEventListener("appinstalled", changed);

  return () => {
    media.removeEventListener("change", changed);
    window.removeEventListener("appinstalled", changed);
  };
}

function iosDeviceSnapshot() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function subscribeStatic() {
  return () => {};
}

function serverFalse() {
  return false;
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
  const [installedAfterPrompt, setInstalledAfterPrompt] = useState(false);
  const standaloneInstalled = useSyncExternalStore(
    subscribeStandalone,
    standaloneMode,
    serverFalse,
  );
  const iosDevice = useSyncExternalStore(
    subscribeStatic,
    iosDeviceSnapshot,
    serverFalse,
  );
  const installed = installedAfterPrompt || standaloneInstalled;
  const isIos = iosDevice && !installed;

  useEffect(() => {
    const installWindow = window as InstallPromptWindow;

    const syncCapturedPrompt = () => {
      const captured = installWindow.__digitalShowroomInstallPrompt;
      if (captured) setPromptEvent(captured);
    };

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      installWindow.__digitalShowroomInstallPrompt = prompt;
      setPromptEvent(prompt);
    };

    const appInstalled = () => {
      installWindow.__digitalShowroomInstallPrompt = null;
      installWindow.__digitalShowroomInstalled = true;
      setPromptEvent(null);
      setInstalledAfterPrompt(true);
    };

    queueMicrotask(() => {
      syncCapturedPrompt();
      if (installWindow.__digitalShowroomInstalled) {
        setInstalledAfterPrompt(true);
      }
    });

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    window.addEventListener("digital-showroom-install-prompt", syncCapturedPrompt);
    window.addEventListener("digital-showroom-app-installed", appInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      window.removeEventListener("digital-showroom-install-prompt", syncCapturedPrompt);
      window.removeEventListener("digital-showroom-app-installed", appInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;

    try {
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
        const installWindow = window as InstallPromptWindow;
        installWindow.__digitalShowroomInstallPrompt = null;
        installWindow.__digitalShowroomInstalled = true;
        setInstalledAfterPrompt(true);
        setPromptEvent(null);
      }
    } catch {
      // Browser install prompts may become unavailable between render and click.
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
