import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const oldPassword = `Reset-Old-Aa9!${randomUUID().slice(0, 10)}`;
const newPassword = `Reset-New-Aa9!${randomUUID().slice(0, 10)}`;
const partnerOldPassword = `Partner-Old-Aa9!${randomUUID().slice(0, 10)}`;
const partnerNewPassword = `Partner-New-Aa9!${randomUUID().slice(0, 10)}`;

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create password-reset regression data. Set SPRINT6_TEST_CONFIRM=YES only for an isolated test database.",
  );
}

async function request(path, options = {}, ip = "203.0.113.91", cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", ip);
  if (cookie) headers.set("Cookie", cookie);

  return fetch(baseUrl + path, {
    ...options,
    headers,
    redirect: "manual",
  });
}

async function jsonRequest(path, method, body, ip, cookie) {
  return request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    ip,
    cookie,
  );
}

async function expectStatus(label, response, expected) {
  if (response.status !== expected) {
    throw new Error(
      `${label}: expected HTTP ${expected}, got ${response.status}. ${(await response.text()).slice(0, 700)}`,
    );
  }
}

async function expectErrorCode(label, response, status, code) {
  await expectStatus(label, response, status);
  const payload = await response.json();
  if (payload?.error?.code !== code) {
    throw new Error(
      `${label}: expected error code ${code}, got ${JSON.stringify(payload?.error?.code)}`,
    );
  }
}

function resetTokenFromPayload(payload) {
  const resetUrl = payload?.data?.developmentResetUrl;
  if (!resetUrl) {
    throw new Error(
      "Password reset test mode did not return developmentResetUrl. Ensure PASSWORD_RESET_EXPOSE_URL=true.",
    );
  }

  const token = new URL(resetUrl).searchParams.get("token");
  if (!token) throw new Error("Development reset URL does not contain token");
  return token;
}

function sessionCookie(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) throw new Error("Login did not return session cookie");
  return raw.split(";")[0];
}

async function main() {
  const merchant = await prisma.user.create({
    data: {
      name: "Password Reset Merchant",
      email: `password-reset-merchant-${suffix}@example.test`,
      passwordHash: await hash(oldPassword, 12),
      status: "ACTIVE",
      platformRole: "USER",
    },
  });

  const partnerUser = await prisma.user.create({
    data: {
      name: "Password Reset Partner",
      email: `password-reset-partner-${suffix}@example.test`,
      passwordHash: await hash(partnerOldPassword, 12),
      status: "ACTIVE",
      platformRole: "PARTNER",
      referralPartner: {
        create: {
          status: "ACTIVE",
          referralCode: `WB-RST-${randomUUID().slice(0, 6).toUpperCase()}`,
          approvedAt: new Date(),
        },
      },
    },
  });

  try {
    const initialLogin = await jsonRequest(
      "/api/auth/login",
      "POST",
      { email: merchant.email, password: oldPassword },
      "203.0.113.91",
    );
    await expectStatus("initial merchant login", initialLogin, 200);
    const oldSessionCookie = sessionCookie(initialLogin);

    const forgot = await jsonRequest(
      "/api/auth/forgot-password",
      "POST",
      { email: merchant.email },
      "203.0.113.92",
    );
    await expectStatus("merchant forgot password", forgot, 200);
    const forgotPayload = await forgot.json();
    const merchantToken = resetTokenFromPayload(forgotPayload);

    const unknown = await jsonRequest(
      "/api/auth/forgot-password",
      "POST",
      { email: `missing-${suffix}@example.test` },
      "203.0.113.93",
    );
    await expectStatus("unknown account forgot password", unknown, 200);
    const unknownPayload = await unknown.json();
    if (unknownPayload?.data?.developmentResetUrl) {
      throw new Error(
        "Forgot-password endpoint exposed account existence for unknown email",
      );
    }
    if (unknownPayload?.data?.message !== forgotPayload?.data?.message) {
      throw new Error(
        "Forgot-password response message differs between existing and unknown accounts",
      );
    }

    const reset = await jsonRequest(
      "/api/auth/reset-password",
      "POST",
      { token: merchantToken, password: newPassword },
      "203.0.113.94",
    );
    await expectStatus("merchant password reset", reset, 200);

    await expectErrorCode(
      "used reset token",
      await jsonRequest(
        "/api/auth/reset-password",
        "POST",
        { token: merchantToken, password: newPassword },
        "203.0.113.95",
      ),
      400,
      "INVALID_RESET_TOKEN",
    );

    await expectStatus(
      "old merchant session revoked",
      await request("/api/auth/me", {}, "203.0.113.96", oldSessionCookie),
      401,
    );

    await expectStatus(
      "old merchant password rejected",
      await jsonRequest(
        "/api/auth/login",
        "POST",
        { email: merchant.email, password: oldPassword },
        "203.0.113.97",
      ),
      401,
    );

    await expectStatus(
      "new merchant password accepted",
      await jsonRequest(
        "/api/auth/login",
        "POST",
        { email: merchant.email, password: newPassword },
        "203.0.113.98",
      ),
      200,
    );

    const merchantAudit = await prisma.auditLog.findFirst({
      where: {
        actorUserId: merchant.id,
        action: "PASSWORD_RESET_COMPLETED",
      },
      select: { id: true },
    });
    if (!merchantAudit) {
      throw new Error("Successful password reset did not create audit record");
    }

    const partnerForgot = await jsonRequest(
      "/api/auth/forgot-password",
      "POST",
      { email: partnerUser.email },
      "203.0.113.99",
    );
    await expectStatus("partner forgot password", partnerForgot, 200);
    const partnerToken = resetTokenFromPayload(await partnerForgot.json());

    const partnerReset = await jsonRequest(
      "/api/auth/reset-password",
      "POST",
      { token: partnerToken, password: partnerNewPassword },
      "203.0.113.100",
    );
    await expectStatus("partner password reset", partnerReset, 200);

    await expectStatus(
      "old partner password rejected",
      await jsonRequest(
        "/api/partner/login",
        "POST",
        { email: partnerUser.email, password: partnerOldPassword },
        "203.0.113.101",
      ),
      401,
    );

    await expectStatus(
      "new partner password accepted",
      await jsonRequest(
        "/api/partner/login",
        "POST",
        { email: partnerUser.email, password: partnerNewPassword },
        "203.0.113.102",
      ),
      200,
    );

    const forgotPage = await request("/forgot-password", {}, "203.0.113.103");
    await expectStatus("forgot password page", forgotPage, 200);
    const forgotHtml = await forgotPage.text();
    if (!forgotHtml.includes("Reset your password")) {
      throw new Error("Forgot password page did not render expected content");
    }

    const resetPage = await request(
      `/reset-password?token=${encodeURIComponent(merchantToken)}`,
      {},
      "203.0.113.104",
    );
    await expectStatus("reset password page", resetPage, 200);
    const resetHtml = await resetPage.text();
    if (!resetHtml.includes("Choose a new password")) {
      throw new Error("Reset password page did not render expected content");
    }

    process.stdout.write(
      "Password reset request, single-use token, session revocation, merchant login, partner login and reset UI checks passed.\n",
    );
  } finally {
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: [merchant.id, partnerUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [merchant.id, partnerUser.id] } },
    });
  }
}

main()
  .catch((error) => {
    console.error("Password reset regression checks failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
