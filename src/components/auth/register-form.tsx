"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { AuthApiError, registerMerchant } from "@/lib/auth-api";
import { getBusinessCategories, type BusinessCategory } from "@/lib/catalog-api";
import {
  isValidEmail,
  isValidIndianMobile,
  isValidIndianPhone,
  isValidIndianPincode,
} from "@/lib/validation";

type FieldErrors = Record<string, string>;

function rawValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function optionalValue(formData: FormData, name: string): string | undefined {
  const value = rawValue(formData, name).trim();
  return value || undefined;
}

function validateRegistration(formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const name = rawValue(formData, "name").trim();
  const email = rawValue(formData, "email").trim();
  const password = rawValue(formData, "password");
  const shopName = rawValue(formData, "shopName").trim();
  const businessCategoryId = rawValue(formData, "businessCategoryId").trim();
  const requestedBusinessType = rawValue(formData, "requestedBusinessType").trim();

  if (name.length < 2) {
    errors.name = name ? "Name must contain at least 2 characters." : "Name is required.";
  } else if (name.length > 120) {
    errors.name = "Name must contain at most 120 characters.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (password.length < 10) {
    errors.password = "Password must contain at least 10 characters.";
  } else if (password.length > 128) {
    errors.password = "Password must contain at most 128 characters.";
  }

  if (shopName.length < 2) {
    errors.shopName = shopName
      ? "Shop name must contain at least 2 characters."
      : "Shop name is required.";
  } else if (shopName.length > 160) {
    errors.shopName = "Shop name must contain at most 160 characters.";
  }

  if (businessCategoryId === "__OTHER__") {
    if (requestedBusinessType.length < 2) {
      errors.requestedBusinessType = requestedBusinessType
        ? "Business type must contain at least 2 characters."
        : "Mention your business type.";
    } else if (requestedBusinessType.length > 160) {
      errors.requestedBusinessType =
        "Business type must contain at most 160 characters.";
    }
  }

  const mobile = rawValue(formData, "mobile");
  if (mobile && !mobile.trim()) {
    errors.mobile = "Mobile number cannot contain only spaces.";
  } else if (mobile.trim() && !isValidIndianMobile(mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  }

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

  for (const [field, label] of [
    ["city", "City"],
    ["state", "State"],
  ] as const) {
    const raw = rawValue(formData, field);
    const trimmed = raw.trim();

    if (raw && !trimmed) {
      errors[field] = `${label} cannot contain only spaces.`;
    } else if (trimmed.length > 120) {
      errors[field] = `${label} must contain at most 120 characters.`;
    }
  }

  const pincode = rawValue(formData, "pincode");
  if (pincode && !pincode.trim()) {
    errors.pincode = "PIN cannot contain only spaces.";
  } else if (pincode.trim() && !isValidIndianPincode(pincode)) {
    errors.pincode = "Enter a valid 6-digit Indian PIN.";
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

function describedBy(id: string, error: string | undefined, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

export function RegisterForm({
  initialReferralCode = "",
}: {
  initialReferralCode?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [businessTypeChoice, setBusinessTypeChoice] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);

  useEffect(() => {
    let active = true;
    void getBusinessCategories()
      .then((response) => {
        if (active) setBusinessCategories(response.items);
      })
      .catch(() => {
        // Registration remains available with the generic catalogue model.
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const clientErrors = validateRegistration(formData);

    setFormError("");

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      focusFirstInvalid(form, clientErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      await registerMerchant({
        name: rawValue(formData, "name").trim(),
        email: rawValue(formData, "email").trim(),
        mobile: optionalValue(formData, "mobile"),
        password: rawValue(formData, "password"),
        shopName: rawValue(formData, "shopName").trim(),
        businessCategoryId:
          businessTypeChoice && businessTypeChoice !== "__OTHER__"
            ? businessTypeChoice
            : undefined,
        requestedBusinessType:
          businessTypeChoice === "__OTHER__"
            ? optionalValue(formData, "requestedBusinessType")
            : undefined,
        phone: optionalValue(formData, "phone"),
        whatsapp: optionalValue(formData, "whatsapp"),
        city: optionalValue(formData, "city"),
        state: optionalValue(formData, "state"),
        pincode: optionalValue(formData, "pincode"),
        referralCode: optionalValue(formData, "referralCode"),
      });

      router.push("/pending-approval");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fields);
        setFormError(error.message);
        focusFirstInvalid(form, error.fields);
      } else {
        setFormError("Unable to submit registration. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={fieldErrors.name} required>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={describedBy("name", fieldErrors.name)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={describedBy("email", fieldErrors.email)}
          />
        </Field>
      </div>

      <Field
        label="Password"
        htmlFor="password"
        hint="Use 10 to 128 characters."
        error={fieldErrors.password}
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={describedBy("password", fieldErrors.password, true)}
        />
      </Field>

      <Field label="Shop name" htmlFor="shopName" error={fieldErrors.shopName} required>
        <Input
          id="shopName"
          name="shopName"
          autoComplete="organization"
          minLength={2}
          maxLength={160}
          required
          aria-invalid={Boolean(fieldErrors.shopName)}
          aria-describedby={describedBy("shopName", fieldErrors.shopName)}
        />
      </Field>

      <div className="space-y-4">
        <Field
          label="Business type"
          htmlFor="businessCategoryId"
          hint="Choose the closest match. If your business is not listed, select Other and tell us what you sell."
          error={fieldErrors.businessCategoryId}
        >
          <Select
            id="businessCategoryId"
            name="businessCategoryId"
            value={businessTypeChoice}
            onChange={(event) => {
              setBusinessTypeChoice(event.target.value);
              setFieldErrors((current) => ({
                ...current,
                businessCategoryId: "",
                requestedBusinessType: "",
              }));
            }}
            aria-invalid={Boolean(fieldErrors.businessCategoryId)}
            aria-describedby={describedBy("businessCategoryId", fieldErrors.businessCategoryId, true)}
          >
            <option value="">Select business type</option>
            {businessCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="__OTHER__">Other</option>
          </Select>
        </Field>

        {businessTypeChoice === "__OTHER__" ? (
          <Field
            label="Mention your business"
            htmlFor="requestedBusinessType"
            hint="We will review the request before approval and map your shop to the best supported business type."
            error={fieldErrors.requestedBusinessType}
            required
          >
            <Input
              id="requestedBusinessType"
              name="requestedBusinessType"
              placeholder="e.g. Medical equipment shop"
              minLength={2}
              maxLength={160}
              required
              aria-invalid={Boolean(fieldErrors.requestedBusinessType)}
              aria-describedby={describedBy(
                "requestedBusinessType",
                fieldErrors.requestedBusinessType,
                true,
              )}
            />
          </Field>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Mobile"
          htmlFor="mobile"
          hint="10-digit Indian mobile number; +91 formatting is also accepted."
          error={fieldErrors.mobile}
        >
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={18}
            aria-invalid={Boolean(fieldErrors.mobile)}
            aria-describedby={describedBy("mobile", fieldErrors.mobile, true)}
          />
        </Field>

        <Field
          label="Shop phone"
          htmlFor="phone"
          hint="Indian mobile or landline number."
          error={fieldErrors.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={describedBy("phone", fieldErrors.phone, true)}
          />
        </Field>
      </div>

      <Field
        label="WhatsApp number"
        htmlFor="whatsapp"
        hint="Optional 10-digit Indian mobile number; +91 formatting is accepted."
        error={fieldErrors.whatsapp}
      >
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          maxLength={18}
          aria-invalid={Boolean(fieldErrors.whatsapp)}
          aria-describedby={describedBy("whatsapp", fieldErrors.whatsapp, true)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="city" error={fieldErrors.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            maxLength={120}
            aria-invalid={Boolean(fieldErrors.city)}
            aria-describedby={describedBy("city", fieldErrors.city)}
          />
        </Field>

        <Field label="State" htmlFor="state" error={fieldErrors.state}>
          <Input
            id="state"
            name="state"
            autoComplete="address-level1"
            maxLength={120}
            aria-invalid={Boolean(fieldErrors.state)}
            aria-describedby={describedBy("state", fieldErrors.state)}
          />
        </Field>

        <Field
          label="PIN"
          htmlFor="pincode"
          hint="6-digit Indian PIN."
          error={fieldErrors.pincode}
        >
          <Input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            pattern="[1-9][0-9]{5}"
            aria-invalid={Boolean(fieldErrors.pincode)}
            aria-describedby={describedBy("pincode", fieldErrors.pincode, true)}
          />
        </Field>
      </div>

      <Field
        label="Referral code"
        htmlFor="referralCode"
        hint="Optional. If a Webbanao marketing partner referred you, enter their code here."
        error={fieldErrors.referralCode}
      >
        <Input
          id="referralCode"
          name="referralCode"
          value={referralCode}
          onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
          maxLength={80}
          placeholder="e.g. WEB-RAHUL-A1B2C3"
          autoCapitalize="characters"
          aria-invalid={Boolean(fieldErrors.referralCode)}
          aria-describedby={describedBy("referralCode", fieldErrors.referralCode, true)}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating registration…" : "Create merchant account"}
      </Button>
    </form>
  );
}
