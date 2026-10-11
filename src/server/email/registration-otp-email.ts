import "server-only";

import { getPasswordResetEmailEnvironment } from "@/server/env";
import type { RegistrationPurpose } from "@/server/auth/registration-email-otp";

export async function sendRegistrationOtpEmail(
  to: string,
  purpose: RegistrationPurpose,
  code: string,
): Promise<void> {
  const config = getPasswordResetEmailEnvironment();
  if (!config.RESEND_API_KEY || !config.PASSWORD_RESET_FROM_EMAIL) {
    throw new Error("Registration OTP email sender has not been configured.");
  }
  const account = purpose === "PARTNER" ? "Marketing Partner" : "Merchant";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.PASSWORD_RESET_FROM_EMAIL,
      to: [to],
      subject: `Verify your Webbanao ${account} registration`,
      text: `Your Webbanao ${account} registration verification code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;color:#0f172a"><h2>Email verification</h2><p>Your Webbanao ${account} registration code:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>Valid for 10 minutes. Never share this code with anyone.</p><p>If you did not request this registration, you can ignore this email.</p></div>`,
      ...(config.PASSWORD_RESET_REPLY_TO ? { reply_to: config.PASSWORD_RESET_REPLY_TO } : {}),
    }),
  });
  if (!response.ok) {
    // Never log the email provider response body: it can contain recipient metadata.
    throw new Error(`Resend failed with HTTP ${response.status}`);
  }
}
