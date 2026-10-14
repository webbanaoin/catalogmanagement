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
        quarterlyPrice: true,
        halfYearlyPrice: true,
        annualPrice: true,
        regularMonthlyPrice: true,
        regularQuarterlyPrice: true,
        regularHalfYearlyPrice: true,
        regularAnnualPrice: true,
        offerEnabled: true,
        offerStartsAt: true,
        offerEndsAt: true,
        productLimit: true,
        imageLimitPerProduct: true,
        totalImageLimit: true,
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
        quarterlyPrice: plan.quarterlyPrice.toString(),
        halfYearlyPrice: plan.halfYearlyPrice.toString(),
        annualPrice: plan.annualPrice.toString(),
        regularMonthlyPrice: plan.regularMonthlyPrice?.toString() ?? null,
        regularQuarterlyPrice: plan.regularQuarterlyPrice?.toString() ?? null,
        regularHalfYearlyPrice: plan.regularHalfYearlyPrice?.toString() ?? null,
        regularAnnualPrice: plan.regularAnnualPrice?.toString() ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
