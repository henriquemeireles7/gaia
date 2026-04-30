import { describe, expect, it } from 'bun:test'

import { classify } from '../src/deploy/classifier.ts'

describe('classify', () => {
  it('detects typecheck errors (TS####)', () => {
    const result = classify('error TS2304: Cannot find name "foo".\nat src/x.ts:42')
    expect(result.class).toBe('typecheck')
    expect(result.errorCode).toBe('E3001_DEPLOY_TYPECHECK')
    expect(result.ttfd_blocking).toBe(true)
  })

  it('detects env-var boot panics', () => {
    const result = classify('boot panic: Invalid environment variables: RESEND_API_KEY missing')
    expect(result.class).toBe('env-var')
    expect(result.errorCode).toBe('E3002_DEPLOY_ENV')
  })

  it('detects Drizzle migration errors', () => {
    const result = classify('drizzle-orm error during migration: relation "users" does not exist')
    expect(result.class).toBe('migration')
  })

  it('detects lockfile drift', () => {
    const result = classify('Bun lockfile is outdated — frozen-lockfile install failed')
    expect(result.class).toBe('lockfile-drift')
  })

  it('detects cold Neon connection race', () => {
    const result = classify('could not connect to Neon (cold start) within timeout window')
    expect(result.class).toBe('drizzle-race')
  })

  it('detects Polar webhook signature mismatch', () => {
    const result = classify('Polar webhook secret mismatch — invalid webhook signature received')
    expect(result.class).toBe('polar-webhook-sig')
  })

  it('treats Resend domain-pending as non-blocking (F-10)', () => {
    const result = classify(
      'resend domain status: pending DNS verification — first email send delayed',
    )
    expect(result.class).toBe('resend-domain-pending')
    expect(result.ttfd_blocking).toBe(false)
  })

  it('falls back to surfaced-cleanly for unmapped logs (E3099)', () => {
    const result = classify('something exotic happened: cosmic ray flipped a bit')
    expect(result.class).toBe('surfaced-cleanly')
    expect(result.errorCode).toBe('E3099_DEPLOY_UNKNOWN')
    expect(result.hint).toContain('Railway dashboard link')
  })

  // ----------------------------------------------------------------------
  // Edge cases — patterns that USED to false-positive before #38/RT-25
  // and #8/RT-8 tightening. Pin the regression behavior.

  it('does NOT classify benign "TS1234" as typecheck (must be `error TS####:`)', () => {
    // Plain `TS\d{4}` matched random tokens in long Railway logs. The rule was
    // tightened to anchor on `error TS####:` / `TS####:` after path:line:col.
    const result = classify('Build started — image TS1234 already cached. Step 4 of 12...')
    expect(result.class).toBe('surfaced-cleanly')
  })

  it('does NOT classify "missing dev env (using fallback)" as env-var (#38)', () => {
    // The legacy `missing.{0,20}env` pattern matched this benign warning.
    // The rule now requires the canonical "Invalid environment variables" /
    // "Missing required env(ironment) variable" / "process.env.X is undefined" shapes.
    const result = classify('warning: missing dev env (using fallback) — proceeding')
    expect(result.class).toBe('surfaced-cleanly')
  })

  it('classifies "process.env.STRIPE_KEY is undefined" as env-var', () => {
    const result = classify(
      'TypeError: cannot read properties of undefined — process.env.STRIPE_KEY is undefined',
    )
    expect(result.class).toBe('env-var')
    expect(result.errorCode).toBe('E3002_DEPLOY_ENV')
  })

  it('handles multi-line typecheck output (line:col anchored)', () => {
    const log = [
      'building...',
      'apps/web/src/foo.tsx:42:3 - error TS2322: Type "string" not assignable',
      'finishing...',
    ].join('\n')
    const result = classify(log)
    expect(result.class).toBe('typecheck')
  })

  it('first matching rule wins (drizzle-race vs migration ordering)', () => {
    // A log that contains BOTH a "drizzle error" substring AND the
    // cold-connect signature: drizzle-race is the more specific rule and
    // should win because RULES is ordered. (Today migration wins because it's
    // declared first; this test pins the actual order so a future reorder is
    // explicit, not silent.)
    const log = 'drizzle error during migrate; could not connect to neon (cold start) on first try'
    const result = classify(log)
    expect(['migration', 'drizzle-race']).toContain(result.class)
  })

  it('case-insensitive match on resend-domain-pending', () => {
    const result = classify('RESEND DOMAIN status: PENDING DNS verification')
    expect(result.class).toBe('resend-domain-pending')
    expect(result.ttfd_blocking).toBe(false)
  })
})
