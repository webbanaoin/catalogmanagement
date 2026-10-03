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

export default async function StorefrontLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ shopSlug: string }>;
}>) {
  const { shopSlug } = await params;

  return (
    <>
      <link rel="manifest" href={`/s/${shopSlug}/manifest.webmanifest`} />
      {children}
    </>
  );
}
