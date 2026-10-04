const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function request(path) {
  const response = await fetch(baseUrl + path, {
    redirect: "manual",
    headers: { "User-Agent": "catalog-sprint6-smoke/1.0" },
  });
  return response;
}

function requireHeader(response, name, expected) {
  const value = response.headers.get(name);
  if (!value || (expected && value !== expected)) {
    throw new Error(
      `${name} missing or unexpected: ${JSON.stringify(value)}`,
    );
  }
}

async function main() {
  const health = await request("/api/health");
  if (health.status !== 200) {
    throw new Error(`Health check returned HTTP ${health.status}`);
  }

  const payload = await health.json();
  if (payload?.data?.status !== "ok" || payload?.data?.database !== "ok") {
    throw new Error("Health check did not report application/database ready");
  }

  const home = await request("/");
  if (home.status >= 500) {
    throw new Error(`Home page returned HTTP ${home.status}`);
  }

  requireHeader(home, "x-content-type-options", "nosniff");
  requireHeader(home, "x-frame-options", "DENY");
  requireHeader(home, "referrer-policy", "strict-origin-when-cross-origin");
  requireHeader(home, "permissions-policy", "camera=(), microphone=(), geolocation=()");

  if (home.headers.get("x-powered-by")) {
    throw new Error("X-Powered-By header should be disabled");
  }

  if (baseUrl.startsWith("https://")) {
    requireHeader(home, "strict-transport-security");
  }

  const plans = await request("/api/plans");
  if (plans.status !== 200) {
    throw new Error(`Public plans endpoint returned HTTP ${plans.status}`);
  }

  process.stdout.write(
    `Sprint 6 smoke checks passed for ${baseUrl}.\n`,
  );
}

main().catch((error) => {
  console.error("Sprint 6 smoke checks failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
