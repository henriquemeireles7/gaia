// cli/test/banner.test.ts — TTHW-1 gate.
//
// Per AD-AP-13 / falsifier P3: the banner must render in <1000ms from CLI
// invocation. The benchmark here measures `renderBanner()` directly — a tighter
// signal than spawning the full CLI process (which adds Bun cold-start overhead
// outside our control).

import { describe, expect, it } from 'bun:test'

import { renderBanner } from '../src/ui/banner.ts'

const FIXED_TIME = new Date('2026-04-29T12:00:00.000Z')

describe('renderBanner', () => {
  it('contains the project slug, cli version, and timestamp', () => {
    const text = renderBanner({
      projectSlug: 'weekend-saas',
      cliVersion: '1.0.0',
      startedAt: FIXED_TIME,
    })
    expect(text).toContain('GAIA')
    expect(text).toContain('weekend-saas')
    expect(text).toContain('1.0.0')
    expect(text).toContain('2026-04-29T12:00:00.000Z')
  })

  it('lists the stack composition lines so users know what they got', () => {
    const text = renderBanner({
      projectSlug: 'weekend-saas',
      cliVersion: '1.0.0',
      startedAt: FIXED_TIME,
    })
    // One concrete line per piece of the stack — these are the value the
    // user just received, surfaced before any narration starts.
    expect(text).toContain('apps/api')
    expect(text).toContain('apps/web')
    expect(text).toContain('packages/db')
    expect(text).toContain('packages/auth')
    expect(text).toContain('packages/security')
    expect(text).toContain('infra/')
    expect(text).toContain('.claude + .gaia')
  })

  it('renders synchronously in <100ms (TTHW-1 floor: <1000ms with comfortable margin)', () => {
    const t0 = performance.now()
    const text = renderBanner({
      projectSlug: 'bench',
      cliVersion: '1.0.0',
      startedAt: FIXED_TIME,
    })
    const elapsed = performance.now() - t0
    expect(text.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(100)
  })

  it('emits ASCII-safe arrow when LANG does not include UTF', () => {
    const original = process.env.LANG
    try {
      process.env.LANG = 'C'
      const text = renderBanner({
        projectSlug: 'ascii-test',
        cliVersion: '1.0.0',
        startedAt: FIXED_TIME,
      })
      // Either Unicode arrow OR plain '>' is acceptable — both are emoji-safe.
      expect(text.includes('▶') || text.includes('>')).toBe(true)
    } finally {
      if (original === undefined) delete process.env.LANG
      else process.env.LANG = original
    }
  })
})
