"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

import { whatsappHref } from "@/lib/storefront";
import type { PublicProductSummary } from "@/server/storefront/storefront-data";

type ProductInfo = Pick<PublicProductSummary, "slug" | "name" | "sku" | "imageUrl">;
type WishlistItem = ProductInfo & { quantity: number };
type ValidatedProduct = {
  slug: string;
  name: string;
  sku: string | null;
  availabilityStatus: "IN_STOCK" | "ON_REQUEST" | "OUT_OF_STOCK";
};

const MAX_ITEMS = 20;
const MAX_QTY = 10;
type WishlistContextValue = {
  enabled: boolean;
  items: WishlistItem[];
  add: (product: ProductInfo) => void;
  remove: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  open: () => void;
  contains: (slug: string) => boolean;
  error: string | null;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function wishlistKey(slug: string) {
  return `webbanao:wishlist:v1:${slug}`;
}
function validSavedItems(value: unknown): WishlistItem[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  const result: WishlistItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.slug !== "string" || record.slug.length > 191 ||
        !/^[a-z0-9-]+$/.test(record.slug) || used.has(record.slug) ||
        typeof record.name !== "string" || record.name.length > 180) continue;
    used.add(record.slug);
    result.push({
      slug: record.slug,
      name: record.name,
      sku: typeof record.sku === "string" ? record.sku.slice(0, 100) : null,
      imageUrl: typeof record.imageUrl === "string" &&
        /^https:\/\//.test(record.imageUrl) ? record.imageUrl : null,
      quantity: Math.max(1, Math.min(MAX_QTY, Number.isInteger(record.quantity) ?
        Number(record.quantity) : 1)),
    });
    if (result.length >= MAX_ITEMS) break;
  }
  return result;
}

export function WishlistProvider({
  shopSlug, shopName, whatsapp, enabled, children,
}: {
  shopSlug: string;
  shopName: string;
  whatsapp: string | null;
  enabled: boolean;
  children: ReactNode;
}) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const key = wishlistKey(shopSlug);

  useEffect(() => {
    let active = true;
    const read = (value: string | null) => {
      if (!active) return;
      try { setItems(validSavedItems(JSON.parse(value || "[]"))); }
      catch { setItems([]); }
      setReady(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) read(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    // Defer initial storage hydration to the subscription callback,
    // instead of synchronously setting React state within the effect.
    queueMicrotask(() => read(localStorage.getItem(key)));
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const update = useCallback((fn: (previous: WishlistItem[]) => WishlistItem[]) => {
    setItems((previous) => {
      const next = fn(previous);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Browsing still works without storage. */ }
      return next;
    });
  }, [key]);

  const add = useCallback((product: ProductInfo) => {
    if (!enabled) return;
    setError(null);
    update((previous) => {
      if (previous.some((item) => item.slug === product.slug)) {
        return previous;
      }
      if (previous.length >= MAX_ITEMS) {
        setError("Maximum 20 products can be added to one wishlist.");
        return previous;
      }
      return [...previous, {
        slug: product.slug, name: product.name, sku: product.sku,
        imageUrl: product.imageUrl, quantity: 1,
      }];
    });
  }, [enabled, update]);

  const remove = useCallback((slug: string) => {
    setError(null);
    update((previous) => previous.filter((item) => item.slug !== slug));
  }, [update]);
  const updateQuantity = useCallback((slug: string, quantity: number) => {
    update((previous) => previous.map((item) => item.slug === slug ? {
      ...item, quantity: Math.min(MAX_QTY, Math.max(1, quantity)),
    } : item));
  }, [update]);
  const contains = useCallback((slug: string) => items.some((item) => item.slug === slug), [items]);

  const value = useMemo<WishlistContextValue>(() => ({
    enabled, items, add, remove, updateQuantity,
    contains, open: () => { setError(null); setOpen(true); }, error,
  }), [enabled, items, add, remove, updateQuantity, contains, error]);

  async function submit() {
    if (!enabled || sending || !items.length || !whatsapp) return;
    setError(null);
    setSending(true);
    try {
      const response = await fetch(`/api/public/shops/${encodeURIComponent(shopSlug)}/wishlist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: items.map((item) => item.slug) }),
      });
      const body = await response.json() as {
        data?: { products: ValidatedProduct[]; unavailableSlugs: string[] };
        error?: { message?: string };
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message || "Could not verify the selected products. Please retry.");
      }
      if (body.data.unavailableSlugs.length) {
        setError(`No longer available: ${body.data.unavailableSlugs.map((slug) =>
          items.find((item) => item.slug === slug)?.name ?? slug
        ).join(", ")}. Remove these products and retry.`);
        return;
      }
      const map = new Map(body.data.products.map((product) => [product.slug, product]));
      const detail = items.map((item, index) => {
        const product = map.get(item.slug);
        if (!product) return null;
        const link = `${window.location.origin}/s/${encodeURIComponent(shopSlug)}/p/${encodeURIComponent(product.slug)}`;
        const stock = product.availabilityStatus === "OUT_OF_STOCK" ? " (currently out of stock)" : "";
        return [
          `${index + 1}. ${product.name}${stock}`,
          product.sku ? `SKU: ${product.sku}` : null,
          `Quantity: ${item.quantity}`,
          link,
        ].filter(Boolean).join("\n");
      }).filter(Boolean);
      const message = [
        `Hello ${shopName}, I would like to enquire about these products from your Digital Showroom:`,
        "", ...detail, "",
        "Please confirm availability and current prices. Thank you!",
      ].join("\n");
      if (message.length > 6800) {
        throw new Error("Enquiry is too long for WhatsApp. Please remove a few products.");
      }
      const url = whatsappHref(whatsapp, message);
      if (!url) throw new Error("The shop WhatsApp number is not configured correctly.");
      // This opens the WhatsApp draft; only the customer can confirm/send it.
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open WhatsApp enquiry.");
    } finally {
      setSending(false);
    }
  }

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {enabled && isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5"
          role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="wishlist-heading"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
              <div>
                <h2 id="wishlist-heading" className="text-lg font-bold text-foreground">My Wishlist ({items.length})</h2>
                <p className="text-xs text-muted">Review products before sending an enquiry to {shopName}.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close wishlist"
                className="rounded-lg border border-border px-3 py-2 text-sm font-bold">✕</button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Your wishlist is empty. Tap a heart on any product to add it.</p>
              ) : items.map((item) => (
                <div key={item.slug} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {item.imageUrl ? (
                      // Product images can be signed remote R2 URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="size-full object-cover" />
                    ) : <span aria-hidden="true">♡</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a className="text-sm font-bold text-foreground hover:text-primary" href={`/s/${shopSlug}/p/${item.slug}`}>
                      {item.name}
                    </a>
                    {item.sku ? <p className="mt-0.5 text-xs text-muted">SKU: {item.sku}</p> : null}
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" aria-label={`Decrease quantity for ${item.name}`}
                        disabled={item.quantity <= 1} onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                        className="size-8 rounded-lg border border-border text-sm disabled:opacity-40">−</button>
                      <span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" aria-label={`Increase quantity for ${item.name}`}
                        disabled={item.quantity >= MAX_QTY} onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                        className="size-8 rounded-lg border border-border text-sm disabled:opacity-40">+</button>
                      <button type="button" onClick={() => remove(item.slug)} className="ml-auto text-xs font-semibold text-danger hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4 sm:p-5">
              {error ? <p role="alert" className="mb-3 text-sm text-danger">{error}</p> : null}
              <button type="button" onClick={() => setOpen(false)}
                className="mb-3 min-h-10 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
                Continue browsing products
              </button>
              <button type="button" disabled={!ready || !items.length || sending}
                className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                onClick={() => void submit()}>
                {sending ? "Checking products…" : "Send Enquiry on WhatsApp ↗"}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted">
                WhatsApp will open with a draft. Review it and tap Send there. This does not place an order.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </WishlistContext.Provider>
  );
}

export function WishlistHeaderButton() {
  const wishlist = useContext(WishlistContext);
  if (!wishlist?.enabled) return null;
  return (
    <button type="button" onClick={wishlist.open}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-primary-soft"
      aria-label={`Open wishlist with ${wishlist.items.length} products`}>
      <span aria-hidden="true" className="text-lg leading-none">♡</span>
      <span className="hidden sm:inline">Wishlist</span>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
        {wishlist.items.length}
      </span>
    </button>
  );
}

export function WishlistToggle({ product, wide = false }: {
  product: ProductInfo; wide?: boolean;
}) {
  const wishlist = useContext(WishlistContext);
  if (!wishlist?.enabled) return null;
  const included = wishlist.contains(product.slug);
  return (
    <button
      type="button"
      aria-pressed={included}
      aria-label={included ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      title={included ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() => included ? wishlist.remove(product.slug) : wishlist.add(product)}
      className={wide
        ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary"
        : "absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-full border border-border/70 bg-surface/95 text-lg shadow-sm transition hover:scale-105 sm:right-3 sm:top-3"}>
      <span aria-hidden="true" className={included ? "text-red-600" : "text-foreground"}>
        {included ? "♥" : "♡"}
      </span>
      {wide ? (included ? "Saved in Wishlist" : "Add to Wishlist") : null}
    </button>
  );
}
