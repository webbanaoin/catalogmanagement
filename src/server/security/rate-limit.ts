import "server-only";

import { isIP } from "node:net";

import { AppError } from "@/server/http/app-error";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_BUCKETS = 10_000;
let lastCleanupAt = 0;

function cleanExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS && buckets.size < MAX_BUCKETS) {
    return;
  }

  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  lastCleanupAt = now;

  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (buckets.size <= MAX_BUCKETS - Math.min(overflow, MAX_BUCKETS)) break;
    }
  }
}

function firstValidIp(value: string | null): string | null {
  if (!value) return null;

  for (const candidate of value.split(",")) {
    const normalized = candidate.trim();
    if (isIP(normalized)) return normalized;
  }

  return null;
}

export function getClientIp(request: Request): string {
  return (
    firstValidIp(request.headers.get("cf-connecting-ip")) ??
    firstValidIp(request.headers.get("x-real-ip")) ??
    firstValidIp(request.headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now();
  cleanExpiredBuckets(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      status: 429,
    });
  }

  current.count += 1;
}
