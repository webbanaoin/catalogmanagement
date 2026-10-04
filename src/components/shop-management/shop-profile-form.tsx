"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingState,
  Select,
  Textarea,
} from "@/components/ui";
import {
  CatalogApiError,
  getBusinessCategories,
  getCurrentMerchantShop,
  getShopProfile,
  updateShopProfile,
  type BusinessCategory,
  type ShopProfile,
} from "@/lib/catalog-api";
import {
  isValidEmail,
  isValidHttpUrl,
  isValidIndianMobile,
  isValidIndianPhone,
  isValidIndianPincode,
} from "@/lib/validation";

type FieldErrors = Record<string, string>;

function rawValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function optionalTextError(formData: FormData, field: string, label: string, maxLength?: number) {
  const raw = rawValue(formData, field);
  const trimmed = raw.trim();
  if (raw && !trimmed) return `${label} cannot contain only spaces.`;
  if (maxLength && trimmed.length > maxLength) return `${label} must contain at most ${maxLength} characters.`;
  return undefined;
}

function validateProfile(formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const shopName = rawValue(formData, "shopName").trim();

  if (shopName.length < 2) errors.shopName = shopName ? "Shop name must contain at least 2 characters." : "Shop name is required.";
  else if (shopName.length > 160) errors.shopName = "Shop name must contain at most 160 characters.";

  for (const [field, label, maxLength] of [
    ["tagline", "Tagline", 255],
    ["address", "Address", 500],
    ["city", "City", 120],
    ["state", "State", 120],
  ] as const) {
    const error = optionalTextError(formData, field, label, maxLength);
    if (error) errors[field] = error;
  }

  const descriptionError = optionalTextError(formData, "description", "About the shop");
  if (descriptionError) errors.description = descriptionError;

  const phone = rawValue(formData, "phone");
  if (phone && !phone.trim()) errors.phone = "Shop phone cannot contain only spaces.";
  else if (phone.trim() && !isValidIndianPhone(phone)) errors.phone = "Enter a valid Indian phone number.";

  const whatsapp = rawValue(formData, "whatsapp");
  if (whatsapp && !whatsapp.trim()) errors.whatsapp = "WhatsApp number cannot contain only spaces.";
  else if (whatsapp.trim() && !isValidIndianMobile(whatsapp)) errors.whatsapp = "Enter a valid 10-digit Indian mobile number.";

  const email = rawValue(formData, "email").trim();
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";

  const pincode = rawValue(formData, "pincode");
  if (pincode && !pincode.trim()) errors.pincode = "PIN cannot contain only spaces.";
  else if (pincode.trim() && !isValidIndianPincode(pincode)) errors.pincode = "Enter a valid 6-digit Indian PIN.";

  for (const [field, label] of [
    ["googleMapsUrl", "Google Maps URL"],
    ["instagramUrl", "Instagram URL"],
    ["facebookUrl", "Facebook URL"],
  ] as const) {
    const value = rawValue(formData, field);
    if (value && !value.trim()) errors[field] = `${label} cannot contain only spaces.`;
    else if (value.trim() && !isValidHttpUrl(value)) errors[field] = "Enter a valid http:// or https:// URL.";
  }

  return errors;
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;
  if (control instanceof HTMLElement) control.focus();
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function ShopProfileForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [shopId, setShopId] = useState("");
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [shop, categoryResponse] = await Promise.all([
          getCurrentMerchantShop(),
          getBusinessCategories(),
        ]);
        const profileResponse = await getShopProfile(shop.id);
        if (!active) return;
        setShopId(shop.id);
        setBusinessCategories(categoryResponse.items);
        setProfile(profileResponse.data);
      } catch (error) {
        if (!active) return;
        setFeedback({
          variant: "error",
          message: error instanceof CatalogApiError ? error.message : "Unable to load the shop profile.",
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const errors = validateProfile(formData);

    setFeedback(null);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid(form, errors);
      return;
    }

    if (!shopId) {
      setFeedback({ variant: "error", message: "No approved shop is available for this account." });
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const response = await updateShopProfile(shopId, {
        name: rawValue(formData, "shopName").trim(),
        businessCategoryId: optional(rawValue(formData, "businessCategoryId")),
        tagline: optional(rawValue(formData, "tagline")),
        description: optional(rawValue(formData, "description")),
        phone: optional(rawValue(formData, "phone")),
        whatsapp: optional(rawValue(formData, "whatsapp")),
        email: optional(rawValue(formData, "email")),
        address: optional(rawValue(formData, "address")),
        city: optional(rawValue(formData, "city")),
        state: optional(rawValue(formData, "state")),
        pincode: optional(rawValue(formData, "pincode")),
        googleMapsUrl: optional(rawValue(formData, "googleMapsUrl")),
        instagramUrl: optional(rawValue(formData, "instagramUrl")),
        facebookUrl: optional(rawValue(formData, "facebookUrl")),
        showProductPrices: formData.get("showProductPrices") === "on",
      });
      setProfile((current) => ({ ...current, ...response.data } as ShopProfile));
      setFeedback({ variant: "success", message: "Shop profile saved successfully." });
    } catch (error) {
      if (error instanceof CatalogApiError) {
        setFieldErrors(error.fields);
        setFeedback({ variant: "error", message: error.message });
      } else {
        setFeedback({ variant: "error", message: "Unable to save the shop profile." });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState title="Loading shop profile" description="Fetching your tenant-safe merchant profile." />;
  }

  if (!profile) {
    return <Alert variant="error">{feedback?.message ?? "Shop profile is unavailable."}</Alert>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Shop identity</CardTitle>
          <CardDescription>Update the customer-facing identity of this shop.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Shop name" htmlFor="profile-shop-name" error={fieldErrors.shopName ?? fieldErrors.name} required>
            <Input id="profile-shop-name" name="shopName" defaultValue={profile.name} autoComplete="organization" minLength={2} maxLength={160} required />
          </Field>

          <Field label="Business category" htmlFor="profile-business-category">
            <Select id="profile-business-category" name="businessCategoryId" defaultValue={profile.businessCategoryId ?? ""}>
              <option value="">Select business category</option>
              {businessCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </Field>

          <Field label="Tagline" htmlFor="profile-tagline" error={fieldErrors.tagline}>
            <Input id="profile-tagline" name="tagline" defaultValue={profile.tagline ?? ""} maxLength={255} />
          </Field>

          <Field label="About the shop" htmlFor="profile-description" error={fieldErrors.description}>
            <Textarea id="profile-description" name="description" defaultValue={profile.description ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle><CardDescription>Phase 1 uses India-specific phone and WhatsApp validation.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Shop phone" htmlFor="profile-phone" hint="Indian mobile or landline number." error={fieldErrors.phone}>
            <Input id="profile-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} maxLength={20} />
          </Field>
          <Field label="WhatsApp" htmlFor="profile-whatsapp" hint="10-digit Indian mobile number; +91 formatting is accepted." error={fieldErrors.whatsapp}>
            <Input id="profile-whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={profile.whatsapp ?? ""} maxLength={18} />
          </Field>
          <Field label="Shop email" htmlFor="profile-email" error={fieldErrors.email} className="sm:col-span-2">
            <Input id="profile-email" name="email" type="email" autoComplete="email" defaultValue={profile.email ?? ""} maxLength={191} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle><CardDescription>Address fields stay flexible while PIN validation follows the India-only Phase 1 decision.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <Field label="Address" htmlFor="profile-address" error={fieldErrors.address}>
            <Textarea id="profile-address" name="address" autoComplete="street-address" defaultValue={profile.address ?? ""} maxLength={500} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City" htmlFor="profile-city" error={fieldErrors.city}><Input id="profile-city" name="city" defaultValue={profile.city ?? ""} maxLength={120} /></Field>
            <Field label="State" htmlFor="profile-state" error={fieldErrors.state}><Input id="profile-state" name="state" defaultValue={profile.state ?? ""} maxLength={120} /></Field>
            <Field label="PIN" htmlFor="profile-pincode" hint="6-digit Indian PIN." error={fieldErrors.pincode}><Input id="profile-pincode" name="pincode" inputMode="numeric" defaultValue={profile.pincode ?? ""} maxLength={6} /></Field>
          </div>
          <Field label="Google Maps URL" htmlFor="profile-maps-url" hint="Use a complete http:// or https:// link." error={fieldErrors.googleMapsUrl}>
            <Input id="profile-maps-url" name="googleMapsUrl" type="url" defaultValue={profile.googleMapsUrl ?? ""} maxLength={1024} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product price visibility</CardTitle>
          <CardDescription>
            Control the default price display for your storefront. Individual products can override this setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 text-sm text-foreground">
            <input
              name="showProductPrices"
              type="checkbox"
              defaultChecked={profile.showProductPrices ?? true}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Show product prices by default</span>
              <span className="mt-1 block leading-6 text-muted">
                Turn this off for jewellery or enquiry-led catalogues. Products with an individual visibility override can still show or hide their price.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social links</CardTitle><CardDescription>Optional links shown on the public storefront in a later sprint.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram URL" htmlFor="profile-instagram-url" error={fieldErrors.instagramUrl}><Input id="profile-instagram-url" name="instagramUrl" type="url" defaultValue={profile.instagramUrl ?? ""} maxLength={1024} /></Field>
          <Field label="Facebook URL" htmlFor="profile-facebook-url" error={fieldErrors.facebookUrl}><Input id="profile-facebook-url" name="facebookUrl" type="url" defaultValue={profile.facebookUrl ?? ""} maxLength={1024} /></Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        <p className="text-sm leading-6 text-muted">Changes are saved to this authenticated merchant shop only.</p>
      </div>
    </form>
  );
}
