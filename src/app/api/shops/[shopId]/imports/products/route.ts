import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await context.params;
    await requireShopAccess(shopId);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") || 20) || 20),
    );

    const [items, total] = await prisma.$transaction([
      prisma.importJob.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fileName: true,
          totalRows: true,
          successfulRows: true,
          failedRows: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
        },
      }),
      prisma.importJob.count({ where: { shopId } }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
