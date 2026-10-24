/**
 * Validate same-origin analytics events behind reverse proxies.
 * Railway may expose request.url as http://localhost:8080 even though
 * users browse https://digishowroom.webbanao.in.
 *
 * Never trust arbitrary X-Forwarded-Host values from callers.
 */
export function isTrustedGrowthOrigin(
  origin: string | null,
  configuredAppUrl: string,
  requestUrl: string,
): boolean {
  if (!origin) return true; // non-browser clients may not send Origin
  try {
    const publicOrigin = new URL(configuredAppUrl).origin;
    const requestOrigin = new URL(requestUrl).origin;
    return origin === publicOrigin || origin === requestOrigin;
  } catch {
    return false;
  }
}
