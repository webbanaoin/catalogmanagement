import "server-only";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { getSession } from "@/server/auth/session";

export async function requireReferralPartner(options?: { allowPending?: boolean }) {
  const session = await getSession();
  if (!session) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Partner authentication required",
      status: 401,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      status: true,
      platformRole: true,
      sessionVersion: true,
      referralPartner: {
        select: {
          id: true,
          referralCode: true,
          status: true,
          city: true,
          state: true,
          marketingArea: true,
          approvedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    user.sessionVersion !== session.sessionVersion ||
    user.platformRole !== "PARTNER" ||
    !user.referralPartner
  ) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Partner authentication required",
      status: 401,
    });
  }

  if (!options?.allowPending && user.referralPartner.status !== "ACTIVE") {
    throw new AppError({
      code:
        user.referralPartner.status === "PENDING"
          ? "PARTNER_PENDING_APPROVAL"
          : "PARTNER_ACCESS_UNAVAILABLE",
      message:
        user.referralPartner.status === "PENDING"
          ? "Your marketing partner account is pending admin approval"
          : "Your marketing partner account is not currently active",
      status: 403,
    });
  }

  return {
    ...user,
    partner: user.referralPartner,
  };
}
