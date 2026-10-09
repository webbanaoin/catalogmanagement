"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import {
  AuthApiError,
  registerReferralPartner,
} from "@/lib/auth-api";
import {
  isValidEmail,
  isValidIndianMobile,
} from "@/lib/validation";

type FieldErrors = Record<string, string>;

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function optional(formData: FormData, name: string) {
  const result = value(formData, name).trim();
  return result || undefined;
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;
  if (control instanceof HTMLElement) control.focus();
}

export function PartnerRegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const errors: FieldErrors = {};

    const name = value(data, "name").trim();
    const email = value(data, "email").trim();
    const mobile = value(data, "mobile").trim();
    const password = value(data, "password");
    const confirmPassword = value(data, "confirmPassword");

    if (name.length < 2) errors.name = "Name is required.";
    if (!email) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!mobile) errors.mobile = "Mobile number is required.";
    else if (!isValidIndianMobile(mobile)) {
      errors.mobile = "Enter a valid 10-digit Indian mobile number.";
    }
    if (password.length < 10) {
      errors.password = "Password must contain at least 10 characters.";
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFormError("");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid(form, errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      await registerReferralPartner({
        name,
        email,
        mobile,
        password,
        confirmPassword,
        city: optional(data, "city"),
        state: optional(data, "state"),
        marketingArea: optional(data, "marketingArea"),
      });
      router.push("/partner/pending");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fields);
        setFormError(error.message);
        focusFirstInvalid(form, error.fields);
      } else {
        setFormError("Unable to submit partner registration. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={fieldErrors.name} required>
          <Input id="name" name="name" autoComplete="name" maxLength={120} required />
        </Field>
        <Field label="Mobile" htmlFor="mobile" error={fieldErrors.mobile} required>
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={18}
            required
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
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
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={fieldErrors.confirmPassword}
          required
        >
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" maxLength={120} autoComplete="address-level2" />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" maxLength={120} autoComplete="address-level1" />
        </Field>
      </div>

      <Field
        label="Marketing area"
        htmlFor="marketingArea"
        hint="Optional. Example: Jabalpur city, schools, jewellery market, local retailers."
      >
        <Input
          id="marketingArea"
          name="marketingArea"
          maxLength={255}
          placeholder="Where or which businesses do you plan to market?"
        />
      </Field>

      <Alert title="How it works">
        After registration, Webbanao admin will review your account. Once approved,
        your unique referral code and referral link will appear in your partner dashboard.
      </Alert>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Register as marketing partner"}
      </Button>
    </form>
  );
}
