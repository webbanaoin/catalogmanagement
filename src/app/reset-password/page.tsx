import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const rawToken = Array.isArray(query.token) ? query.token[0] : query.token;
  const token = rawToken?.trim() ?? "";

  return (
    <AuthShell
      title="Choose a new password"
      description="Reset links expire after 30 minutes and can be used only once."
      footer={
        <div className="space-y-2">
          <p>
            Need another reset link?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Request a new link
            </Link>
          </p>
          <p>
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert variant="error" title="Reset link is incomplete">
          This link does not contain a password reset token. Request a new reset
          email and open the link from that message.
        </Alert>
      )}
    </AuthShell>
  );
}
