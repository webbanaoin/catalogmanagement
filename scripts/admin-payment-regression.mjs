import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create temporary payment-test data. Set SPRINT6_TEST_CONFIRM=YES after confirming DATABASE_URL points to a disposable/local test database.",
  );
}

const target = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
  process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES"
) {
  throw new Error(
    "Remote payment regression tests are disabled by default. Use only an isolated staging target.",
  );
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const adminPassword = `Payments-Aa9!${randomUUID().slice(0, 12)}`;
const created = { userIds: [], shopIds: [], planIds: [] };

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", "203.0.113.40");
  if (cookie) headers.set("Cookie", cookie);
  return fetch(baseUrl + path, { ...options, headers, redirect: "manual" });
}

async function jsonRequest(path, method, body, cookie) {
  return request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cookie,
  );
}

async function expectStatus(label, response, expected) {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(
      `${label}: expected HTTP ${expected}, got ${response.status}. ${body.slice(0, 500)}`,
    );
  }
}

async function login(email, password) {
  const response = await jsonRequest("/api/auth/login", "POST", { email, password });
  await expectStatus("admin login", response, 200);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Admin login did not set a session cookie");
  return cookie.split(";")[0];
}

async function cleanup() {
  if (created.shopIds.length) {
    await prisma.paymentRecord.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.shop.deleteMany({ where: { id: { in: created.shopIds } } });
  }
  if (created.planIds.length) {
    await prisma.plan.deleteMany({ where: { id: { in: created.planIds } } });
  }
  if (created.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  }
}

async function main() {
  const passwordHash = await hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      name: "Payment Regression Admin",
      email: `payment-admin-${suffix}@example.test`,
      passwordHash,
      platformRole: "ADMIN",
    },
  });
  created.userIds.push(admin.id);

  const plan = await prisma.plan.create({
    data: {
      name: `Payment Regression Plan ${suffix}`,
      slug: `payment-regression-plan-${suffix}`,
      monthlyPrice: "999.00",
      annualPrice: "9999.00",
      productLimit: 100,
      imageLimitPerProduct: 5,
      trialDays: 0,
      graceDays: 7,
      status: "ACTIVE",
    },
  });
  created.planIds.push(plan.id);

  const shop = await prisma.shop.create({
    data: {
      name: `Payment Regression Shop ${suffix}`,
      slug: `payment-regression-shop-${suffix}`,
      status: "ACTIVE",
    },
  });
  created.shopIds.push(shop.id);

  const previousEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await prisma.subscription.create({
    data: {
      shopId: shop.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: previousEndDate,
      graceEndsAt: new Date(previousEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      paymentStatus: "PENDING",
    },
  });

  const cookie = await login(admin.email, adminPassword);

  const invalidOther = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 100,
      method: "OTHER",
      extendDays: 0,
      activateSubscription: false,
    },
    cookie,
  );
  await expectStatus("Other method requires comment", invalidOther, 400);

  const reference = `UPI-${suffix}`;
  const createResponse = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 999,
      method: "UPI",
      reference,
      comment: "Monthly renewal regression payment",
      extendDays: 30,
      activateSubscription: true,
    },
    cookie,
  );
  await expectStatus("record payment", createResponse, 201);
  const createPayload = await createResponse.json();
  const paymentId = createPayload?.data?.id;
  if (!paymentId) throw new Error("Payment API did not return a payment id");

  const payment = await prisma.paymentRecord.findUnique({ where: { id: paymentId } });
  if (
    !payment ||
    payment.shopId !== shop.id ||
    payment.method !== "UPI" ||
    payment.reference !== reference ||
    payment.recordedByUserId !== admin.id ||
    Number(payment.amount) !== 999
  ) {
    throw new Error("Payment ledger row was not persisted correctly");
  }

  const subscription = await prisma.subscription.findUnique({ where: { shopId: shop.id } });
  if (
    !subscription ||
    subscription.paymentStatus !== "PAID" ||
    subscription.status !== "ACTIVE"
  ) {
    throw new Error("Payment did not update subscription status correctly");
  }

  const expectedEndDate = new Date(previousEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (Math.abs(subscription.endDate.getTime() - expectedEndDate.getTime()) > 1000) {
    throw new Error("Early renewal did not extend from the existing expiry date");
  }

  const listResponse = await request(
    `/api/admin/payments?shopId=${encodeURIComponent(shop.id)}&method=UPI`,
    {},
    cookie,
  );
  await expectStatus("payment history", listResponse, 200);
  const listPayload = await listResponse.json();
  if (
    listPayload?.summary?.count !== 1 ||
    Number(listPayload?.summary?.amount) !== 999 ||
    listPayload?.items?.[0]?.id !== paymentId
  ) {
    throw new Error("Payment history/summary did not return the recorded payment");
  }

  const directPaid = await jsonRequest(
    `/api/admin/shops/${shop.id}/subscription`,
    "PATCH",
    { paymentStatus: "PAID" },
    cookie,
  );
  await expectStatus("direct PAID status blocked", directPaid, 409);

  const audit = await prisma.auditLog.findFirst({
    where: {
      actorUserId: admin.id,
      shopId: shop.id,
      action: "PAYMENT_RECORDED",
      entityType: "PaymentRecord",
      entityId: paymentId,
    },
  });
  if (!audit) throw new Error("PAYMENT_RECORDED audit row was not created");

  process.stdout.write(
    "Admin payment ledger, renewal, reporting and audit regression checks passed.\n",
  );
}

main()
  .catch((error) => {
    console.error("Admin payment regression checks failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } finally {
      await prisma.$disconnect();
    }
  });
