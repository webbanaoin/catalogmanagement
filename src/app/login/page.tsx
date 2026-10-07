import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Sign in to your merchant or platform administrator account."
      footer={
        <div className="space-y-2">
          <p>
            <Link
              href="/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Forgot your password?
            </Link>
          </p>
          <p>
            New merchant?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Register your shop
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
