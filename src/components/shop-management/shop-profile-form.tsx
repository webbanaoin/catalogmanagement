"use client";

import { useState, type FormEvent } from "react";

import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Textarea } from "@/components/ui";
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

function describedBy(id: string, error: string | undefined, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

function optionalTextError(
  formData: FormData,
  field: string,
  label: string,
  maxLength?: number,
): string | undefined {
  const raw = rawValue(formData, field);
  const trimmed = raw.trim();

  if (raw && !trimmed) {
    return `${label} cannot contain only spaces.`;
  }

  if (maxLength && trimmed.length > maxLength) {
    return `${label} must contain at most ${maxLength} characters.`;
  }

  return undefined;
}

function validateProfile(formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const shopName = rawValue(formData, "shopName").trim();

  if (shopName.length < 2) {
    errors.shopName = shopName
      ? "Shop name must contain at least 2 characters."
      : "Shop name is required.";
  } else if (shopName.length > 160) {
    errors.shopName = "Shop name must contain at most 160 characters.";
  }

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
  if (phone && !phone.trim()) {
    errors.phone = "Shop phone cannot contain only spaces.";
  } else if (phone.trim() && !isValidIndianPhone(phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  const whatsapp = rawValue(formData, "whatsapp");
  if (whatsapp && !whatsapp.trim()) {
    errors.whatsapp = "WhatsApp number cannot contain only spaces.";
  } else if (whatsapp.trim() && !isValidIndianMobile(whatsapp)) {
    errors.whatsapp = "Enter a valid 10-digit Indian mobile number.";
  }

  const email = rawValue(formData, "email").trim();
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  const pincode = rawValue(formData, "pincode");
  if (pincode && !pincode.trim()) {
    errors.pincode = "PIN cannot contain only spaces.";
  } else if (pincode.trim() && !isValidIndianPincode(pincode)) {
    errors.pincode = "Enter a valid 6-digit Indian PIN.";
  }

  for (const [field, label] of [
    ["googleMapsUrl", "Google Maps URL"],
    ["instagramUrl", "Instagram URL"],
    ["facebookUrl", "Facebook URL"],
  ] as const) {
    const value = rawValue(formData, field);

    if (value && !value.trim()) {
      errors[field] = `${label} cannot contain only spaces.`;
    } else if (value.trim() && !isValidHttpUrl(value)) {
      errors[field] = "Enter a valid http:// or https:// URL.";
    }
  }

  return errors;
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;

  if (control instanceof HTMLElement) {
    control.focus();
  }
}

export function ShopProfileForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [reviewMessage, setReviewMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const errors = validateProfile(new FormData(form));

    setReviewMessage("");

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid(form, errors);
      return;
    }

    setFieldErrors({});
    setReviewMessage(
      "Profile fields pass the current Sprint 2 client validation. No data was sent; saving will be enabled only after the tenant-safe shop-profile API contract is frozen.",
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {reviewMessage ? <Alert variant="success">{reviewMessage}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Shop identity</CardTitle>
          <CardDescription>
            Review the merchant-facing profile fields without inventing a persistence contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Shop name" htmlFor="profile-shop-name" error={fieldErrors.shopName} required>
            <Input
              id="profile-shop-name"
              name="shopName"
              autoComplete="organization"
              minLength={2}
              maxLength={160}
              required
              aria-invalid={Boolean(fieldErrors.shopName)}
              aria-describedby={describedBy("profile-shop-name", fieldErrors.shopName)}
            />
          </Field>

          <Field label="Tagline" htmlFor="profile-tagline" error={fieldErrors.tagline}>
            <Input
              id="profile-tagline"
              name="tagline"
              maxLength={255}
              aria-invalid={Boolean(fieldErrors.tagline)}
              aria-describedby={describedBy("profile-tagline", fieldErrors.tagline)}
            />
          </Field>

          <Field label="About the shop" htmlFor="profile-description" error={fieldErrors.description}>
            <Textarea
              id="profile-description"
              name="description"
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={describedBy("profile-description", fieldErrors.description)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Phase 1 uses India-specific phone and WhatsApp validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Shop phone"
            htmlFor="profile-phone"
            hint="Indian mobile or landline number."
            error={fieldErrors.phone}
          >
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={describedBy("profile-phone", fieldErrors.phone, true)}
            />
          </Field>

          <Field
            label="WhatsApp"
            htmlFor="profile-whatsapp"
            hint="10-digit Indian mobile number; +91 formatting is accepted."
            error={fieldErrors.whatsapp}
          >
            <Input
              id="profile-whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              maxLength={18}
              aria-invalid={Boolean(fieldErrors.whatsapp)}
              aria-describedby={describedBy("profile-whatsapp", fieldErrors.whatsapp, true)}
            />
          </Field>

          <Field
            label="Shop email"
            htmlFor="profile-email"
            error={fieldErrors.email}
            className="sm:col-span-2"
          >
            <Input
              id="profile-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={191}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={describedBy("profile-email", fieldErrors.email)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Address fields stay flexible while PIN validation follows the India-only Phase 1 decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Address" htmlFor="profile-address" error={fieldErrors.address}>
            <Textarea
              id="profile-address"
              name="address"
              autoComplete="street-address"
              maxLength={500}
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={describedBy("profile-address", fieldErrors.address)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City" htmlFor="profile-city" error={fieldErrors.city}>
              <Input
                id="profile-city"
                name="city"
                autoComplete="address-level2"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.city)}
                aria-describedby={describedBy("profile-city", fieldErrors.city)}
              />
            </Field>

            <Field label="State" htmlFor="profile-state" error={fieldErrors.state}>
              <Input
                id="profile-state"
                name="state"
                autoComplete="address-level1"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.state)}
                aria-describedby={describedBy("profile-state", fieldErrors.state)}
              />
            </Field>

            <Field
              label="PIN"
              htmlFor="profile-pincode"
              hint="6-digit Indian PIN."
              error={fieldErrors.pincode}
            >
              <Input
                id="profile-pincode"
                name="pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                pattern="[1-9][0-9]{5}"
                aria-invalid={Boolean(fieldErrors.pincode)}
                aria-describedby={describedBy("profile-pincode", fieldErrors.pincode, true)}
              />
            </Field>
          </div>

          <Field
            label="Google Maps URL"
            htmlFor="profile-maps-url"
            hint="Use a complete http:// or https:// link."
            error={fieldErrors.googleMapsUrl}
          >
            <Input
              id="profile-maps-url"
              name="googleMapsUrl"
              type="url"
              inputMode="url"
              maxLength={1024}
              aria-invalid={Boolean(fieldErrors.googleMapsUrl)}
              aria-describedby={describedBy("profile-maps-url", fieldErrors.googleMapsUrl, true)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
          <CardDescription>Optional links stay presentation-only until profile persistence is available.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram URL" htmlFor="profile-instagram-url" error={fieldErrors.instagramUrl}>
            <Input
              id="profile-instagram-url"
              name="instagramUrl"
              type="url"
              inputMode="url"
              maxLength={1024}
              aria-invalid={Boolean(fieldErrors.instagramUrl)}
              aria-describedby={describedBy("profile-instagram-url", fieldErrors.instagramUrl)}
            />
          </Field>

          <Field label="Facebook URL" htmlFor="profile-facebook-url" error={fieldErrors.facebookUrl}>
            <Input
              id="profile-facebook-url"
              name="facebookUrl"
              type="url"
              inputMode="url"
              maxLength={1024}
              aria-invalid={Boolean(fieldErrors.facebookUrl)}
              aria-describedby={describedBy("profile-facebook-url", fieldErrors.facebookUrl)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit">Review profile fields</Button>
        <p className="text-sm leading-6 text-muted">
          This action validates locally only. It does not create or update merchant data.
        </p>
      </div>
    </form>
  );
}
