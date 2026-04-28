import type { Context, Next } from 'hono'
import { throwError } from './errors'
import type { AppEnv } from './types'

const MAX_STORE_SIZE = 10_000

type TokenBucket = {
  tokens: number
  lastRefill: number
}

type RateLimiterConfig = {
  maxTokens: number
  refillRate: number // tokens per millisecond
  windowMs: number
}

type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number; remaining: 0 }

export type RateLimiter = {
  check: (key: string) => RateLimitResult
  reset: (key?: string) => void
  readonly size: number
}

/**
 * Create a rate limiter using the token bucket algorithm.
 * Factory pattern allows isolated instances for testing.
 *
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const store = new Map<string, TokenBucket>()
  const config: RateLimiterConfig = {
    maxTokens: maxRequests,
    refillRate: maxRequests / windowMs,
    windowMs,
  }

  function evictExpired(now: number) {
    if (store.size <= MAX_STORE_SIZE) return
    for (const [key, bucket] of store) {
      const elapsed = now - bucket.lastRefill
      const refilled = bucket.tokens + elapsed * config.refillRate
      if (refilled >= config.maxTokens) {
        store.delete(key)
      }
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now()
    evictExpired(now)

    const bucket = store.get(key)

    if (!bucket) {
      store.set(key, { tokens: config.maxTokens - 1, lastRefill: now })
      return { allowed: true, remaining: config.maxTokens - 1 }
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill
    const refilled = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate)
    bucket.lastRefill = now

    if (refilled < 1) {
      const msUntilToken = (1 - refilled) / config.refillRate
      return { allowed: false, retryAfterMs: Math.ceil(msUntilToken), remaining: 0 }
    }

    bucket.tokens = refilled - 1
    return { allowed: true, remaining: Math.floor(bucket.tokens) }
  }

  function reset(key?: string) {
    if (key) {
      store.delete(key)
    } else {
      store.clear()
    }
  }

  return {
    check,
    reset,
    get size() {
      return store.size
    },
  }
}

// ─── Legacy API (backward-compatible) ───

const defaultLimiters = new Map<string, RateLimiter>()

function getOrCreateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const cacheKey = `${maxRequests}:${windowMs}`
  let limiter = defaultLimiters.get(cacheKey)
  if (!limiter) {
    limiter = createRateLimiter(maxRequests, windowMs)
    defaultLimiters.set(cacheKey, limiter)
  }
  return limiter
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const limiter = getOrCreateLimiter(maxRequests, windowMs)
  const result = limiter.check(key)
  if (result.allowed) {
    return { allowed: true as const }
  }
  return { allowed: false as const, retryAfterMs: result.retryAfterMs }
}

// ─── Hono Middleware ───

type RateLimitMiddlewareConfig = {
  /** Max requests allowed in the window */
  max: number
  /** Time window in milliseconds */
  windowMs: number
  /** Extract the rate limit key from the request. Defaults to IP address. */
  keyFn?: (c: Context<AppEnv>) => string
}

/**
 * Hono middleware for rate limiting.
 *
 * @example
 * app.use('/api/auth/*', rateLimitMiddleware({ max: 5, windowMs: 60_000 }))
 */
export function rateLimitMiddleware(config: RateLimitMiddlewareConfig) {
  const limiter = createRateLimiter(config.max, config.windowMs)

  return async (c: Context<AppEnv>, next: Next) => {
    const key =
      config.keyFn?.(c) ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'

    const result = limiter.check(key)

    c.header('X-RateLimit-Limit', String(config.max))
    c.header('X-RateLimit-Remaining', String(result.remaining))

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)))
      return throwError(c, 'RATE_LIMITED')
    }

    return next()
  }
}
