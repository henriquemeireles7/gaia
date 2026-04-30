// packages/security/rate-limits.ts — Postgres-backed fixed-window counter.
//
// Vision §Security-4: rate limit by endpoint tier AND business flow. v1
// uses Postgres (Neon) so the template ships with zero new infrastructure.
// Swap to Redis/Dragonfly when single-DB throughput becomes a bottleneck —
// only this file changes.
//
// Atomic semantics: INSERT ... ON CONFLICT DO UPDATE returns the count
// AFTER the increment, so the check is correct under concurrent writes.
// No race window between SELECT and UPDATE.
//
// Window strategy: fixed bucket. Cheap, correct enough for brute-force
// defense. Sliding-window precision (e.g., GCRA) lives behind the same
// `checkRateLimit` API when an upgrade is needed.
//
// Cleanup: stale rows are pruned by a periodic DELETE in
// scripts/rate-limits-prune.ts (cron-friendly). The window_start index
// keeps the prune cheap.

import { db } from '@gaia/db'
import { rateLimits } from '@gaia/db/schema'
import { AppError } from '@gaia/errors'
import { sql } from 'drizzle-orm'

/**
 * Bucket the current time into a fixed window. Same `windowSec` always
 * yields the same bucket for any wall-clock instant inside the window —
 * that's what makes the ON CONFLICT primary-key collide reliably.
 *
 * Exported for unit testing of the bucketing math; production callers
 * should use `checkRateLimit` instead.
 */
export function bucketWindow(now: Date, windowSec: number): Date {
  const ms = now.getTime()
  const windowMs = windowSec * 1000
  return new Date(Math.floor(ms / windowMs) * windowMs)
}

/**
 * Record one hit against `key` in the current window. Throws RATE_LIMITED
 * (HTTP 429) when the post-increment count exceeds `limit`. Returns the
 * post-increment count when allowed (useful for `X-RateLimit-Remaining`).
 *
 * Key naming convention: `<flow>:<scope-value>` — e.g.
 *   `public:1.2.3.4`             (publicTier limit by IP)
 *   `protected:user-uuid`        (protectedTier limit by user)
 *   `auth:1.2.3.4`               (authFlow IP throttle on /auth/*)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  now: Date = new Date(),
): Promise<number> {
  const windowStart = bucketWindow(now, windowSec)
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })

  const count = rows[0]?.count ?? 1
  if (count > limit) {
    throw new AppError('RATE_LIMITED', `${key}: ${count}/${limit} in ${windowSec}s window`)
  }
  return count
}

/**
 * Per-tier limits. Numbers from packages/security/CLAUDE.md §4. Tune per
 * deployment by overriding via env vars in a future revision; defaults
 * defend against the most common abuse on a fresh template deploy.
 */
export const limits = {
  /** Anonymous traffic — health checks, unauthenticated routes. */
  publicTier: { requests: 30, windowSec: 60 },
  /** Authenticated traffic — generic per-user. */
  protectedTier: { requests: 120, windowSec: 60 },
  /** /auth/* throttle — slows credential stuffing + signup spam. IP-based. */
  authFlow: { requests: 10, windowSec: 600 },
} as const

/**
 * Extract the client IP from a request. Trust order:
 *   1. CF-Connecting-IP (Cloudflare proxy)
 *   2. X-Forwarded-For first hop (Railway, Fly, generic reverse proxy)
 *   3. X-Real-IP (nginx)
 *   4. fallback ('unknown')
 *
 * Production deploys behind a proxy MUST configure the proxy to set one
 * of these. Without that, all traffic shares the 'unknown' bucket and
 * legitimate users get throttled with attackers.
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
