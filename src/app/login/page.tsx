import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";

async function redirectAuthenticatedUser() {
  const session = await getSession();
  if (!session) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      status: true,
      platformRole: true,
      sessionVersion: true,
      shopUsers: {
        select: {
          shop: {
            select: { status: true },
          },
        },
      },
    },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    user.sessionVersion !== session.sessionVersion
  ) {
    return;
  }

  if (user.platformRole === "ADMIN") {
    redirect("/admin");
  }

  const usableShop = user.shopUsers.some(
    ({ shop }) => shop.status === "APPROVED" || shop.status === "ACTIVE",
  );
  if (usableShop) {
    redirect("/onboarding");
  }

  const pendingShop = user.shopUsers.some(
    ({ shop }) => shop.status === "PENDING",
  );
  if (pendingShop) {
    redirect("/pending-approval");
  }
}

export default async function LoginPage() {
  await redirectAuthenticatedUser();

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
