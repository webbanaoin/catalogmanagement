import "server-only";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { getSession } from "./session";

export async function requireCurrentUser() {
  const session = await getSession();
  if (!session) throw new AppError({ code: "UNAUTHENTICATED", message: "Authentication required", status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      status: true,
      sessionVersion: true,
      createdAt: true,
      shopUsers: {
        select: {
          role: true,
          shop: {
            select: { id: true, name: true, slug: true, status: true },
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
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Authentication required",
      status: 401,
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    createdAt: user.createdAt,
    shops: user.shopUsers.map(({ role, shop }) => ({ ...shop, role })),
  };
}
