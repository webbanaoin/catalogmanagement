import { NextResponse } from "next/server";

import { requireShopAccess } from "@/server/auth/tenant-access";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/error-response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shopId: string; jobId: string }> },
) {
  try {
    const { shopId, jobId } = await context.params;
    await requireShopAccess(shopId);

    const job = await prisma.importJob.findFirst({
      where: { id: jobId, shopId },
      select: {
        id: true,
        fileName: true,
        totalRows: true,
        successfulRows: true,
        failedRows: true,
        status: true,
        errorSummary: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      throw new AppError({
        code: "IMPORT_JOB_NOT_FOUND",
        message: "Import job was not found in this shop",
        status: 404,
      });
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    return errorResponse(error);
  }
}
