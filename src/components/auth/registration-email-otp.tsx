"use client";

import { useState } from "react";
import { AuthApiError, requestRegistrationEmailOtp, verifyRegistrationEmailOtp } from "@/lib/auth-api";
import { isValidEmail } from "@/lib/validation";

type Purpose = "MERCHANT" | "PARTNER";

export function RegistrationEmailOtp({
  email, purpose, onVerified,
}: {
  email: string;
  purpose: Purpose;
  onVerified: (token: string, email: string) => void;
}) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function send() {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address before requesting OTP.");
      return;
    }
    setBusy(true);
    setError(""); setFeedback("");
    try {
      const result = await requestRegistrationEmailOtp({ email, purpose });
      setCodeSent(true); setCode(""); setVerified(false);
      setFeedback(result.data.message + " It expires in 10 minutes.");
    } catch (problem) {
      setError(problem instanceof AuthApiError ? problem.message : "Unable to send OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }
    setBusy(true); setError("");
    try {
      const result = await verifyRegistrationEmailOtp({ email, purpose, code });
      setVerified(true);
      onVerified(result.data.verificationToken, result.data.email);
      setFeedback("Email verified. Complete and submit your registration within 10 minutes.");
    } catch (problem) {
      setError(problem instanceof AuthApiError ? problem.message : "Unable to verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface-muted p-4" aria-label="Email verification">
      <div>
        <h3 className="text-sm font-bold text-foreground">Verify your email address <span aria-hidden="true">*</span></h3>
        <p className="mt-1 text-xs leading-5 text-muted">We will send a 6-digit code to your email. Email verification is mandatory before registration.</p>
      </div>
      {!verified ? (
        <>
          <button type="button" disabled={busy || !isValidEmail(email)}
            onClick={() => void send()}
            className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Please wait…" : codeSent ? "Resend email OTP" : "Send email OTP"}
          </button>
          {codeSent ? (
            <div className="flex flex-wrap items-end gap-2">
              <label htmlFor={`registration-code-${purpose}`} className="flex-1 space-y-1 text-sm font-semibold">
                <span>6-digit OTP</span>
                <input id={`registration-code-${purpose}`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
                  maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Enter 6-digit code" className="block w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" />
              </label>
              <button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                Verify email
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm font-semibold text-success">✓ Email verified successfully</p>
      )}
      {feedback ? <p className="text-xs text-muted" role="status">{feedback}</p> : null}
      {error ? <p role="alert" className="text-xs font-medium text-danger">{error}</p> : null}
    </section>
  );
}
