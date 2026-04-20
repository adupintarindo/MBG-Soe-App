// ============================================================================
// Rate limiter · in-memory token bucket untuk server action + API routes
// ----------------------------------------------------------------------------
// Scope: single-process (cocok utk Vercel hobby / single Node instance).
// Untuk multi-region, ganti backend ke Upstash Redis — API sama.
//
// Pemakaian:
//   import { rateLimit } from "@/lib/rate-limit";
//   const rl = await rateLimit({ key: `devlogin:${ip}`, limit: 5, windowSec: 60 });
//   if (!rl.ok) return new Response("Too many requests", { status: 429 });
// ============================================================================

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const STORE = new Map<string, Bucket>();

export interface RateLimitOpts {
  key: string;
  limit: number;          // jumlah request max
  windowSec: number;      // window detik
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export async function rateLimit({
  key,
  limit,
  windowSec
}: RateLimitOpts): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const b = STORE.get(key);

  if (!b) {
    STORE.set(key, { tokens: limit - 1, updatedAt: now });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  const elapsed = now - b.updatedAt;
  const refill = Math.floor((elapsed / windowMs) * limit);
  const tokens = Math.min(limit, b.tokens + refill);

  if (tokens <= 0) {
    const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, retryAfter) };
  }

  b.tokens = tokens - 1;
  b.updatedAt = now;
  STORE.set(key, b);
  return { ok: true, remaining: b.tokens, retryAfterSec: 0 };
}

/** Helper: extract IP from Next headers (x-forwarded-for / x-real-ip / fallback). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

/** Periodic cleanup supaya map tidak bocor di long-lived process. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of STORE.entries()) {
      if (now - v.updatedAt > 15 * 60 * 1000) STORE.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}
