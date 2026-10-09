import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your account email. The reset request keeps account existence private."
      footer={
        <div className="space-y-2">
          <p>
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Merchant / Admin sign in
            </Link>
          </p>
          <p>
            <Link
              href="/partner/login"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Marketing Partner sign in
            </Link>
          </p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
