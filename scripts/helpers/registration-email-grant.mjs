import { createHmac, randomBytes } from "node:crypto";

/**
 * Create a disposable verified-email grant for isolated regression data.
 * These scripts already require SPRINT6_TEST_CONFIRM=YES and a disposable DB.
 * Never call this helper from application code or production workflows.
 */
export async function seedRegressionEmailGrant(prisma, email, purpose) {
  if (process.env.SPRINT6_TEST_CONFIRM !== "YES") {
    throw new Error("Refusing to seed registration grant outside the isolated test environment.");
  }
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required for test registration grants.");
  }
  const normalizedEmail = email.toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const verificationTokenHash = createHmac("sha256", process.env.AUTH_SECRET)
    .update(`registration-verification:${purpose}:${normalizedEmail}:${token}`)
    .digest("hex");
  const now = new Date();
  const data = {
    codeHash: "0".repeat(64), verificationTokenHash,
    verifiedAt: now, consumedAt: null, attempts: 0,
    lastSentAt: now, expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  };
  await prisma.registrationEmailOtp.upsert({
    where: { email_purpose: { email: normalizedEmail, purpose } },
    create: { email: normalizedEmail, purpose, ...data },
    update: data,
  });
  return token;
}
