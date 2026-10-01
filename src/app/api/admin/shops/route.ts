import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { adminShopListQuerySchema } from "@/validation/admin";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const query = adminShopListQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.shop.findMany({
        where: { status: query.status },
        orderBy: { createdAt: "asc" },
        skip,
        take: query.pageSize,
        select: {
          id: true, name: true, slug: true, status: true, email: true, phone: true,
          city: true, state: true, createdAt: true, updatedAt: true,
          shopUsers: {
            where: { role: "OWNER" },
            select: { user: { select: { id: true, name: true, email: true, mobile: true } } },
          },
        },
      }),
      prisma.shop.count({ where: { status: query.status } }),
    ]);

    return NextResponse.json({
      items: items.map(({ shopUsers, ...shop }) => ({ ...shop, owners: shopUsers.map(({ user }) => user) })),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
