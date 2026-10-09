import "server-only";

import {
  getAppEnvironment,
  getPasswordResetEmailEnvironment,
} from "@/server/env";

interface SendPasswordResetEmailInput {
  to: string;
  resetToken: string;
}

export interface PasswordResetDeliveryResult {
  resetUrl: string;
  exposedForTesting: boolean;
  delivered: boolean;
}

function buildResetUrl(token: string) {
  const { APP_URL } = getAppEnvironment();
  const url = new URL("/reset-password", APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<PasswordResetDeliveryResult> {
  const resetUrl = buildResetUrl(input.resetToken);
  const config = getPasswordResetEmailEnvironment();

  const exposeForTesting =
    process.env.NODE_ENV !== "production" ||
    config.PASSWORD_RESET_EXPOSE_URL;

  if (exposeForTesting) {
    return {
      resetUrl,
      exposedForTesting: true,
      delivered: false,
    };
  }

  if (!config.RESEND_API_KEY || !config.PASSWORD_RESET_FROM_EMAIL) {
    throw new Error(
      "Password reset email delivery is not configured. Set RESEND_API_KEY and PASSWORD_RESET_FROM_EMAIL.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.PASSWORD_RESET_FROM_EMAIL,
      to: [input.to],
      subject: "Reset your Webbanao Digital Showroom password",
      text: [
        "We received a request to reset your Webbanao Digital Showroom password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        "This link expires in 30 minutes and can be used only once.",
        "If you did not request this reset, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <h2 style="margin-bottom:12px">Reset your password</h2>
          <p style="line-height:1.6">
            We received a request to reset your Webbanao Digital Showroom password.
          </p>
          <p style="margin:24px 0">
            <a
              href="${resetUrl}"
              style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700"
            >
              Reset password
            </a>
          </p>
          <p style="line-height:1.6;color:#475569">
            This link expires in 30 minutes and can be used only once.
          </p>
          <p style="line-height:1.6;color:#475569">
            If you did not request this reset, you can ignore this email.
          </p>
        </div>
      `,
      ...(config.PASSWORD_RESET_REPLY_TO
        ? { reply_to: config.PASSWORD_RESET_REPLY_TO }
        : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Password reset email provider returned HTTP ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return {
    resetUrl,
    exposedForTesting: false,
    delivered: true,
  };
}
