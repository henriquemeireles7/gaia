import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { primitives, semantic, srgbFallback } from './tokens'

function flattenStringValues(obj: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') out.push(v)
    else if (v && typeof v === 'object')
      out.push(...flattenStringValues(v as Record<string, unknown>))
  }
  return out
}

describe('tokens — reference integrity', () => {
  test('every semantic color value is a known primitive value (or known constant)', () => {
    const allPrimitiveValues = new Set<string>()
    for (const family of Object.values(primitives)) {
      for (const value of Object.values(family)) {
        allPrimitiveValues.add(value)
      }
    }
    // bg.surface uses pure white — explicitly allowed by design.md.
    allPrimitiveValues.add('#ffffff')

    for (const value of flattenStringValues(semantic.color)) {
      expect(
        allPrimitiveValues.has(value),
        `semantic color value "${value}" is not in primitives`,
      ).toBe(true)
    }
  })
})

describe('tokens — sRGB fallback coverage', () => {
  test('every color primitive shade has a corresponding sRGB fallback', () => {
    for (const [family, shades] of Object.entries(primitives)) {
      for (const shade of Object.keys(shades)) {
        const key = `${family}-${shade}` as keyof typeof srgbFallback
        expect(srgbFallback[key], `missing sRGB fallback for ${family}-${shade}`).toBeDefined()
      }
    }
  })

  test('sRGB fallbacks are 6-digit hex codes', () => {
    for (const hex of Object.values(srgbFallback)) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  test('sRGB fallbacks have no orphans (every entry maps to a real primitive)', () => {
    const validKeys = new Set<string>()
    for (const [family, shades] of Object.entries(primitives)) {
      for (const shade of Object.keys(shades)) {
        validKeys.add(`${family}-${shade}`)
      }
    }
    for (const key of Object.keys(srgbFallback)) {
      expect(validKeys.has(key), `srgbFallback["${key}"] has no matching primitive`).toBe(true)
    }
  })
})

describe('tokens — generated CSS in sync with source', () => {
  // The actual byte-level check lives in scripts/check-tokens-sync.ts
  // (run as part of `bun run check`). These tests cover the structural
  // contract: shapes the generator must always emit.
  const css = readFileSync(join(import.meta.dir, 'styles.css'), 'utf-8')

  test('emits flat primitive variables matching design.md', () => {
    expect(css).toMatch(/--amber-50:/)
    expect(css).toMatch(/--ink-900:/)
    expect(css).toMatch(/--sage-500:/)
    expect(css).toMatch(/--terracotta-500:/)
    expect(css).toMatch(/--gold-500:/)
    expect(css).toMatch(/--slate-400:/)
  })

  test('emits flat semantic variables matching design.md', () => {
    for (const v of [
      '--bg-primary',
      '--bg-secondary',
      '--bg-tertiary',
      '--bg-surface',
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--accent',
      '--accent-hover',
      '--success',
      '--error',
      '--warning',
      '--info',
      '--border-subtle',
      '--border-default',
      '--border-emphasis',
    ]) {
      expect(css).toContain(`${v}:`)
    }
  })

  test('emits sRGB fallback @supports block', () => {
    expect(css).toContain('@supports not (color: oklch(0 0 0))')
  })

  test('emits prefers-reduced-motion guard', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
