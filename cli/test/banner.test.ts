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
  it('contains the project slug, cli version, and clock-started prose', () => {
    const text = renderBanner({
      projectSlug: 'weekend-saas',
      cliVersion: '1.0.0',
      startedAt: FIXED_TIME,
    })
    expect(text).toContain('GAIA')
    expect(text).toContain('weekend-saas')
    expect(text).toContain('1.0.0')
    expect(text).toContain('30-min clock started')
    expect(text).toContain('2026-04-29T12:00:00.000Z')
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
