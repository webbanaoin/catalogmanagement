"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthApiError, resetPassword } from "@/lib/auth-api";

type FieldErrors = Record<string, string>;

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  const control = firstField ? form.elements.namedItem(firstField) : null;
  if (control instanceof HTMLElement) control.focus();
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const errors: FieldErrors = {};

    if (!password) {
      errors.password = "New password is required.";
    } else if (password.length < 10) {
      errors.password = "Password must contain at least 10 characters.";
    } else if (password.length > 128) {
      errors.password = "Password must contain at most 128 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (password !== confirmPassword) {
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
      await resetPassword({ token, password });
      setCompleted(true);
      form.reset();
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fields);
        setFormError(
          error.code === "INVALID_RESET_TOKEN"
            ? "This password reset link is invalid, expired or has already been used. Request a new reset link."
            : error.message,
        );
        focusFirstInvalid(form, error.fields);
      } else {
        setFormError("Unable to reset your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <div className="space-y-5">
        <Alert variant="success" title="Password updated">
          Your password has been reset successfully. For security, any previous
          signed-in sessions have been invalidated.
        </Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Merchant / Admin sign in
          </Link>
          <Link
            href="/partner/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground"
          >
            Partner sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field
        label="New password"
        htmlFor="password"
        hint="Use at least 10 characters. Avoid reusing a password from another account."
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
        label="Confirm new password"
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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Updating password…" : "Reset password"}
      </Button>
    </form>
  );
}
