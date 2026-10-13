import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Showroom",
  description: "A digital catalogue platform for local retailers.",
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/pwa/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Digital Showroom",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script id="digital-showroom-install-prompt" strategy="beforeInteractive">
          {`
            window.__digitalShowroomInstallPrompt = null;
            window.__digitalShowroomInstalled = false;
            window.addEventListener("beforeinstallprompt", function (event) {
              event.preventDefault();
              window.__digitalShowroomInstallPrompt = event;
              window.dispatchEvent(new Event("digital-showroom-install-prompt"));
            });
            window.addEventListener("appinstalled", function () {
              window.__digitalShowroomInstallPrompt = null;
              window.__digitalShowroomInstalled = true;
              window.dispatchEvent(new Event("digital-showroom-app-installed"));
            });
          `}
        </Script>
        {children}
        <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted" aria-label="Legal and support links">
          <nav className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/refund-policy">Refund & Cancellation</Link><Link href="/support">Support</Link>
          </nav>
          <p className="mt-2">© Webbanao Digital Showroom</p>
        </footer>
      </body>
    </html>
  );
}
