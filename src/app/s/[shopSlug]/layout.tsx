import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}): Promise<Metadata> {
  const { shopSlug } = await params;

  return {
    manifest: `/s/${shopSlug}/manifest.webmanifest`,
  };
}

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
