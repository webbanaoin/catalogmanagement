import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create temporary payment-submission test data. Set SPRINT6_TEST_CONFIRM=YES only for a disposable/local database.",
  );
}

const target = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
  process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES"
) {
  throw new Error("Remote merchant payment submission tests are disabled by default.");
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const adminPassword = `PaymentAdmin-Aa9!${randomUUID().slice(0, 10)}`;
const merchantPassword = `PaymentMerchant-Aa9!${randomUUID().slice(0, 10)}`;

const created = {
  userIds: [],
  shopIds: [],
  planIds: [],
  partnerIds: [],
};

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", "203.0.113.88");
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
      `${label}: expected HTTP ${expected}, got ${response.status}. ${body.slice(0, 900)}`,
    );
  }
}

async function login(email, password) {
  const response = await jsonRequest("/api/auth/login", "POST", { email, password });
  await expectStatus("login " + email, response, 200);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Login did not return a session cookie");
  return cookie.split(";")[0];
}

async function cleanup() {
  if (created.shopIds.length) {
    await prisma.referralCommission.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.paymentSubmission.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.paymentRecord.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { shopId: { in: created.shopIds } },
    });
    await prisma.shop.deleteMany({
      where: { id: { in: created.shopIds } },
    });
  }

  if (created.partnerIds.length) {
    await prisma.referralPartner.deleteMany({
      where: { id: { in: created.partnerIds } },
    });
  }

  if (created.planIds.length) {
    await prisma.plan.deleteMany({
      where: { id: { in: created.planIds } },
    });
  }

  if (created.userIds.length) {
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: created.userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: created.userIds } },
    });
  }
}

async function main() {
  const admin = await prisma.user.create({
    data: {
      name: "Merchant Payment Regression Admin",
      email: `payment-admin-${suffix}@example.test`,
      passwordHash: await hash(adminPassword, 12),
      platformRole: "ADMIN",
      status: "ACTIVE",
    },
  });
  created.userIds.push(admin.id);

  const partnerUser = await prisma.user.create({
    data: {
      name: "Payment Test Marketing Partner",
      email: `payment-partner-${suffix}@example.test`,
      passwordHash: await hash(merchantPassword, 12),
      platformRole: "PARTNER",
      status: "ACTIVE",
    },
  });
  created.userIds.push(partnerUser.id);

  const partner = await prisma.referralPartner.create({
    data: {
      userId: partnerUser.id,
      referralCode: "WB-54321",
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });
  created.partnerIds.push(partner.id);

  const merchant = await prisma.user.create({
    data: {
      name: "Merchant Payment Regression Owner",
      email: `payment-merchant-${suffix}@example.test`,
      passwordHash: await hash(merchantPassword, 12),
      platformRole: "USER",
      status: "ACTIVE",
    },
  });
  created.userIds.push(merchant.id);

  const shop = await prisma.shop.create({
    data: {
      name: `Payment Regression Shop ${suffix}`,
      slug: `payment-regression-${suffix}`,
      email: merchant.email,
      status: "ACTIVE",
      referralPartnerId: partner.id,
      referralAssignedAt: new Date(Date.now() - 60_000),
    },
  });
  created.shopIds.push(shop.id);

  await prisma.shopUser.create({
    data: {
      userId: merchant.id,
      shopId: shop.id,
      role: "OWNER",
    },
  });

  const plan = await prisma.plan.create({
    data: {
      name: `Payment Regression Plan ${suffix}`,
      slug: `payment-regression-plan-${suffix}`,
      monthlyPrice: "299.00",
      annualPrice: "2988.00",
      productLimit: 100,
      imageLimitPerProduct: 5,
      trialDays: 0,
      graceDays: 7,
      status: "ACTIVE",
    },
  });
  created.planIds.push(plan.id);

  const originalEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await prisma.subscription.create({
    data: {
      shopId: shop.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: originalEndDate,
      status: "ACTIVE",
      paymentStatus: "PENDING",
    },
  });

  await prisma.referralProgramSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      isEnabled: true,
      commissionMode: "FIRST_PAID_SUBSCRIPTION",
      monthlyCommission: 50,
      yearlyCommission: 500,
    },
    update: {
      isEnabled: true,
      commissionMode: "FIRST_PAID_SUBSCRIPTION",
      monthlyCommission: 50,
      yearlyCommission: 500,
    },
  });

  const adminCookie = await login(admin.email, adminPassword);
  const merchantCookie = await login(merchant.email, merchantPassword);

  const reference = `MERCHANT-UPI-${suffix}`;
  const submit = await jsonRequest(
    `/api/shops/${shop.id}/payments`,
    "POST",
    {
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      paidAt: new Date().toISOString(),
      recipientType: "REFERRAL_PARTNER",
      reference,
      comment: "Paid monthly subscription amount to marketing partner.",
    },
    merchantCookie,
  );
  await expectStatus("merchant payment submission", submit, 201);
  const submitPayload = await submit.json();
  const submissionId = submitPayload?.data?.id;
  if (!submissionId || submitPayload?.data?.status !== "PENDING") {
    throw new Error("Merchant payment was not created in PENDING status");
  }

  const beforeApprovalPayment = await prisma.paymentRecord.findFirst({
    where: { shopId: shop.id, reference },
  });
  if (beforeApprovalPayment) {
    throw new Error("Pending merchant payment incorrectly created an official PaymentRecord");
  }

  const merchantBefore = await request(
    `/api/shops/${shop.id}/payments`,
    {},
    merchantCookie,
  );
  await expectStatus("merchant payment workspace before approval", merchantBefore, 200);
  const merchantBeforePayload = await merchantBefore.json();
  if (
    merchantBeforePayload?.data?.submissions?.[0]?.status !== "PENDING" ||
    merchantBeforePayload?.data?.payments?.length !== 0
  ) {
    throw new Error("Merchant payment workspace did not separate pending claim from verified history");
  }

  const adminQueue = await request(
    "/api/admin/payment-submissions?status=PENDING&pageSize=100",
    {},
    adminCookie,
  );
  await expectStatus("admin merchant payment queue", adminQueue, 200);
  const adminQueuePayload = await adminQueue.json();
  if (!adminQueuePayload?.items?.some((item) => item.id === submissionId)) {
    throw new Error("Admin payment queue did not include merchant submission");
  }

  const duplicateDirect = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      reference,
      extendDays: 30,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("duplicate direct payment guard", duplicateDirect, 409);

  const approve = await jsonRequest(
    `/api/admin/payment-submissions/${submissionId}`,
    "PATCH",
    {
      action: "APPROVE",
      extendDays: 30,
      activateSubscription: true,
      comment: "UPI receipt verified.",
    },
    adminCookie,
  );
  await expectStatus("approve merchant payment", approve, 200);
  const approvePayload = await approve.json();
  if (
    approvePayload?.data?.status !== "APPROVED" ||
    !approvePayload?.data?.paymentRecordId
  ) {
    throw new Error("Admin approval did not create official payment record");
  }
  if (Number(approvePayload?.data?.referralCommission?.amount) !== 50) {
    throw new Error("Approved referred merchant payment did not create ₹50 referral commission");
  }

  const official = await prisma.paymentRecord.findUnique({
    where: { id: approvePayload.data.paymentRecordId },
  });
  if (!official || Number(official.amount) !== 299) {
    throw new Error("Approved merchant payment was not persisted in official ledger");
  }

  const approvedSubmission = await prisma.paymentSubmission.findUnique({
    where: { id: submissionId },
  });
  if (
    !approvedSubmission ||
    approvedSubmission.status !== "APPROVED" ||
    approvedSubmission.paymentRecordId !== official.id
  ) {
    throw new Error("Payment submission was not linked to official payment");
  }

  const updatedSubscription = await prisma.subscription.findUnique({
    where: { shopId: shop.id },
  });
  if (
    !updatedSubscription ||
    updatedSubscription.paymentStatus !== "PAID" ||
    updatedSubscription.status !== "ACTIVE" ||
    updatedSubscription.endDate <= originalEndDate
  ) {
    throw new Error("Payment approval did not update subscription validity");
  }

  const merchantAfter = await request(
    `/api/shops/${shop.id}/payments`,
    {},
    merchantCookie,
  );
  await expectStatus("merchant payment workspace after approval", merchantAfter, 200);
  const merchantAfterPayload = await merchantAfter.json();
  const approvedPayment = merchantAfterPayload?.data?.payments?.find(
    (item) => item.id === official.id,
  );
  if (
    !approvedPayment ||
    approvedPayment.source !== "MERCHANT_SUBMISSION_APPROVED"
  ) {
    throw new Error("Merchant verified history did not identify approved merchant submission");
  }

  const duplicateMerchant = await jsonRequest(
    `/api/shops/${shop.id}/payments`,
    "POST",
    {
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      paidAt: new Date().toISOString(),
      recipientType: "WEBBANAO",
      reference,
    },
    merchantCookie,
  );
  await expectStatus("merchant duplicate reference guard", duplicateMerchant, 409);

  const directReference = `ADMIN-DIRECT-${suffix}`;
  const direct = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 2988,
      method: "BANK_TRANSFER",
      billingCycle: "YEARLY",
      reference: directReference,
      extendDays: 365,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("admin direct payment", direct, 201);
  const directPayload = await direct.json();

  const merchantWithDirect = await request(
    `/api/shops/${shop.id}/payments`,
    {},
    merchantCookie,
  );
  await expectStatus("merchant history with admin direct payment", merchantWithDirect, 200);
  const merchantWithDirectPayload = await merchantWithDirect.json();
  const directHistory = merchantWithDirectPayload?.data?.payments?.find(
    (item) => item.id === directPayload?.data?.id,
  );
  if (!directHistory || directHistory.source !== "ADMIN_RECORDED") {
    throw new Error("Admin direct payment was not visible in merchant verified history");
  }

  const rejectReference = `REJECT-${suffix}`;
  const submitRejected = await jsonRequest(
    `/api/shops/${shop.id}/payments`,
    "POST",
    {
      amount: 299,
      method: "CASH",
      billingCycle: "MONTHLY",
      paidAt: new Date().toISOString(),
      recipientType: "OTHER",
      recipientName: "Local collection agent",
      reference: rejectReference,
      comment: "Cash handed to local collection agent.",
    },
    merchantCookie,
  );
  await expectStatus("merchant claim to reject", submitRejected, 201);
  const rejectSubmissionId = (await submitRejected.json())?.data?.id;

  const reject = await jsonRequest(
    `/api/admin/payment-submissions/${rejectSubmissionId}`,
    "PATCH",
    {
      action: "REJECT",
      comment: "Payment not received by Webbanao. Please verify with the collector.",
    },
    adminCookie,
  );
  await expectStatus("reject merchant payment", reject, 200);

  const merchantRejected = await request(
    `/api/shops/${shop.id}/payments`,
    {},
    merchantCookie,
  );
  await expectStatus("merchant rejected payment visibility", merchantRejected, 200);
  const merchantRejectedPayload = await merchantRejected.json();
  const rejectedClaim = merchantRejectedPayload?.data?.submissions?.find(
    (item) => item.id === rejectSubmissionId,
  );
  if (
    !rejectedClaim ||
    rejectedClaim.status !== "REJECTED" ||
    !rejectedClaim.reviewComment?.includes("Payment not received")
  ) {
    throw new Error("Merchant could not see rejected payment status and reason");
  }

  process.stdout.write(
    "Merchant payment submission, admin verification, direct-payment visibility, referral commission, duplicate guards and rejection history checks passed.\n",
  );
}

main()
  .catch((error) => {
    console.error("Merchant payment submission regression checks failed.");
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
