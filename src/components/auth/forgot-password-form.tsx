"use client";

import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, requestPasswordReset } from "@/lib/auth-api";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    setMessage("");
    setFormError("");
    setFieldErrors({});

    try {
      const response = await requestPasswordReset({
        email: String(formData.get("email") ?? "").trim(),
      });
      setMessage(
        response.data.message ??
          "If an eligible account exists, password reset instructions will be sent.",
      );
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field
        label="Account email"
        htmlFor="email"
        hint="For privacy, the response does not confirm whether an account exists."
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
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending request…" : "Request password reset"}
      </Button>
    </form>
  );
}
