import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";

export async function GET() {
  try {
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
