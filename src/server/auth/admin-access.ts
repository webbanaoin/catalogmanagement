import "server-only";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { getSession } from "./session";

export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session) throw new AppError({ code: "UNAUTHENTICATED", message: "Authentication required", status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, status: true, platformRole: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError({ code: "UNAUTHENTICATED", message: "Authentication required", status: 401 });
  }
  if (user.platformRole !== "ADMIN") {
    throw new AppError({ code: "FORBIDDEN", message: "Platform administrator access required", status: 403 });
  }
  return user;
}
