"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";

export function MerchantLogoutButton({
  className,
  label = "Logout",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      disabled={busy}
      onClick={() => void logout()}
    >
      {busy ? "Signing out…" : label}
    </Button>
  );
}
