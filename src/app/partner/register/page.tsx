import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PartnerRegisterForm } from "@/components/partner/partner-register-form";

export default async function PartnerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const source = Array.isArray(query.source_shop) ? query.source_shop[0] : query.source_shop;
  const growthSourceShopSlug = source && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source) && source.length <= 191 ? source : "";
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
      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">Marketing Partners are NOT authorized to collect cash, UPI or bank payments on behalf of Webbanao. All customers must pay only the official recipients shown on the merchant payment page.</div>
      <PartnerRegisterForm growthSourceShopSlug={growthSourceShopSlug} />
    </AuthShell>
  );
}
