import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

if (process.env.STAGING_MIGRATE_ON_BUILD !== "true") {
  console.log("[staging-migrations] Skipped (explicit opt-in is disabled).");
  process.exit(0);
}
if (process.env.APP_URL !== "https://staging.webbanao.in") {
  console.error("[staging-migrations] Refused: APP_URL is not the staging hostname.");
  process.exit(1);
}

let databaseName;
try {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.protocol !== "mysql:") throw new Error("Not MySQL");
  databaseName = decodeURIComponent(url.pathname.slice(1));
} catch {
  console.error("[staging-migrations] Refused: invalid DATABASE_URL.");
  process.exit(1);
}
if (databaseName !== "u915155957_catalogstaging") {
  console.error("[staging-migrations] Refused: database is not the approved staging database.");
  process.exit(1);
}

// Prisma migrate deploy is non-destructive and does not need a shadow database.
// Fail the Hostinger build rather than publishing a release with missing tables.
const prismaCli = resolve("node_modules/prisma/build/index.js");
console.log("[staging-migrations] Applying existing Prisma migrations to staging...");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  timeout: 180_000,
});
if (result.error || result.status !== 0) {
  console.error("[staging-migrations] Migration failed; deployment must not proceed.");
  process.exit(1);
}
console.log("[staging-migrations] Migration deployment completed.");
