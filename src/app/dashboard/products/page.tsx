"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ProductImageAdjuster } from "@/components/shop-management/product-image-adjuster";

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
  deleteProductImage,
  duplicateShopProduct,
  getCurrentMerchantShop,
  getShopCategories,
  getShopProduct,
  getShopProducts,
  getShopProfile,
  updateShopProduct,
  setPrimaryProductImage,
  uploadProductImage,
  type MerchantShop,
  type ProductAvailability,
  type ProductPriceType,
  type ShopCategory,
  type ProductImage,
  type ShopProduct,
} from "@/lib/catalog-api";
import {
  catalogAttributeOptions,
  catalogAttributesForGroup,
  getCatalogPreset,
} from "@/lib/catalog-presets";

interface ProductAttributeDraft {
  attributeName: string;
  attributeValue: string;
  displayOrder: number;
}

interface ProductDraft {
  name: string;
  categoryId: string;
  catalogGroup: string;
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
  attributes: ProductAttributeDraft[];
}

const emptyDraft: ProductDraft = {
  name: "",
  categoryId: "",
  catalogGroup: "",
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
  attributes: [],
};

function toDraft(product: ShopProduct): ProductDraft {
  return {
    name: product.name,
    categoryId: product.categoryId ?? "",
    catalogGroup: product.catalogGroup ?? "",
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
    attributes: (product.attributes ?? []).map((attribute, index) => ({
      attributeName: attribute.attributeName,
      attributeValue: attribute.attributeValue,
      displayOrder: attribute.displayOrder ?? index,
    })),
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
  const [businessCategory, setBusinessCategory] = useState<{ name: string; slug: string } | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [managingImagesFor, setManagingImagesFor] = useState<string | null>(null);
  const [managedImages, setManagedImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);
  const [pendingPhotoUpload, setPendingPhotoUpload] = useState<{
    product: ShopProduct;
    files: File[];
    index: number;
  } | null>(null);
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
        const [categoryResponse, productResponse, profileResponse] = await Promise.all([
          getShopCategories(currentShop.id),
          getShopProducts(currentShop.id),
          getShopProfile(currentShop.id),
        ]);
        if (!active) return;
        setShop(currentShop);
        setCategories(categoryResponse.items);
        setProducts(productResponse.items);
        if (profileResponse.data.businessCategory?.slug === "event-planners-decorators") {
          setDraft({ ...emptyDraft, priceType: "ASK_PRICE", availabilityStatus: "ON_REQUEST", catalogGroup: "Decoration" });
        }
        setBusinessCategory(
          profileResponse.data.businessCategory
            ? {
                name: profileResponse.data.businessCategory.name,
                slug: profileResponse.data.businessCategory.slug,
              }
            : null,
        );
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
    setDraft(businessCategory?.slug === "event-planners-decorators"
      ? { ...emptyDraft, priceType: "ASK_PRICE", availabilityStatus: "ON_REQUEST", catalogGroup: "Decoration" }
      : emptyDraft);
  }

  function startEdit(product: ShopProduct) {
    setEditingId(product.id);
    setDraft(toDraft(product));
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const catalogPreset = getCatalogPreset(businessCategory);
  const activeCatalogAttributes = catalogAttributesForGroup(
    catalogPreset,
    draft.catalogGroup,
  );

  function changeCatalogGroup(catalogGroup: string) {
    setDraft((current) => {
      const activeAttributes = catalogAttributesForGroup(catalogPreset, catalogGroup);
      const activeByName = new Map(
        activeAttributes.map((attribute) => [attribute.name, attribute]),
      );

      const attributes = current.attributes.filter((attribute) => {
        const presetAttribute = activeByName.get(attribute.attributeName);
        if (!presetAttribute) return false;

        const options = catalogAttributeOptions(presetAttribute, catalogGroup);
        return options.length === 0 || options.includes(attribute.attributeValue);
      });

      return { ...current, catalogGroup, attributes };
    });
  }

  function productDetailValue(attributeName: string) {
    return (
      draft.attributes.find((attribute) => attribute.attributeName === attributeName)
        ?.attributeValue ?? ""
    );
  }

  function setProductDetail(attributeName: string, attributeValue: string) {
    setDraft((current) => {
      const existingIndex = current.attributes.findIndex(
        (attribute) => attribute.attributeName === attributeName,
      );
      const attributes = [...current.attributes];

      if (existingIndex >= 0) {
        attributes[existingIndex] = {
          ...attributes[existingIndex],
          attributeValue,
        };
      } else {
        attributes.push({
          attributeName,
          attributeValue,
          displayOrder: attributes.length,
        });
      }

      return { ...current, attributes };
    });
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
      catalogGroup: draft.catalogGroup.trim() || null,
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
      attributes: draft.attributes
        .map((attribute) => ({
          attributeName: attribute.attributeName.trim(),
          attributeValue: attribute.attributeValue.trim(),
          displayOrder: attribute.displayOrder,
        }))
        .filter((attribute) => attribute.attributeName && attribute.attributeValue),
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

  async function toggleImageManager(product: ShopProduct) {
    if (!shop || busyId) return;
    if (managingImagesFor === product.id) {
      setManagingImagesFor(null);
      setManagedImages([]);
      return;
    }
    setManagingImagesFor(product.id);
    setManagedImages([]);
    setLoadingImages(true);
    setFeedback(null);
    try {
      const response = await getShopProduct(shop.id, product.id);
      setManagedImages(response.data.images);
    } catch (error) {
      setManagingImagesFor(null);
      setFeedback({
        variant: "error",
        message: error instanceof Error ? error.message : "Unable to load product images.",
      });
    } finally {
      setLoadingImages(false);
    }
  }

  async function selectPrimaryImage(product: ShopProduct, image: ProductImage) {
    if (!shop || busyId || image.isPrimary) return;
    setBusyId(product.id);
    setImageBusyId(image.id);
    setFeedback(null);
    try {
      await setPrimaryProductImage(shop.id, product.id, image.id);
      const [detail] = await Promise.all([
        getShopProduct(shop.id, product.id),
        refreshProducts(shop.id),
      ]);
      setManagedImages(detail.data.images);
      setFeedback({ variant: "success", message: `Primary image updated for ${product.name}.` });
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof Error ? error.message : "Unable to set the primary image.",
      });
    } finally {
      setBusyId(null);
      setImageBusyId(null);
    }
  }

  async function removeProductImage(product: ShopProduct, image: ProductImage) {
    if (!shop || busyId) return;
    const description = image.isPrimary
      ? " The next available image will automatically become primary."
      : "";
    if (!window.confirm(`Permanently delete this image from "${product.name}"? It will also be removed from cloud storage and cannot be restored.${description}`)) {
      return;
    }
    setBusyId(product.id);
    setImageBusyId(image.id);
    setFeedback(null);
    try {
      await deleteProductImage(shop.id, product.id, image.id);
      const [detail] = await Promise.all([
        getShopProduct(shop.id, product.id),
        refreshProducts(shop.id),
      ]);
      setManagedImages(detail.data.images);
      setFeedback({ variant: "success", message: "Image permanently deleted. Image quota is available again." });
    } catch (error) {
      setFeedback({
        variant: "error",
        message: error instanceof Error ? error.message : "Unable to delete this image.",
      });
    } finally {
      setBusyId(null);
      setImageBusyId(null);
    }
  }

  function uploadImages(product: ShopProduct, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!shop || files.length === 0 || busyId) return;

    const invalidType = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (invalidType) {
      setFeedback({
        variant: "error",
        message: `${invalidType.name}: use JPG, PNG or WebP images only.`,
      });
      return;
    }

    // Images remain local until the merchant confirms the square preview.
    setFeedback(null);
    setPendingPhotoUpload({ product, files, index: 0 });
  }

  async function uploadAdjustedPhoto(adjusted: File) {
    const pending = pendingPhotoUpload;
    if (!shop || !pending) return;
    const product = pending.product;
    setBusyId(product.id);
    try {
      await uploadProductImage(shop.id, product.id, adjusted, {
        isPrimary: false,
        displayOrder: (product.imageCount ?? product.images?.length ?? 0) + pending.index,
      });

      const finished = pending.index + 1;
      // A confirmed upload must not repeat if refreshing the product list fails.
      setPendingPhotoUpload(
        finished < pending.files.length
          ? { ...pending, index: finished }
          : null,
      );
      setFeedback({
        variant: "success",
        message: finished < pending.files.length
          ? `Uploaded ${finished} of ${pending.files.length} photos for ${product.name}. Adjust the next photo.`
          : `Uploaded ${finished} adjusted photo${finished === 1 ? "" : "s"} for ${product.name}. Full image and thumbnail are ready for the showroom.`,
      });
      try {
        await refreshProducts(shop.id);
        if (managingImagesFor === product.id) {
          const detail = await getShopProduct(shop.id, product.id);
          setManagedImages(detail.data.images);
        }
      } catch {
        setFeedback({
          variant: "warning",
          message: "Photo uploaded successfully. Refresh the page to see the updated gallery.",
        });
      }
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
        title="Products"
        description="Manage products and upload JPG, PNG or WebP photos. Adjust Fit or Crop, zoom and position before uploading. Images are automatically optimized into full-size photos and thumbnails for the showroom."
      />

      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{businessCategory?.slug === "event-planners-decorators"
            ? (editingId ? "Edit event service" : "Add event service / package")
            : (editingId ? "Edit product" : "Add product")}</CardTitle>
          <CardDescription>
            Product code is optional. Leave it blank and the platform will generate one automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={submit}>
            <Field label={businessCategory?.slug === "event-planners-decorators" ? "Service / package name" : "Product name"} htmlFor="product-name" required>
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
                      {businessCategory?.slug === "event-planners-decorators" && category.parentId
                        ? `${categories.find((p) => p.id === category.parentId)?.parentId ? "　　↳ " : "　↳ "}${category.name}`
                        : category.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field
              label={catalogPreset.groupLabel}
              htmlFor="product-catalog-group"
              hint="Customer-facing high-level grouping. Relevant product details change automatically with this selection."
            >
              {catalogPreset.groups.length > 0 ? (
                <Select
                  id="product-catalog-group"
                  value={draft.catalogGroup}
                  onChange={(event) => changeCatalogGroup(event.target.value)}
                >
                  <option value="">Select {catalogPreset.groupLabel.toLowerCase()}</option>
                  {catalogPreset.groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="product-catalog-group"
                  value={draft.catalogGroup}
                  onChange={(event) => changeCatalogGroup(event.target.value)}
                  maxLength={120}
                  placeholder="Optional collection or department"
                />
              )}
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

            {activeCatalogAttributes.length > 0 ? (
              <div className="md:col-span-2 rounded-xl border border-border bg-surface-muted p-4">
                <div className="mb-4">
                  <p className="font-medium text-foreground">Product details</p>
                  <p className="mt-1 text-sm text-muted">
                    Suggested fields are based on the shop and selected {catalogPreset.groupLabel.toLowerCase()}. Fill only what is useful; blank fields are ignored.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeCatalogAttributes.map((attribute, index) => {
                    const inputId = `product-detail-${index}`;
                    const options = catalogAttributeOptions(
                      attribute,
                      draft.catalogGroup,
                    );

                    return (
                      <Field key={attribute.name} label={attribute.label} htmlFor={inputId}>
                        {options.length > 0 ? (
                          <Select
                            id={inputId}
                            value={productDetailValue(attribute.name)}
                            onChange={(event) =>
                              setProductDetail(attribute.name, event.target.value)
                            }
                          >
                            <option value="">Select {attribute.label.toLowerCase()}</option>
                            {options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            id={inputId}
                            value={productDetailValue(attribute.name)}
                            onChange={(event) =>
                              setProductDetail(attribute.name, event.target.value)
                            }
                            maxLength={500}
                            placeholder={attribute.placeholder}
                          />
                        )}
                      </Field>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
              const primaryImage = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{product.name}</p>
                        {product.catalogGroup ? (
                          <Badge variant="info">{product.catalogGroup}</Badge>
                        ) : null}
                        <Badge variant={product.isVisible ? "success" : "neutral"}>
                          {product.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                        <Badge
                          variant={
                            (product.imageCount ?? product.images?.length ?? 0) === 0
                              ? "warning"
                              : "success"
                          }
                        >
                          {(product.imageCount ?? product.images?.length ?? 0) === 0
                            ? "Actual image needed"
                            : (product.imageCount ?? product.images?.length ?? 0) === 1
                              ? "1 image uploaded"
                              : `${product.imageCount ?? product.images?.length ?? 0} images uploaded`}
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
                        {product.sku ?? "Auto code"} · {product.catalogGroup ? `${catalogPreset.groupLabel}: ${product.catalogGroup} · ` : ""}{product.category?.name ?? "No category"} ·{" "}
                        {product.priceType === "ASK_PRICE" ? "Ask price" : money(product.discountPrice ?? product.price)}
                      </p>
                      <p className="text-xs text-muted">
                        Slug: {product.slug} · Primary image: {primaryImage ? "Uploaded" : "Not set"}
                      </p>
                      {!primaryImage && (product.imageCount ?? product.images?.length ?? 0) === 0 ? (
                        <p className="text-xs font-medium text-primary">
                          Replace default image with actual product photo. Until then your showroom uses any enabled category artwork or its placeholder.
                        </p>
                      ) : null}
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
                      <Button size="sm" variant="secondary" disabled={busyId === product.id} onClick={() => startEdit(product)}>
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
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId !== null || loadingImages}
                        onClick={() => void toggleImageManager(product)}
                        aria-expanded={managingImagesFor === product.id}
                      >
                        {managingImagesFor === product.id ? "Close images" : "Manage images"}
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
                      <label className={buttonClassName("secondary", "sm", busyId !== null || pendingPhotoUpload ? "pointer-events-none opacity-50" : "cursor-pointer")}>
                        {busyId === product.id ? "Uploading…" : (product.imageCount ?? product.images?.length ?? 0) === 0 ? "Replace default image with actual" : "Upload images"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          disabled={busyId !== null || pendingPhotoUpload !== null}
                          onChange={(event) => uploadImages(product, event)}
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
                  {managingImagesFor === product.id ? (
                    <section className="mt-4 border-t border-border pt-4" aria-label={`Manage images for ${product.name}`}>
                      <p className="text-sm font-semibold text-foreground">Product image gallery</p>
                      <p className="mt-1 text-xs text-muted">
                        Choose the main image shown on product cards, or delete unwanted images.
                        Deleting also removes the cloud object and frees image quota.
                      </p>
                      {loadingImages ? (
                        <p className="mt-3 text-sm text-muted">Loading gallery…</p>
                      ) : managedImages.length === 0 ? (
                        <p className="mt-3 text-sm text-muted">No images yet. Use Upload images to add one.</p>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          {managedImages.map((image, index) => (
                            <div key={image.id} className="min-w-0 rounded-lg border border-border bg-surface p-2">
                              {image.thumbnailUrl ?? image.url ? (
                                <a href={image.url ?? image.thumbnailUrl ?? "#"} target="_blank" rel="noreferrer" title="View full image">
                                  <Image
                                    src={image.thumbnailUrl ?? image.url ?? ""}
                                    alt={`${product.name} image ${index + 1}`}
                                    width={160}
                                    height={160}
                                    unoptimized
                                    className="aspect-square w-full rounded-md bg-background object-contain"
                                  />
                                </a>
                              ) : (
                                <div className="flex aspect-square items-center justify-center rounded-md bg-background text-xs text-muted">Image preview unavailable</div>
                              )}
                              <div className="mt-2 flex items-center justify-between gap-1">
                                <span className="text-xs text-muted">Image {index + 1}</span>
                                {image.isPrimary ? <Badge variant="success">Primary</Badge> : null}
                              </div>
                              <div className="mt-2 flex flex-col gap-2">
                                {!image.isPrimary ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={busyId !== null}
                                    onClick={() => void selectPrimaryImage(product, image)}
                                  >
                                    {imageBusyId === image.id ? "Saving…" : "Set as primary"}
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busyId !== null}
                                  onClick={() => void removeProductImage(product, image)}
                                >
                                  {imageBusyId === image.id ? "Working…" : "Delete image"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pendingPhotoUpload ? (
        <ProductImageAdjuster
          key={`${pendingPhotoUpload.product.id}:${pendingPhotoUpload.index}`}
          file={pendingPhotoUpload.files[pendingPhotoUpload.index]!}
          productName={pendingPhotoUpload.product.name}
          index={pendingPhotoUpload.index}
          total={pendingPhotoUpload.files.length}
          onConfirm={uploadAdjustedPhoto}
          onCancel={() => {
            if (!busyId) setPendingPhotoUpload(null);
          }}
        />
      ) : null}

      <Alert title="Catalogue limits">
        Product creation and image uploads are enforced against the shop&apos;s current subscription plan. Bulk product creation remains available through Excel Import when the plan includes it.
      </Alert>
    </div>
  );
}
