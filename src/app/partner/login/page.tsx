import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { PartnerLoginForm } from "@/components/partner/partner-login-form";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";

export default async function PartnerLoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        status: true,
        platformRole: true,
        sessionVersion: true,
        referralPartner: { select: { status: true } },
      },
    });

    if (
      user?.status === "ACTIVE" &&
      user.sessionVersion === session.sessionVersion &&
      user.platformRole === "PARTNER"
    ) {
      if (user.referralPartner?.status === "ACTIVE") {
        redirect("/partner/dashboard");
      }
      if (user.referralPartner?.status === "PENDING") {
        redirect("/partner/pending");
      }
    }
  }

  return (
    <AuthShell
      title="Marketing partner sign in"
      description="View your referral code, referred shops, commission earnings and payout history."
      footer={
        <div className="space-y-2">
          <p>
            New marketing partner?{" "}
            <Link
              href="/partner/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Register here
            </Link>
          </p>
          <p>
            Merchant or admin?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Use main sign in
            </Link>
          </p>
        </div>
      }
    >
      <PartnerLoginForm />
    </AuthShell>
  );
}
