"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, registerMerchant } from "@/lib/auth-api";

function optionalValue(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setFormError("");
    setFieldErrors({});

    try {
      await registerMerchant({
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        mobile: optionalValue(formData, "mobile"),
        password: String(formData.get("password") ?? ""),
        shopName: String(formData.get("shopName") ?? "").trim(),
        phone: optionalValue(formData, "phone"),
        whatsapp: optionalValue(formData, "whatsapp"),
        city: optionalValue(formData, "city"),
        state: optionalValue(formData, "state"),
        pincode: optionalValue(formData, "pincode"),
      });

      router.push("/pending-approval");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError("Unable to submit registration. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
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
          />
        </Field>
      </div>

      <Field
        label="Password"
        htmlFor="password"
        hint="Use at least 10 characters."
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
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mobile" htmlFor="mobile" error={fieldErrors.mobile}>
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            autoComplete="tel"
            minLength={7}
            maxLength={30}
            aria-invalid={Boolean(fieldErrors.mobile)}
          />
        </Field>

        <Field label="Shop phone" htmlFor="phone" error={fieldErrors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            minLength={7}
            maxLength={30}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>
      </div>

      <Field
        label="WhatsApp number"
        htmlFor="whatsapp"
        hint="Optional. If omitted, the backend may use another available shop contact according to the finalized contract."
        error={fieldErrors.whatsapp}
      >
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          minLength={7}
          maxLength={30}
          aria-invalid={Boolean(fieldErrors.whatsapp)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="city" error={fieldErrors.city}>
          <Input id="city" name="city" autoComplete="address-level2" maxLength={120} />
        </Field>

        <Field label="State" htmlFor="state" error={fieldErrors.state}>
          <Input id="state" name="state" autoComplete="address-level1" maxLength={120} />
        </Field>

        <Field label="PIN" htmlFor="pincode" error={fieldErrors.pincode}>
          <Input id="pincode" name="pincode" autoComplete="postal-code" maxLength={20} />
        </Field>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating registration…" : "Create merchant account"}
      </Button>
    </form>
  );
}
