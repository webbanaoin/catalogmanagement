import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const referralCode = first(query.ref)?.trim().toUpperCase() ?? "";
  return (
    <AuthShell
      title="Create your merchant account"
      description="Register your shop for admin review. Once approved, you can sign in and continue shop setup."
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm initialReferralCode={referralCode} />
    </AuthShell>
  );
}
