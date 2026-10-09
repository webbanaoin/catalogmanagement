import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAYS = [7, 3, 1];

export function calendarDaysUntil(date, today = new Date()) {
  const utcDay = (value) =>
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return Math.round((utcDay(date) - utcDay(today)) / 86400000);
}

async function sendReminder(to, shop, date, days) {
  const appUrl = process.env.APP_URL;
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.PASSWORD_RESET_FROM_EMAIL;
  if (!appUrl || !appUrl.startsWith("https://") || !apiKey || !sender) {
    throw new Error("APP_URL (HTTPS), RESEND_API_KEY and PASSWORD_RESET_FROM_EMAIL are required");
  }
  const renewUrl = new URL("/dashboard/subscription", appUrl).toString();
  const expiry = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  const body = `Hello,\n\nYour Digital Showroom subscription for ${shop} will expire in ${days} day${days === 1 ? "" : "s"} (on ${expiry}).\n\nReview your subscription and renew: ${renewUrl}\n\nIf you have already renewed, please ignore this reminder.\n\nWebbanao Digital Showroom`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender,
      to: [to],
      subject: `Digital Showroom renewal reminder — ${days} day${days === 1 ? "" : "s"} left`,
      text: body,
    }),
  });
  if (!response.ok) {
    // Do not log provider bodies; they may contain sensitive details.
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

async function main() {
  if (process.env.NODE_ENV !== "production" && process.env.REMINDER_TEST_MODE !== "true") {
    throw new Error("Run in production or use REMINDER_TEST_MODE=true against an isolated test database.");
  }
  if (process.env.REMINDER_TEST_MODE === "true" && process.env.NODE_ENV === "production") {
    throw new Error("REMINDER_TEST_MODE cannot be enabled in production.");
  }
  if (!process.env.APP_URL?.startsWith("https://")) throw new Error("APP_URL must be HTTPS");
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const through = new Date(from.getTime() + 8 * 86400000);
  const candidates = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE", "GRACE"] },
      endDate: { gte: from, lt: through },
      shop: { status: { in: ["APPROVED", "ACTIVE"] } },
    },
    select: {
      shopId: true, endDate: true, shop: {
        select: { name: true, shopUsers: { where: { role: "OWNER", user: { status: "ACTIVE" } },
          select: { user: { select: { email: true } } } } },
      },
    },
  });
  let delivered = 0, failed = 0, skipped = 0;
  for (const s of candidates) {
    const days = calendarDaysUntil(s.endDate, now);
    if (!DAYS.includes(days)) continue;
    for (const owner of s.shop.shopUsers) {
      const email = owner.user.email;
      // One email per user/shop/endDate/reminder; reserve before sending.
      let record;
      try {
        record = await prisma.subscriptionReminder.create({
          data: { shopId: s.shopId, recipientEmail: email, expiryDate: s.endDate, daysBefore: days },
          select: { id: true },
        });
      } catch (error) {
        if (error?.code === "P2002") { skipped++; continue; }
        throw error;
      }
      try {
        if (process.env.REMINDER_TEST_MODE !== "true") {
          await sendReminder(email, s.shop.name, s.endDate, days);
        }
        await prisma.subscriptionReminder.update({
          where: { id: record.id }, data: { sentAt: new Date() },
        });
        delivered++;
      } catch (error) {
        failed++;
        await prisma.subscriptionReminder.delete({ where: { id: record.id } });
        console.error("Reminder failed for shop", s.shopId, error instanceof Error ? error.message : error);
      }
    }
  }
  console.log(JSON.stringify({ candidates: candidates.length, delivered, failed, skipped }));
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Subscription reminder run failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
