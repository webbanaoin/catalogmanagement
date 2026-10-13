import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
  throw new Error(
    "Refusing to create temporary security-test data. Set SPRINT6_TEST_CONFIRM=YES after confirming DATABASE_URL points to a disposable/local test database.",
  );
}

const target = new URL(baseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(target.hostname) &&
  process.env.ALLOW_REMOTE_SPRINT6_TESTS !== "YES"
) {
  throw new Error(
    "Remote Sprint 6 security tests are disabled by default. Set ALLOW_REMOTE_SPRINT6_TESTS=YES only for an isolated staging target.",
  );
}

const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const password = `Sprint6-Sec9!${randomUUID().slice(0, 12)}`;
const created = { userIds: [], shopIds: [] };

async function request(path, options = {}, testIp = "203.0.113.30") {
  const headers = new Headers(options.headers || {});
  headers.set("X-Real-IP", testIp);

  return fetch(baseUrl + path, {
    ...options,
    headers,
    redirect: "manual",
  });
}

async function jsonRequest(path, method, body, testIp) {
  return request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    testIp,
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

async function expectErrorCode(label, response, status, code) {
  await expectStatus(label, response, status);
  const payload = await response.json();
  if (payload?.error?.code !== code) {
    throw new Error(
      `${label}: expected error code ${code}, got ${JSON.stringify(payload?.error?.code)}`,
    );
  }
}

async function cleanup() {
  if (created.shopIds.length) {
    await prisma.shop.deleteMany({ where: { id: { in: created.shopIds } } });
  }
  if (created.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  }
}

async function main() {
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: "Sprint 6 Security User",
      email: `sprint6-security-${suffix}@example.test`,
      passwordHash,
    },
  });
  created.userIds.push(user.id);

  const shop = await prisma.shop.create({
    data: {
      name: "Sprint 6 Security Shop",
      slug: `sprint6-security-shop-${suffix}`,
      status: "ACTIVE",
      email: user.email,
    },
  });
  created.shopIds.push(shop.id);

  await prisma.shopUser.create({
    data: { userId: user.id, shopId: shop.id, role: "OWNER" },
  });

  const oversizedPayload = {
    email: user.email,
    password: "x".repeat(70 * 1024),
  };
  await expectErrorCode(
    "oversized JSON",
    await jsonRequest(
      "/api/auth/login",
      "POST",
      oversizedPayload,
      "203.0.113.31",
    ),
    413,
    "PAYLOAD_TOO_LARGE",
  );

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    await expectStatus(
      `login throttle pre-limit attempt ${attempt}`,
      await jsonRequest(
        "/api/auth/login",
        "POST",
        { email: user.email, password: "definitely-wrong-password" },
        "203.0.113.32",
      ),
      401,
    );
  }

  await expectErrorCode(
    "per-account login throttle",
    await jsonRequest(
      "/api/auth/login",
      "POST",
      { email: user.email, password: "definitely-wrong-password" },
      "203.0.113.32",
    ),
    429,
    "RATE_LIMITED",
  );

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await expectStatus(
      `forgot-password throttle pre-limit attempt ${attempt}`,
      await jsonRequest(
        "/api/auth/forgot-password",
        "POST",
        { email: user.email },
        "203.0.113.33",
      ),
      200,
    );
  }

  await expectErrorCode(
    "forgot-password throttle",
    await jsonRequest(
      "/api/auth/forgot-password",
      "POST",
      { email: user.email },
      "203.0.113.33",
    ),
    429,
    "RATE_LIMITED",
  );

  const analyticsBody = {
    eventType: "CATALOG_VISIT",
    sessionId: `security-${suffix}`,
    source: "sprint6-test",
    deviceType: "DESKTOP",
  };

  for (let attempt = 1; attempt <= 120; attempt += 1) {
    await expectStatus(
      `analytics throttle pre-limit attempt ${attempt}`,
      await jsonRequest(
        `/api/public/shops/${shop.slug}/analytics/events`,
        "POST",
        analyticsBody,
        "203.0.113.34",
      ),
      202,
    );
  }

  await expectErrorCode(
    "public analytics throttle",
    await jsonRequest(
      `/api/public/shops/${shop.slug}/analytics/events`,
      "POST",
      analyticsBody,
      "203.0.113.34",
    ),
    429,
    "RATE_LIMITED",
  );

  process.stdout.write(
    "Sprint 6 payload-size and rate-limit regression checks passed.\n",
  );
}

main()
  .catch((error) => {
    console.error("Sprint 6 security regression checks failed.");
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
