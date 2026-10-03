"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

type Feedback = "idle" | "copied" | "downloaded" | "shared" | "print-blocked";

function fileName(shopName: string) {
  const base = shopName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "shop"}-digital-showroom-qr.svg`;
}

export function ShopQrCard({
  shopName,
  publicUrl,
  qrSvg,
}: {
  shopName: string;
  publicUrl: string;
  qrSvg: string;
}) {
  const [feedback, setFeedback] = useState<Feedback>("idle");

  function resetFeedback() {
    window.setTimeout(() => setFeedback("idle"), 2500);
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setFeedback("copied");
    resetFeedback();
  }

  function downloadQr() {
    const blob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName(shopName);
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback("downloaded");
    resetFeedback();
  }

  async function shareUrl() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${shopName} Digital Showroom`,
          text: `Browse ${shopName}'s Digital Showroom.`,
          url: publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicUrl);
      }

      setFeedback("shared");
      resetFeedback();
    } catch {
      // Native sharing can be cancelled intentionally.
    }
  }

  function printQr() {
    const popup = window.open("", "_blank", "width=720,height=820");
    if (!popup) {
      setFeedback("print-blocked");
      resetFeedback();
      return;
    }

    popup.opener = null;
    const doc = popup.document;
    doc.title = `${shopName} QR`;

    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:Arial,sans-serif;margin:0;padding:48px;text-align:center;color:#111}" +
      "main{max-width:560px;margin:0 auto}svg{width:min(82vw,420px);height:auto}" +
      "h1{font-size:28px;margin:0 0 12px}p{font-size:16px;line-height:1.5;overflow-wrap:anywhere}" +
      "@media print{body{padding:24px}}";
    doc.head.append(style);

    const main = doc.createElement("main");
    const heading = doc.createElement("h1");
    heading.textContent = shopName;
    const instruction = doc.createElement("p");
    instruction.textContent = "Scan to open our Digital Showroom";
    const qr = doc.createElement("div");
    qr.innerHTML = qrSvg;
    const urlText = doc.createElement("p");
    urlText.textContent = publicUrl;

    main.append(heading, instruction, qr, urlText);
    doc.body.append(main);
    doc.close();

    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 150);
  }

  const statusMessage =
    feedback === "copied"
      ? "Public URL copied."
      : feedback === "downloaded"
        ? "QR downloaded."
        : feedback === "shared"
          ? "Share action completed."
          : feedback === "print-blocked"
            ? "Allow pop-ups to open the print view."
            : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div
          className="[&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label={`QR code for ${shopName} Digital Showroom`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Permanent catalogue link</h2>
          <p className="mt-2 break-all rounded-lg border border-border bg-surface-muted p-3 text-sm text-muted-strong">
            {publicUrl}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            The QR uses the configured application URL and your permanent shop slug. It does not contain a tenant ID or secret.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={copyUrl}>Copy URL</Button>
          <Button variant="secondary" onClick={downloadQr}>
            Download SVG
          </Button>
          <Button variant="secondary" onClick={shareUrl}>
            Share
          </Button>
          <Button variant="secondary" onClick={printQr}>
            Print
          </Button>
        </div>

        <p className="min-h-5 text-sm text-muted" role="status" aria-live="polite">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
