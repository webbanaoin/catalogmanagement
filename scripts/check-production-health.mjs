const app = process.env.APP_URL;
if (!app || !app.startsWith("https://")) {
  console.error("APP_URL must be a production HTTPS origin");
  process.exit(1);
}
const timeout = Number(process.env.HEALTH_TIMEOUT_MS || 10000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeout);
try {
  const response = await fetch(new URL("/api/health", app), { signal: controller.signal, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  const healthy = response.ok && payload?.data?.status === "ok" && payload?.data?.database === "ok";
  console.log(JSON.stringify({ time: new Date().toISOString(), healthy, status: response.status }));
  if (!healthy) process.exitCode = 1;
} catch (error) {
  console.error("Health check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
