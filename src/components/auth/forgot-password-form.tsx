"use client";

import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, requestPasswordReset } from "@/lib/auth-api";
import { isValidEmail } from "@/lib/validation";

type FieldErrors = Record<string, string>;

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const clientErrors: FieldErrors = {};

    if (!email) {
      clientErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      clientErrors.email = "Enter a valid email address.";
    }

    setMessage("");
    setDevelopmentResetUrl("");
    setFormError("");

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      const control = form.elements.namedItem("email");
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const response = await requestPasswordReset({ email });
      setMessage(
        response.data.message ??
          "If an eligible account exists, password reset instructions will be sent.",
      );
      setDevelopmentResetUrl(response.data.developmentResetUrl ?? "");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError("Unable to request a password reset. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {developmentResetUrl ? (
        <Alert title="Development reset link">
          <a
            href={developmentResetUrl}
            className="font-semibold text-primary underline underline-offset-4"
          >
            Open password reset page
          </a>
        </Alert>
      ) : null}
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field
        label="Account email"
        htmlFor="email"
        hint="We will send a reset link if the email belongs to an eligible account."
        error={fieldErrors.email}
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : "email-hint"}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending request…" : "Request password reset"}
      </Button>
    </form>
  );
}
