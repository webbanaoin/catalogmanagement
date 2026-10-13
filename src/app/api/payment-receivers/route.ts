import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth/current-user";
import { AppError } from "@/server/http/app-error";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user.shops.some(shop => shop.status === "APPROVED" || shop.status === "ACTIVE")) {
      throw new AppError({code:"FORBIDDEN",message:"Merchant access required",status:403});
    }
    const receivers = await prisma.officialPaymentReceiver.findMany({
      where: { active: true },
      select: { id: true, name: true, phone: true, upiId: true, cashEnabled: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: receivers }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return errorResponse(error); }
}
