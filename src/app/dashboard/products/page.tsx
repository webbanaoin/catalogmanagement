"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
  buttonClassName,
} from "@/components/ui";
import {
  CatalogApiError,
  createShopProduct,
  deleteShopProduct,
  duplicateShopProduct,
  getCurrentMerchantShop,
  getShopCategories,
  getShopProducts,
  updateShopProduct,
  uploadProductImage,
  type MerchantShop,
  type ProductAvailability,
  type ProductPriceType,
  type ShopCategory,
  type ShopProduct,
} from "@/lib/catalog-api";

interface ProductDraft {
  name: string;
  categoryId: string;
  sku: string;
  description: string;
  price: string;
  discountPrice: string;
  priceType: ProductPriceType;
  priceVisibility: "INHERIT" | "SHOW" | "HIDE";
  availabilityStatus: ProductAvailability;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  isVisible: boolean;
}

const emptyDraft: ProductDraft = {
  name: "",
  categoryId: "",
  sku: "",
  description: "",
  price: "",
  discountPrice: "",
  priceType: "FIXED",
  priceVisibility: "INHERIT",
  availabilityStatus: "IN_STOCK",
  isFeatured: false,
  isNewArrival: false,
  isOffer: false,
  isVisible: true,
};

function toDraft(product: ShopProduct): ProductDraft {
  return {
    name: product.name,
    categoryId: product.categoryId ?? "",
    sku: product.sku ?? "",
    description: product.description ?? "",
    price: product.price == null ? "" : String(product.price),
    discountPrice: product.discountPrice == null ? "" : String(product.discountPrice),
    priceType: product.priceType,
    priceVisibility:
      product.showPrice == null ? "INHERIT" : product.showPrice ? "SHOW" : "HIDE",
    availabilityStatus: product.availabilityStatus,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isOffer: product.isOffer,
    isVisible: product.isVisible,
  };
}

function money(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function ProductsPage() {
  const [shop, setShop] = useState<MerchantShop | null>(null);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    variant: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  async function refreshProducts(shopId: string) {
    const response = await getShopProducts(shopId);
    setProducts(response.items);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentShop = await getCurrentMerchantShop();
        const [categoryResponse, productResponse] = await Promise.all([
          getShopCategories(currentShop.id),
          getShopProducts(currentShop.id),
        ]);
        if (!active) return;
        setShop(currentShop);
        setCategories(categoryResponse.items);
        setProducts(productResponse.items);
      } catch (error) {
        if (!active) return;
        setFeedback({
          variant: "error",
          message:
            error instanceof CatalogApiError
              ? error.message
              : "Unable to load the product workspace.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function startEdit(product: ShopProduct) {
    setEditingId(product.id);
    setDraft(toDraft(product));
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;

    const name = draft.name.trim();
    if (!name) {
      setFeedback({ variant: "error", message: "Product name is required." });
      return;
    }

    const payload = {
      name,
      categoryId: draft.categoryId || null,
      sku: draft.sku.trim() || null,
      description: draft.description.trim() || null,
      price: draft.price === "" ? null : Number(draft.price),
      discountPrice: draft.discountPrice === "" ? null : Number(draft.discountPrice),
      priceType: draft.priceType,
      showPrice:
        draft.priceVisibility === "INHERIT"
          ? null
          : draft.priceVisibility === "SHOW",
      availabilityStatus: draft.availabilityStatus,
      isFeatured: draft.isFeatured,
      isNewArrival: draft.isNewArrival,
      isOffer: draft.isOffer,
      isVisible: draft.isVisible,
      attributes: [],
    };

    setSaving(true);
    setFeedback(null);

    try {
      if (editingId) {
        await updateShopProduct(shop.id, editingId, payload);
        setFeedback({ variant: "success", message: "Product updated successfully." });
      } else {
        await createShopProduct(shop.id, payload);
        setFeedback({ variant: "success", message: "Product created successfully." });
      }
      resetForm();
      await refreshProducts(shop.id);
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : "Unable to save this product.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: ShopProduct) {
    if (!shop) return;
    if (!window.confirm(`Delete "${product.name}"? The product can be restored through the API, but it will immediately disappear from the public catalogue.`)) {
      return;
    }

    setBusyId(product.id);
    setFeedback(null);
    try {
      await deleteShopProduct(shop.id, product.id);
      setFeedback({ variant: "success", message: "Product removed from the active catalogue." });
      if (editingId === product.id) resetForm();
      await refreshProducts(shop.id);
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof CatalogApiError ? error.message : "Unable to delete product.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(product: ShopProduct) {
    if (!shop) return;
    setBusyId(product.id);
    setFeedback(null);
    try {
      await duplicateShopProduct(shop.id, product.id);
      setFeedback({
        variant: "success",
        message: "Product duplicated as a hidden copy. Edit it before making it visible.",
      });
      await refreshProducts(shop.id);
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof CatalogApiError ? error.message : "Unable to duplicate product.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function uploadImage(product: ShopProduct, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!shop || !file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ variant: "error", message: "Use a JPG, PNG or WebP image." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ variant: "error", message: "Product image must be 8 MB or smaller." });
      return;
    }

    setBusyId(product.id);
    setFeedback(null);
    try {
      await uploadProductImage(shop.id, product.id, file);
      setFeedback({ variant: "success", message: `Image uploaded for ${product.name}.` });
      await refreshProducts(shop.id);
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof CatalogApiError ? error.message : "Unable to upload product image.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading products"
        description="Preparing the catalogue workspace for your shop."
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Products"
        description="Create, edit, duplicate, hide or remove products and upload product images from one merchant workspace."
        actions={<Badge variant="success">Ready</Badge>}
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit product" : "Add product"}</CardTitle>
          <CardDescription>
            Product code is optional. Leave it blank and the platform will generate one automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={submit}>
            <Field label="Product name" htmlFor="product-name" required>
              <Input
                id="product-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                maxLength={180}
                required
              />
            </Field>

            <Field label="Category" htmlFor="product-category">
              <Select
                id="product-category"
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              >
                <option value="">No category</option>
                {categories
                  .filter((category) => category.status === "ACTIVE")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Product code / SKU" htmlFor="product-sku" hint="Optional. Blank values are generated automatically.">
              <Input
                id="product-sku"
                value={draft.sku}
                onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
                maxLength={100}
              />
            </Field>

            <Field label="Availability" htmlFor="product-availability">
              <Select
                id="product-availability"
                value={draft.availabilityStatus}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    availabilityStatus: event.target.value as ProductAvailability,
                  })
                }
              >
                <option value="IN_STOCK">In stock</option>
                <option value="OUT_OF_STOCK">Out of stock</option>
                <option value="ON_REQUEST">On request</option>
              </Select>
            </Field>

            <Field label="Price type" htmlFor="product-price-type">
              <Select
                id="product-price-type"
                value={draft.priceType}
                onChange={(event) =>
                  setDraft({ ...draft, priceType: event.target.value as ProductPriceType })
                }
              >
                <option value="FIXED">Fixed</option>
                <option value="STARTING_FROM">Starting from</option>
                <option value="ASK_PRICE">Ask price</option>
              </Select>
            </Field>

            <Field
              label="Price visibility"
              htmlFor="product-price-visibility"
              hint="Use shop setting by default, or override this product only."
            >
              <Select
                id="product-price-visibility"
                value={draft.priceVisibility}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    priceVisibility: event.target.value as ProductDraft["priceVisibility"],
                  })
                }
              >
                <option value="INHERIT">Use shop setting</option>
                <option value="SHOW">Always show price</option>
                <option value="HIDE">Always hide price</option>
              </Select>
            </Field>

            <Field
              label="Price"
              htmlFor="product-price"
              hint="Optional. Leave blank when the current price should be shared only on request."
            >
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </Field>

            <Field label="Discount price" htmlFor="product-discount">
              <Input
                id="product-discount"
                type="number"
                min="0"
                step="0.01"
                value={draft.discountPrice}
                onChange={(event) => setDraft({ ...draft, discountPrice: event.target.value })}
              />
            </Field>

            <Field label="Description" htmlFor="product-description" className="md:col-span-2">
              <Textarea
                id="product-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                maxLength={20000}
              />
            </Field>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 md:col-span-2">
              {[
                ["isVisible", "Visible"],
                ["isFeatured", "Featured"],
                ["isNewArrival", "New arrival"],
                ["isOffer", "Offer"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={draft[key as keyof ProductDraft] as boolean}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update product" : "Add product"}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create the first product here or use Excel Import for bulk catalogue creation."
          action={
            <Link href="/dashboard/import" className={buttonClassName("secondary", "sm")}>
              Open Excel Import
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Catalogue products</CardTitle>
            <CardDescription>{products.length} active product{products.length === 1 ? "" : "s"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map((product) => {
              const primaryImage = product.images?.[0];
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <Badge variant={product.isVisible ? "success" : "neutral"}>
                          {product.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                        <Badge variant="info">{product.availabilityStatus.replaceAll("_", " ")}</Badge>
                        {product.isFeatured ? <Badge variant="warning">Featured</Badge> : null}
                        {product.isNewArrival ? <Badge variant="info">New</Badge> : null}
                        {product.isOffer ? <Badge variant="warning">Offer</Badge> : null}
                        <Badge variant="neutral">
                          {product.priceType === "ASK_PRICE"
                            ? "Price on request"
                            : product.showPrice == null
                              ? "Price: shop setting"
                              : product.showPrice
                                ? "Price shown"
                                : "Price hidden"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">
                        {product.sku ?? "Auto code"} · {product.category?.name ?? "No category"} ·{" "}
                        {product.priceType === "ASK_PRICE" ? "Ask price" : money(product.discountPrice ?? product.price)}
                      </p>
                      <p className="text-xs text-muted">
                        Slug: {product.slug} · {primaryImage ? "Image ready" : "No image yet"}
                      </p>
                      {primaryImage?.url ? (
                        <a
                          href={primaryImage.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View primary image
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(product)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === product.id}
                        onClick={() => void duplicate(product)}
                      >
                        Duplicate
                      </Button>
                      {shop && product.isVisible ? (
                        <Link
                          href={`/s/${shop.slug}/p/${product.slug}`}
                          target="_blank"
                          className={buttonClassName("secondary", "sm")}
                        >
                          View public
                        </Link>
                      ) : null}
                      <label className={buttonClassName("secondary", "sm", busyId === product.id ? "pointer-events-none opacity-50" : "cursor-pointer")}>
                        {busyId === product.id ? "Working…" : "Upload image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={busyId === product.id}
                          onChange={(event) => void uploadImage(product, event)}
                        />
                      </label>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === product.id}
                        onClick={() => void remove(product)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Alert title="Catalogue limits">
        Product creation and image uploads are enforced against the shop&apos;s current subscription plan. Bulk product creation remains available through Excel Import when the plan includes it.
      </Alert>
    </div>
  );
}
