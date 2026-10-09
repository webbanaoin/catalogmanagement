import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fail(message) {
  throw new Error(message);
}

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required`);
  return value;
}

async function main() {
  if (process.env.NODE_ENV !== "production") {
    fail("NODE_ENV must be production for the production preflight");
  }

  const appUrl = requireValue("APP_URL");
  let parsedAppUrl;
  try {
    parsedAppUrl = new URL(appUrl);
  } catch {
    fail("APP_URL must be a valid URL");
  }

  if (parsedAppUrl.protocol !== "https:") {
    fail("APP_URL must use HTTPS in production");
  }

  const authSecret = requireValue("AUTH_SECRET");
  if (authSecret.length < 32) {
    fail("AUTH_SECRET must contain at least 32 characters");
  }
  if (
    authSecret.includes("replace-with") ||
    authSecret.includes("change-me")
  ) {
    fail("AUTH_SECRET must not use an example placeholder");
  }

  const databaseUrl = requireValue("DATABASE_URL");
  if (!databaseUrl.startsWith("mysql://")) {
    fail("DATABASE_URL must use MySQL");
  }

  const shadowDatabaseUrl = requireValue("SHADOW_DATABASE_URL");
  if (!shadowDatabaseUrl.startsWith("mysql://")) {
    fail("SHADOW_DATABASE_URL must use MySQL");
  }
  if (shadowDatabaseUrl === databaseUrl) {
    fail("SHADOW_DATABASE_URL must never be the production DATABASE_URL");
  }

  requireValue("AWS_REGION");
  requireValue("AWS_S3_BUCKET");
  requireValue("AWS_ACCESS_KEY_ID");
  requireValue("AWS_SECRET_ACCESS_KEY");

  const resendApiKey = requireValue("RESEND_API_KEY");
  const resetFromEmail = requireValue("PASSWORD_RESET_FROM_EMAIL");
  if (
    resendApiKey.includes("replace") ||
    resendApiKey.includes("example")
  ) {
    fail("RESEND_API_KEY must not use an example placeholder");
  }
  if (
    resetFromEmail.includes("your-verified-domain.example") ||
    resetFromEmail.includes("@example.")
  ) {
    fail("PASSWORD_RESET_FROM_EMAIL must use a verified production domain");
  }

  if (process.env.PASSWORD_RESET_EXPOSE_URL === "true") {
    fail(
      "PASSWORD_RESET_EXPOSE_URL must be false in production; raw reset links must never be exposed by the API",
    );
  }

  if (process.env.AWS_S3_ENDPOINT) {
    try {
      new URL(process.env.AWS_S3_ENDPOINT);
    } catch {
      fail("AWS_S3_ENDPOINT must be a valid URL");
    }
  }

  if (process.env.MEDIA_BASE_URL) {
    try {
      new URL(process.env.MEDIA_BASE_URL);
    } catch {
      fail("MEDIA_BASE_URL must be a valid URL");
    }
  }

  await prisma.$queryRaw`SELECT 1`;

  process.stdout.write(
    "Production preflight passed: configuration shape and database connectivity are valid.\n",
  );
}

main()
  .catch((error) => {
    console.error("Production preflight failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
