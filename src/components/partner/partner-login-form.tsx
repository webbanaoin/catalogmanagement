"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, loginReferralPartner } from "@/lib/auth-api";
import { isValidEmail } from "@/lib/validation";

export function PartnerLoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const errors: Record<string, string> = {};

    if (!email) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";

    setFormError("");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      await loginReferralPartner({ email, password });
      router.replace("/partner/dashboard");
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.code === "PARTNER_PENDING_APPROVAL") {
          router.replace("/partner/pending");
          return;
        }
        setFieldErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Partner sign in"}
      </Button>
    </form>
  );
}
