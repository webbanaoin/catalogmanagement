import "server-only";

import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { getSession } from "./session";

export async function requireCurrentUser() {
  const session = await getSession();
  if (!session) throw new AppError({ code: "UNAUTHENTICATED", message: "Authentication required", status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, mobile: true, status: true, createdAt: true } });
  if (!user || user.status !== "ACTIVE") throw new AppError({ code: "UNAUTHENTICATED", message: "Authentication required", status: 401 });
  return user;
}
