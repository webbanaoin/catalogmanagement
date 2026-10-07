"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={busy}
      onClick={() => void logout()}
    >
      {busy ? "Signing out…" : "Logout"}
    </Button>
  );
}
