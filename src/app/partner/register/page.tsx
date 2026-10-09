import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PartnerRegisterForm } from "@/components/partner/partner-register-form";

export default function PartnerRegisterPage() {
  return (
    <AuthShell
      title="Become a Webbanao marketing partner"
      description="Register with a few details. After admin approval, you will receive a unique referral code and your own earnings dashboard."
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/partner/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Partner sign in
          </Link>
        </>
      }
    >
      <PartnerRegisterForm />
    </AuthShell>
  );
}
