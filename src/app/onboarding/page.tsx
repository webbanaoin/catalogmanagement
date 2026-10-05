import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/current-user";

export default async function OnboardingPage() {
  let user;

  try {
    user = await requireCurrentUser();
  } catch {
    redirect("/login");
  }

  const usableShop = user.shops.find(
    (shop) => shop.status === "APPROVED" || shop.status === "ACTIVE",
  );

  if (usableShop) {
    redirect("/dashboard/shop");
  }

  if (user.shops.some((shop) => shop.status === "PENDING")) {
    redirect("/pending-approval");
  }

  redirect("/login?reason=shop-unavailable");
}
