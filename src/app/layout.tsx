import type { Metadata } from "next";
import Script from "next/script";
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
      </body>
    </html>
  );
}
