"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, loginMerchant } from "@/lib/auth-api";
import { isValidEmail } from "@/lib/validation";

type FieldErrors = Record<string, string>;

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;

  if (control instanceof HTMLElement) {
    control.focus();
  }
}

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const clientErrors: FieldErrors = {};

    if (!email) {
      clientErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      clientErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      clientErrors.password = "Password is required.";
    } else if (password.length > 128) {
      clientErrors.password = "Password must contain at most 128 characters.";
    }

    setFormError("");

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      focusFirstInvalid(form, clientErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const response = await loginMerchant({ email, password });
      router.push(
        response.data.platformRole === "ADMIN" ? "/admin" : "/onboarding",
      );
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.code === "SHOP_PENDING_APPROVAL") {
          router.push("/pending-approval");
          return;
        }
        setFieldErrors(error.fields);
        setFormError(error.message);
        focusFirstInvalid(form, error.fields);
      } else {
        setFormError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
