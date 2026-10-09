import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create temporary referral-test data. Set SPRINT6_TEST_CONFIRM=YES only for a disposable/local database.",
  );
}

const target = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
  process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES"
) {
  throw new Error("Remote referral regression tests are disabled by default.");
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const adminPassword = `ReferralAdmin-Aa9!${randomUUID().slice(0, 10)}`;
const partnerPassword = `ReferralPartner-Aa9!${randomUUID().slice(0, 10)}`;
const merchantPassword = `ReferralMerchant-Aa9!${randomUUID().slice(0, 10)}`;

const created = {
  userIds: [],
  shopIds: [],
  planIds: [],
  partnerIds: [],
};

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", "203.0.113.55");
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
      `${label}: expected HTTP ${expected}, got ${response.status}. ${body.slice(0, 700)}`,
    );
  }
}

async function loginAdmin(email, password) {
  const response = await jsonRequest("/api/auth/login", "POST", { email, password });
  await expectStatus("admin login", response, 200);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Admin login did not return a session cookie");
  return cookie.split(";")[0];
}

async function loginPartner(email, password, expected = 200) {
  const response = await jsonRequest("/api/partner/login", "POST", { email, password });
  await expectStatus("partner login", response, expected);
  if (expected !== 200) return null;
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Partner login did not return a session cookie");
  return cookie.split(";")[0];
}

async function cleanup() {
  if (created.shopIds.length) {
    await prisma.referralCommission.deleteMany({
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
    await prisma.referralCommission.deleteMany({
      where: { referralPartnerId: { in: created.partnerIds } },
    });
    await prisma.referralPartner.deleteMany({
      where: { id: { in: created.partnerIds } },
    });
  }

  if (created.planIds.length) {
    await prisma.plan.deleteMany({ where: { id: { in: created.planIds } } });
  }

  if (created.userIds.length) {
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: created.userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  }
}

async function main() {
  const admin = await prisma.user.create({
    data: {
      name: "Referral Regression Admin",
      email: `referral-admin-${suffix}@example.test`,
      passwordHash: await hash(adminPassword, 12),
      platformRole: "ADMIN",
    },
  });
  created.userIds.push(admin.id);
  const adminCookie = await loginAdmin(admin.email, adminPassword);

  const partnerEmail = `partner-${suffix}@example.test`;
  const registerPartner = await jsonRequest(
    "/api/partner/register",
    "POST",
    {
      name: "Referral Regression Partner",
      email: partnerEmail,
      mobile: "9876543210",
      password: partnerPassword,
      confirmPassword: partnerPassword,
      city: "Jabalpur",
      state: "Madhya Pradesh",
      marketingArea: "Regression test market",
    },
  );
  await expectStatus("partner registration", registerPartner, 201);

  const registeredPartner = await prisma.referralPartner.findFirst({
    where: { user: { email: partnerEmail } },
    include: { user: true },
  });
  if (!registeredPartner || registeredPartner.status !== "PENDING") {
    throw new Error("Partner was not created in PENDING status");
  }
  created.partnerIds.push(registeredPartner.id);
  created.userIds.push(registeredPartner.userId);

  await loginPartner(partnerEmail, partnerPassword, 403);

  const approve = await jsonRequest(
    `/api/admin/referrals/partners/${registeredPartner.id}/status`,
    "PATCH",
    { status: "ACTIVE" },
    adminCookie,
  );
  await expectStatus("approve partner", approve, 200);
  const approvePayload = await approve.json();
  const referralCode = approvePayload?.data?.referralCode;
  if (!referralCode) throw new Error("Approval did not generate a referral code");
  if (!/^WB-\d{5,6}$/.test(referralCode)) {
    throw new Error(
      `Referral code is not in the expected short format: ${referralCode}`,
    );
  }

  const partnerCookie = await loginPartner(
    partnerEmail,
    partnerPassword,
    200,
  );

  const settings = await jsonRequest(
    "/api/admin/referrals/settings",
    "PATCH",
    {
      isEnabled: true,
      commissionMode: "FIRST_PAID_SUBSCRIPTION",
      monthlyCommission: 55,
      quarterlyCommission: 135,
      halfYearlyCommission: 260,
      yearlyCommission: 505,
    },
    adminCookie,
  );
  await expectStatus("save referral settings", settings, 200);

  const merchantEmail = `merchant-${suffix}@example.test`;
  const merchantRegister = await jsonRequest(
    "/api/auth/register",
    "POST",
    {
      name: "Referral Merchant",
      email: merchantEmail,
      mobile: "9876501234",
      password: merchantPassword,
      shopName: `Referral Shop ${suffix}`,
      city: "Jabalpur",
      state: "Madhya Pradesh",
      referralCode,
    },
  );
  await expectStatus("merchant referral registration", merchantRegister, 201);

  const merchantUser = await prisma.user.findUnique({
    where: { email: merchantEmail },
    select: { id: true },
  });
  if (!merchantUser) throw new Error("Merchant user was not created");
  created.userIds.push(merchantUser.id);

  const shop = await prisma.shop.findFirst({
    where: { email: merchantEmail },
  });
  if (!shop) throw new Error("Referred merchant shop was not created");
  created.shopIds.push(shop.id);
  if (shop.referralPartnerId !== registeredPartner.id) {
    throw new Error("Referral code did not attribute the shop to the partner");
  }

  await prisma.shop.update({
    where: { id: shop.id },
    data: { status: "ACTIVE" },
  });

  const plan = await prisma.plan.create({
    data: {
      name: `Referral Regression Plan ${suffix}`,
      slug: `referral-regression-plan-${suffix}`,
      monthlyPrice: "299.00",
      quarterlyPrice: "837.00",
      halfYearlyPrice: "1614.00",
      annualPrice: "2988.00",
      productLimit: 100,
      imageLimitPerProduct: 5,
      trialDays: 0,
      graceDays: 7,
      status: "ACTIVE",
    },
  });
  created.planIds.push(plan.id);

  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.create({
    data: {
      shopId: shop.id,
      planId: plan.id,
      startDate: new Date(),
      endDate,
      status: "ACTIVE",
      paymentStatus: "PENDING",
    },
  });

  const firstPayment = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      reference: `REF-MONTHLY-${suffix}`,
      extendDays: 30,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("first referred monthly payment", firstPayment, 201);
  const firstPayload = await firstPayment.json();
  if (Number(firstPayload?.referralCommission?.amount) !== 55) {
    throw new Error("Monthly commission did not use the admin-configured amount");
  }

  const firstCommission = await prisma.referralCommission.findUnique({
    where: { paymentRecordId: firstPayload.data.id },
  });
  if (
    !firstCommission ||
    firstCommission.status !== "EARNED" ||
    Number(firstCommission.commissionAmount) !== 55
  ) {
    throw new Error("First referral commission was not persisted correctly");
  }

  const secondPayment = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      reference: `REF-MONTHLY-2-${suffix}`,
      extendDays: 30,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("second monthly payment", secondPayment, 201);
  const secondPayload = await secondPayment.json();
  if (secondPayload?.referralCommission !== null) {
    throw new Error("First-paid-only mode created a duplicate renewal commission");
  }

  const payout = await jsonRequest(
    `/api/admin/referrals/commissions/${firstCommission.id}`,
    "PATCH",
    {
      action: "PAY",
      payoutMethod: "UPI",
      reference: `PAYOUT-${suffix}`,
      comment: "Regression payout",
    },
    adminCookie,
  );
  await expectStatus("mark referral commission paid", payout, 200);

  const paidCommission = await prisma.referralCommission.findUnique({
    where: { id: firstCommission.id },
  });
  if (
    !paidCommission ||
    paidCommission.status !== "PAID" ||
    paidCommission.paidByUserId !== admin.id
  ) {
    throw new Error("Commission payout status was not persisted");
  }

  const zeroSettings = await jsonRequest(
    "/api/admin/referrals/settings",
    "PATCH",
    {
      isEnabled: true,
      commissionMode: "FIRST_PAID_SUBSCRIPTION",
      monthlyCommission: 0,
      quarterlyCommission: 0,
      halfYearlyCommission: 0,
      yearlyCommission: 0,
    },
    adminCookie,
  );
  await expectStatus("temporarily zero referral rates", zeroSettings, 200);

  const reconcileMerchantEmail = `reconcile-merchant-${suffix}@example.test`;
  const reconcileMerchantRegister = await jsonRequest(
    "/api/auth/register",
    "POST",
    {
      name: "Referral Reconcile Merchant",
      email: reconcileMerchantEmail,
      mobile: "9876505678",
      password: merchantPassword,
      shopName: `Referral Reconcile Shop ${suffix}`,
      city: "Jabalpur",
      state: "Madhya Pradesh",
      referralCode,
    },
  );
  await expectStatus(
    "reconcile merchant referral registration",
    reconcileMerchantRegister,
    201,
  );

  const reconcileMerchantUser = await prisma.user.findUnique({
    where: { email: reconcileMerchantEmail },
    select: { id: true },
  });
  if (!reconcileMerchantUser) {
    throw new Error("Reconcile merchant user was not created");
  }
  created.userIds.push(reconcileMerchantUser.id);

  const reconcileShop = await prisma.shop.findFirst({
    where: { email: reconcileMerchantEmail },
  });
  if (!reconcileShop) {
    throw new Error("Reconcile referred shop was not created");
  }
  created.shopIds.push(reconcileShop.id);

  await prisma.shop.update({
    where: { id: reconcileShop.id },
    data: { status: "ACTIVE" },
  });

  await prisma.subscription.create({
    data: {
      shopId: reconcileShop.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      paymentStatus: "PENDING",
    },
  });

  const paymentWithoutRate = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: reconcileShop.id,
      amount: 299,
      method: "UPI",
      billingCycle: "MONTHLY",
      reference: `REF-RECONCILE-${suffix}`,
      extendDays: 30,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus(
    "referred payment while referral rate is zero",
    paymentWithoutRate,
    201,
  );
  const paymentWithoutRatePayload = await paymentWithoutRate.json();
  if (paymentWithoutRatePayload?.referralCommission !== null) {
    throw new Error("Zero referral rate unexpectedly created commission");
  }

  const restoreSettings = await jsonRequest(
    "/api/admin/referrals/settings",
    "PATCH",
    {
      isEnabled: true,
      commissionMode: "FIRST_PAID_SUBSCRIPTION",
      monthlyCommission: 55,
      quarterlyCommission: 135,
      halfYearlyCommission: 260,
      yearlyCommission: 505,
    },
    adminCookie,
  );
  await expectStatus("restore referral rates for reconciliation", restoreSettings, 200);

  const reconcile = await request(
    "/api/admin/referrals/reconcile",
    { method: "POST" },
    adminCookie,
  );
  await expectStatus("reconcile missing referral commission", reconcile, 200);
  const reconcilePayload = await reconcile.json();
  if (Number(reconcilePayload?.data?.createdCount) < 1) {
    throw new Error("Reconciliation did not create the missing commission");
  }

  const reconciledCommission = await prisma.referralCommission.findFirst({
    where: { shopId: reconcileShop.id },
  });
  if (
    !reconciledCommission ||
    Number(reconciledCommission.commissionAmount) !== 55 ||
    reconciledCommission.status !== "EARNED"
  ) {
    throw new Error("Reconciled commission was not persisted at the current rate");
  }

  const reconcileAgain = await request(
    "/api/admin/referrals/reconcile",
    { method: "POST" },
    adminCookie,
  );
  await expectStatus("repeat referral reconciliation", reconcileAgain, 200);
  const reconcileAgainPayload = await reconcileAgain.json();
  if (Number(reconcileAgainPayload?.data?.createdCount) !== 0) {
    throw new Error("Repeat reconciliation created a duplicate commission");
  }

  const recurringSettings = await jsonRequest(
    "/api/admin/referrals/settings",
    "PATCH",
    {
      isEnabled: true,
      commissionMode: "EVERY_ELIGIBLE_PAYMENT",
      monthlyCommission: 55,
      quarterlyCommission: 135,
      halfYearlyCommission: 260,
      yearlyCommission: 505,
    },
    adminCookie,
  );
  await expectStatus("enable recurring commissions", recurringSettings, 200);

  const quarterlyPayment = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 837,
      method: "UPI",
      billingCycle: "QUARTERLY",
      reference: `REF-QUARTERLY-${suffix}`,
      extendDays: 90,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("quarterly referred payment", quarterlyPayment, 201);
  const quarterlyPayload = await quarterlyPayment.json();
  if (Number(quarterlyPayload?.referralCommission?.amount) !== 135) {
    throw new Error(
      "Quarterly commission did not use the admin-configured amount",
    );
  }

  const halfYearlyPayment = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 1614,
      method: "BANK_TRANSFER",
      billingCycle: "HALF_YEARLY",
      reference: `REF-HALF-YEARLY-${suffix}`,
      extendDays: 182,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("half-yearly referred payment", halfYearlyPayment, 201);
  const halfYearlyPayload = await halfYearlyPayment.json();
  if (Number(halfYearlyPayload?.referralCommission?.amount) !== 260) {
    throw new Error(
      "Half-Yearly commission did not use the admin-configured amount",
    );
  }

  const yearlyPayment = await jsonRequest(
    "/api/admin/payments",
    "POST",
    {
      shopId: shop.id,
      amount: 2988,
      method: "BANK_TRANSFER",
      billingCycle: "YEARLY",
      reference: `REF-YEARLY-${suffix}`,
      extendDays: 365,
      activateSubscription: true,
    },
    adminCookie,
  );
  await expectStatus("yearly referred payment", yearlyPayment, 201);
  const yearlyPayload = await yearlyPayment.json();
  if (Number(yearlyPayload?.referralCommission?.amount) !== 505) {
    throw new Error("Yearly commission did not use the admin-configured amount");
  }

  const overview = await request(
    "/api/admin/referrals/overview",
    {},
    adminCookie,
  );
  await expectStatus("referral overview", overview, 200);
  const overviewPayload = await overview.json();
  if (
    Number(overviewPayload?.data?.revenue?.commissionEarned) < 1010 ||
    overviewPayload?.data?.counts?.referredShops < 1
  ) {
    throw new Error("Referral overview did not include commission/referred shop data");
  }

  const partnerDashboard = await request(
    "/partner/dashboard",
    {},
    partnerCookie,
  );
  await expectStatus("partner dashboard", partnerDashboard, 200);

  const landingPage = await request("/");
  await expectStatus("landing page referral section", landingPage, 200);
  const landingHtml = await landingPage.text();
  if (
    !landingHtml.includes("Earn with Webbanao") ||
    !landingHtml.includes("/partner/register") ||
    !landingHtml.includes("/partner/login") ||
    !landingHtml.includes("Quarterly") ||
    !landingHtml.includes("Half-Yearly") ||
    !landingHtml.includes("837") ||
    !landingHtml.includes("1,614")
  ) {
    throw new Error(
      "Landing page does not expose dynamic four-cycle pricing/referral content",
    );
  }

  const partnerPageResponse = await request(
    "/api/admin/referrals/partners?page=1&pageSize=1",
    {},
    adminCookie,
  );
  await expectStatus("referral partner pagination", partnerPageResponse, 200);
  const partnerPagePayload = await partnerPageResponse.json();
  if (
    partnerPagePayload?.items?.length > 1 ||
    partnerPagePayload?.pagination?.pageSize !== 1 ||
    !Array.isArray(partnerPagePayload?.options)
  ) {
    throw new Error("Referral partner pagination contract is not enforced");
  }

  const commissionPageResponse = await request(
    "/api/admin/referrals/commissions?page=1&pageSize=1",
    {},
    adminCookie,
  );
  await expectStatus("referral commission pagination", commissionPageResponse, 200);
  const commissionPagePayload = await commissionPageResponse.json();
  if (
    commissionPagePayload?.items?.length > 1 ||
    commissionPagePayload?.pagination?.pageSize !== 1
  ) {
    throw new Error("Referral commission pagination contract is not enforced");
  }

  const shopPageResponse = await request(
    "/api/admin/shops?status=ACTIVE&page=1&pageSize=1",
    {},
    adminCookie,
  );
  await expectStatus("admin shop pagination", shopPageResponse, 200);
  const shopPagePayload = await shopPageResponse.json();
  if (
    shopPagePayload?.items?.length > 1 ||
    shopPagePayload?.pagination?.pageSize !== 1
  ) {
    throw new Error("Admin shop pagination contract is not enforced");
  }

  process.stdout.write(
    "Referral registration, approval, attribution, commission, payout and partner dashboard regression checks passed.\n",
  );
}

main()
  .catch((error) => {
    console.error("Referral platform regression checks failed.");
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
