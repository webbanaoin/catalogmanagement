import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";
import { errorResponse } from "@/server/http/error-response";
import { readJsonBody } from "@/server/http/json-body";

const receiverSchema = z.object({
  id: z.string().min(1).max(191).optional(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter 10 digit mobile number"),
  upiId: z.union([z.string().trim().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).max(191), z.literal(""), z.null()]),
  active: z.boolean(),
  cashEnabled: z.boolean(),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const [receivers, history] = await Promise.all([
      prisma.officialPaymentReceiver.findMany({ orderBy: { name: "asc" } }),
      prisma.auditLog.findMany({
        where: { action: "OFFICIAL_PAYMENT_RECEIVER_CHANGED" },
        include: { actorUser: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" }, take: 100,
      }),
    ]);
    return NextResponse.json({ data: { receivers, history } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const input = receiverSchema.parse(await readJsonBody(request));
    const receiver = await prisma.$transaction(async (tx) => {
      const previous = input.id ? await tx.officialPaymentReceiver.findUnique({ where: { id: input.id } }) : null;
      if (input.id && !previous) return null;
      const data = {
        name: input.name, phone: input.phone,
        upiId: input.upiId || null, active: input.active,
        cashEnabled: input.cashEnabled,
      };
      const saved = input.id
        ? await tx.officialPaymentReceiver.update({ where: { id: input.id }, data })
        : await tx.officialPaymentReceiver.create({ data });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "OFFICIAL_PAYMENT_RECEIVER_CHANGED",
          entityType: "OfficialPaymentReceiver",
          entityId: saved.id,
          metadata: { previous, next: saved },
        },
      });
      return saved;
    });
    if (!receiver) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    return NextResponse.json({ data: receiver });
  } catch (error) { return errorResponse(error); }
}
