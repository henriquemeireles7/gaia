import { describe, expect, it } from 'bun:test'
import { bucketWindow, clientIp, limits } from './rate-limits'

// DB-bound `checkRateLimit` is exercised by integration tests against a
// real Postgres branch (see packages/db/CLAUDE.md §6 for the Neon-branch
// pattern). Bun's mock.module is process-global, so mocking @gaia/db
// here would pollute every other test file. Pure helpers are unit-tested
// below; the SQL primitive is mechanically simple (atomic ON CONFLICT
// upsert) — a mocked DB test would only re-assert the mock shape.

describe('bucketWindow', () => {
  it('floors to the start of a 60-second window', () => {
    const now = new Date('2026-04-30T10:30:42.123Z')
    expect(bucketWindow(now, 60).toISOString()).toBe('2026-04-30T10:30:00.000Z')
  })

  it('floors identically for two instants in the same 60s window', () => {
    const t1 = new Date('2026-04-30T10:30:00.000Z')
    const t2 = new Date('2026-04-30T10:30:59.999Z')
    expect(bucketWindow(t1, 60).toISOString()).toBe(bucketWindow(t2, 60).toISOString())
  })

  it('moves to the next bucket exactly at the window boundary', () => {
    const before = new Date('2026-04-30T10:30:59.999Z')
    const after = new Date('2026-04-30T10:31:00.000Z')
    expect(bucketWindow(before, 60).toISOString()).not.toBe(bucketWindow(after, 60).toISOString())
  })

  it('handles 10-minute windows (authFlow default)', () => {
    const now = new Date('2026-04-30T10:37:42.123Z')
    expect(bucketWindow(now, 600).toISOString()).toBe('2026-04-30T10:30:00.000Z')
  })

  it('returns a new Date instance each call (no aliasing)', () => {
    const now = new Date('2026-04-30T10:30:42.123Z')
    const a = bucketWindow(now, 60)
    const b = bucketWindow(now, 60)
    expect(a).not.toBe(b)
    expect(a.getTime()).toBe(b.getTime())
  })
})

describe('clientIp', () => {
  it('prefers cf-connecting-ip over all other proxies', () => {
    const h = new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-forwarded-for': '2.2.2.2, 3.3.3.3',
      'x-real-ip': '4.4.4.4',
    })
    expect(clientIp(h)).toBe('1.1.1.1')
  })

  it('falls back to first hop of x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3', 'x-real-ip': '4.4.4.4' })
    expect(clientIp(h)).toBe('2.2.2.2')
  })

  it('trims whitespace from x-forwarded-for entries', () => {
    const h = new Headers({ 'x-forwarded-for': '  2.2.2.2  ,  3.3.3.3' })
    expect(clientIp(h)).toBe('2.2.2.2')
  })

  it('falls back to x-real-ip when x-forwarded-for absent', () => {
    const h = new Headers({ 'x-real-ip': '4.4.4.4' })
    expect(clientIp(h)).toBe('4.4.4.4')
  })

  it('returns "unknown" when no proxy header is present', () => {
    expect(clientIp(new Headers())).toBe('unknown')
  })
})

describe('limits constants', () => {
  it('publicTier is 30 requests per 60s window', () => {
    expect(limits.publicTier).toEqual({ requests: 30, windowSec: 60 })
  })

  it('protectedTier is 120 requests per 60s window', () => {
    expect(limits.protectedTier).toEqual({ requests: 120, windowSec: 60 })
  })

  it('authFlow is 10 requests per 600s window — credential-stuffing defense', () => {
    expect(limits.authFlow).toEqual({ requests: 10, windowSec: 600 })
  })
})
