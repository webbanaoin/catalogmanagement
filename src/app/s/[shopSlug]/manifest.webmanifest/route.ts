import { getPublicShop } from "@/server/storefront/storefront-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopSlug: string }> },
) {
  const { shopSlug } = await context.params;
  const shop = await getPublicShop(shopSlug);

  if (!shop) {
    return new Response("Not found", { status: 404 });
  }

  const manifest = {
    id: `/s/${shop.slug}`,
    name: `${shop.name} Digital Showroom`,
    short_name: shop.name.slice(0, 30),
    description:
      shop.tagline ??
      shop.description?.slice(0, 160) ??
      `Browse ${shop.name}'s Digital Showroom.`,
    start_url: `/s/${shop.slug}?src=pwa`,
    scope: `/s/${shop.slug}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
