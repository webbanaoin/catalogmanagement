import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

if (process.env.SPRINT6_TEST_CONFIRM !== "YES") throw Error("Use a disposable test DB only.");
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname)) {
  throw Error("Registration regression must not target a remote server.");
}
const prisma = new PrismaClient();
const stamp = randomUUID().slice(0, 9);
const email = `reg-event-${stamp}@example.test`;
const badEmail = `reg-invalid-${stamp}@example.test`;
const expiredEmail = `reg-expired-${stamp}@example.test`;
const partnerEmail = `reg-partner-${stamp}@example.test`;
const password = `RegistrationAa9!${stamp}`;
const fixtures = { shops: [], users: [], emails: [email, badEmail, expiredEmail, partnerEmail] };
function assert(value, message) { if (!value) throw Error(message); }
async function call(path, body) {
  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}
function otpCodeHash(address, purpose, code) {
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`registration-otp:${purpose}:${address.toLowerCase()}:${code}`)
    .digest("hex");
}
async function challenge(address, purpose, code) {
  await prisma.registrationEmailOtp.create({
    data: {
      email: address,
      purpose,
      codeHash: otpCodeHash(address, purpose, code),
      expiresAt: new Date(Date.now() + 20_000),
      lastSentAt: new Date(Date.now() - 9 * 60000),
    },
  });
}
function grantHash(address, token) {
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`registration-verification:MERCHANT:${address.toLowerCase()}:${token}`)
    .digest("hex");
}
async function otp(address, token) {
  await prisma.registrationEmailOtp.create({
    data: {
      email: address, purpose: "MERCHANT",
      codeHash: "a".repeat(64),
      verificationTokenHash: grantHash(address, token),
      verifiedAt: new Date(),
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60000),
    },
  });
}
function data(address, token, categoryId) {
  return {
    name: "Event Registration Test",
    email: address, emailVerificationToken: token,
    mobile: "9168720245", password,
    shopName: `Regression Event Shop ${stamp}`,
    businessCategoryId: categoryId,
  };
}
async function main() {
  const category = await prisma.businessCategory.findUnique({
    where: { slug: "event-planners-decorators" },
    select: { id: true },
  });
  assert(category, "Event Planner category not migrated");

  const badToken = randomBytes(32).toString("base64url");
  await otp(badEmail, badToken);
  const invalid = await call("/api/auth/register", data(
    badEmail, randomBytes(32).toString("base64url"), category.id,
  ));
  assert(invalid.response.status === 400 && invalid.json.error.code === "EMAIL_VERIFICATION_REQUIRED",
    "Invalid OTP grant must reject with useful message");
  assert(!await prisma.user.findUnique({ where: { email: badEmail } }),
    "Invalid grant must not create a user");
  assert((await prisma.registrationEmailOtp.findUnique({
    where: { email_purpose: { email: badEmail, purpose: "MERCHANT" } },
  })).consumedAt === null, "Invalid OTP must not consume the verification grant");

  // A customer who verifies near the end of the OTP delivery window must
  // receive a fresh 10-minute verified grant, instead of an almost-expired one.
  await challenge(email, "MERCHANT", "619284");
  const verified = await call("/api/registration/email-otp/verify", {
    email, purpose: "MERCHANT", code: "619284",
  });
  assert(verified.response.status === 200, "Near-expiry merchant OTP must verify");
  const token = verified.json.data.verificationToken;
  const expiry = Date.parse(verified.json.data.expiresAt);
  assert(typeof token === "string" && token.length >= 32, "Verification token missing");
  assert(expiry > Date.now() + 9 * 60_000,
    "Verified OTP must grant a fresh 10-minute window after verification");
  const repeat = await call("/api/registration/email-otp/verify", {
    email, purpose: "MERCHANT", code: "619284",
  });
  assert(repeat.response.status === 400 && repeat.json.error.code === "OTP_EXPIRED_OR_INVALID",
    "Verified OTP must not be reused");

  // Expired grants must be rejected safely and allow a *new* code to verify.
  const expiredToken = randomBytes(32).toString("base64url");
  await otp(expiredEmail, expiredToken);
  await prisma.registrationEmailOtp.update({
    where: { email_purpose: { email: expiredEmail, purpose: "MERCHANT" } },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expired = await call("/api/auth/register", data(expiredEmail, expiredToken, category.id));
  assert(expired.response.status === 400 &&
    expired.json.error.code === "EMAIL_VERIFICATION_REQUIRED",
    "Expired verified grant must prompt fresh OTP, not an unexpected 500");
  assert(!await prisma.user.findUnique({ where: { email: expiredEmail } }),
    "Expired grant must not create a merchant");
  await prisma.registrationEmailOtp.update({
    where: { email_purpose: { email: expiredEmail, purpose: "MERCHANT" } },
    data: {
      codeHash: otpCodeHash(expiredEmail, "MERCHANT", "729415"),
      expiresAt: new Date(Date.now() + 60_000),
      verifiedAt: null, verificationTokenHash: null, consumedAt: null,
    },
  });
  const recovered = await call("/api/registration/email-otp/verify", {
    email: expiredEmail, purpose: "MERCHANT", code: "729415",
  });
  assert(recovered.response.status === 200 &&
    Date.parse(recovered.json.data.expiresAt) > Date.now() + 9 * 60_000,
    "User must be able to reverify after an expired grant");

  await challenge(partnerEmail, "PARTNER", "187693");
  const partnerVerified = await call("/api/registration/email-otp/verify", {
    email: partnerEmail, purpose: "PARTNER", code: "187693",
  });
  assert(partnerVerified.response.status === 200 &&
    Date.parse(partnerVerified.json.data.expiresAt) > Date.now() + 9 * 60_000,
    "Marketing Partner must receive the same verified window");

  const success = await call("/api/auth/register", data(email, token, category.id));
  assert(success.response.status === 201,
    `Event signup expected 201, got ${success.response.status}: ${JSON.stringify(success.json).slice(0, 350)}`);
  const { user, shop, membership } = success.json.data ?? {};
  assert(user?.id && shop?.id && membership?.role === "OWNER" &&
    shop.status === "PENDING", "Registered owner/shop/membership missing");
  fixtures.shops.push(shop.id);
  fixtures.users.push(user.id);
  const grant = await prisma.registrationEmailOtp.findUnique({
    where: { email_purpose: { email, purpose: "MERCHANT" } },
  });
  assert(grant.consumedAt, "Verified registration grant should be consumed exactly once");
  assert((await prisma.shopUser.count({ where: { userId: user.id, shopId: shop.id } })) === 1,
    "Owner membership missing");
  assert(shop.businessCategoryId === category.id, "Chosen event vertical missing");

  const categories = await prisma.shopCategory.findMany({
    where: { shopId: shop.id },
    select: { id: true, name: true, parentId: true },
  });
  const byName = new Map(categories.map((item) => [item.name, item]));
  const decoration = byName.get("Decoration");
  const theme = byName.get("Theme-Based Decoration");
  const jungle = byName.get("Jungle Theme");
  const entries = byName.get("Event Entries");
  const jhoomar = byName.get("Jhoomar Entry");
  assert(decoration && theme && jungle && entries && jhoomar,
    `Nested event templates missing after registration: ${categories.length} categories`);
  assert(theme.parentId === decoration.id && jungle.parentId === theme.id &&
    jhoomar.parentId === entries.id, "Event category parents incorrectly linked");
  const initialCount = categories.length;
  const pendingLogin = await call("/api/auth/login", { email, password });
  assert(pendingLogin.response.status === 403 &&
    pendingLogin.json.error?.code === "SHOP_PENDING_APPROVAL",
    "Existing admin approval gate must block pending merchant login");

  // Advance *only* the disposable CI shop to an approved state; the route's
  // normal approval workflow is covered by existing security/tenant suites.
  await prisma.shop.update({ where: { id: shop.id }, data: { status: "APPROVED" } });
  const login = await call("/api/auth/login", { email, password });
  assert(login.response.status === 200, "Approved merchant cannot sign in after registration");
  const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
  const list = await fetch(`${baseUrl}/api/shops/${shop.id}/categories?pageSize=100`, {
    headers: { Cookie: cookie },
  });
  assert(list.status === 200, "Merchant cannot list categories after signup");
  assert((await prisma.shopCategory.count({ where: { shopId: shop.id } })) === initialCount,
    "Category retry/list must be idempotent");

  const again = await call("/api/auth/register", data(email, token, category.id));
  assert(again.response.status === 409 && again.json.error.code === "EMAIL_IN_USE",
    "Duplicate registration should explain that account exists");
  assert((await prisma.user.count({ where: { email } })) === 1,
    "Duplicate registration must not create users");
  console.log("PASS: merchant/partner OTP grace, expired-grant recovery, merchant signup, approval, event defaults and duplicate protection");
}
try { await main(); }
finally {
  try {
    await prisma.auditLog.deleteMany({ where: {
      OR: [
        { shopId: { in: fixtures.shops } },
        { actorUserId: { in: fixtures.users } },
      ],
    } });
    if (fixtures.shops.length) await prisma.shop.deleteMany({ where: { id: { in: fixtures.shops } } });
    if (fixtures.users.length) await prisma.user.deleteMany({ where: { id: { in: fixtures.users } } });
    await prisma.registrationEmailOtp.deleteMany({ where: { email: { in: fixtures.emails } } });
  } finally { await prisma.$disconnect(); }
}
