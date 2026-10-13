"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration({
  scope,
}: {
  scope: string;
}) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const originRoot = `${window.location.origin}/`;
        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          registrations
            .filter((registration) => registration.scope === originRoot)
            .map((registration) => registration.unregister()),
        );

        await navigator.serviceWorker.register("/sw.js", { scope });
      } catch {
        // PWA registration failure must not affect the application.
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    const onLoad = () => {
      void register();
    };

    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, [scope]);

  return null;
}
