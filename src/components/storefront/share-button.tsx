"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

export function ShareButton({ title }: { title: string }) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  async function share() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // The user may cancel the native share dialog. No persistent error state is needed.
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={share}>
      {status === "copied" ? "Link copied" : "Share"}
    </Button>
  );
}
