import { NextResponse } from "next/server";

import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

export async function GET() {
  try {
    const items = await prisma.plan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ monthlyPrice: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        monthlyPrice: true,
        annualPrice: true,
        productLimit: true,
        imageLimitPerProduct: true,
        analyticsEnabled: true,
        excelImportEnabled: true,
        customBrandingEnabled: true,
        trialDays: true,
        status: true,
      },
    });

    return NextResponse.json({
      items: items.map((plan) => ({
        ...plan,
        monthlyPrice: plan.monthlyPrice.toString(),
        annualPrice: plan.annualPrice.toString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
