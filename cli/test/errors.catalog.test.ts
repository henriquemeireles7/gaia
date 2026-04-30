import { describe, expect, it } from 'bun:test'

import { CATALOG, findEntry, listCodes } from '../src/errors/catalog.ts'
import { explain } from '../src/verbs/explain.ts'
import { DEFAULT_FLAGS } from '../src/flags.ts'

describe('CATALOG completeness (AD-AP-16: min 12 entries with 4 fields each)', () => {
  it('has at least 12 entries', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(12)
  })

  it('every entry has the four required fields', () => {
    for (const entry of CATALOG) {
      expect(entry.code.length).toBeGreaterThan(0)
      expect(entry.cause.length).toBeGreaterThan(0)
      expect(entry.fix.length).toBeGreaterThan(0)
      expect(entry.docsUrl.length).toBeGreaterThan(0)
      expect(entry.nextCommand.length).toBeGreaterThan(0)
    }
  })

  it('every code matches the expected shape (E\\d{4} or E\\d{4}_NAME)', () => {
    for (const entry of CATALOG) {
      expect(entry.code).toMatch(/^E\d{4}(_[A-Z][A-Z0-9_]*)?$/)
    }
  })

  it('codes are unique (no duplicates)', () => {
    const seen = new Set<string>()
    for (const entry of CATALOG) {
      expect(seen.has(entry.code)).toBe(false)
      seen.add(entry.code)
    }
  })

  it('covers each phase namespace (E1xxx preflight, E2xxx verify, E3xxx deploy, E4xxx smoke)', () => {
    const codes = listCodes().join(' ')
    expect(codes).toContain('E1001')
    expect(codes).toContain('E2001')
    expect(codes).toContain('E3001')
    expect(codes).toContain('E4001')
  })
})

describe('findEntry', () => {
  it('finds by exact code', () => {
    const entry = findEntry('E1001')
    expect(entry?.code).toBe('E1001')
  })

  it('finds by prefix when only the number is given', () => {
    const entry = findEntry('E2001')
    expect(entry?.code).toBe('E2001_POLAR_EMPTY')
  })

  it('returns undefined for unknown code', () => {
    expect(findEntry('E9999')).toBeUndefined()
  })
})

describe('explain (verb)', () => {
  it('returns OK + entry for a known code', () => {
    const result = explain({ code: 'E1001', flags: { ...DEFAULT_FLAGS, quiet: true, json: true } })
    expect(result.exitCode).toBe(0)
    expect(result.entry?.code).toBe('E1001')
  })

  it('returns EX_DATAERR (65) for unknown code', () => {
    const result = explain({ code: 'E9999', flags: { ...DEFAULT_FLAGS, quiet: true, json: true } })
    expect(result.exitCode).toBe(65)
  })

  it('returns OK with full catalog when no code given', () => {
    const result = explain({
      code: undefined,
      flags: { ...DEFAULT_FLAGS, quiet: true, json: true },
    })
    expect(result.exitCode).toBe(0)
  })
})
