import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { defaultStatePath, load, save, update } from '../src/state.ts'

import type { StateV1 } from '../src/state.schema.ts'

function fixture(): StateV1 {
  return {
    version: 1,
    project_slug: 'weekend-saas',
    cli_version: '0.0.0',
    started_at: '2026-04-29T12:00:00.000Z',
    bun_version: '1.3.11',
    platform: 'darwin',
    required_env: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY', 'DATABASE_URL', 'RAILWAY_TOKEN'],
    last_step: 'create.complete',
    next_step: 'verify-keys',
  }
}

describe('defaultStatePath', () => {
  it('returns <project>/.gaia/state.json', () => {
    expect(defaultStatePath('/tmp/myapp')).toBe('/tmp/myapp/.gaia/state.json')
  })
})

describe('save / load', () => {
  it('round-trips a valid state', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, '.gaia/state.json')
    try {
      await save(path, fixture())
      const loaded = load(path)
      expect(loaded.ok).toBe(true)
      if (loaded.ok) expect(loaded.state.project_slug).toBe('weekend-saas')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('refuses to save invalid state (schema enforces)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, '.gaia/state.json')
    try {
      const bad = { ...fixture(), project_slug: 'INVALID UPPERCASE' } as unknown as StateV1
      await expect(save(path, bad)).rejects.toThrow(/refusing to save invalid state/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('atomic write — tmp file does not survive after rename', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, '.gaia/state.json')
    try {
      await save(path, fixture())
      // No leftover .tmp.* files in the directory.
      const dir = join(tmp, '.gaia')
      const entries = (await import('node:fs/promises')).readdir(dir)
      const files = await entries
      expect(files.some((f) => f.includes('.tmp.'))).toBe(false)
      // No leftover .lock either.
      expect(files.some((f) => f.endsWith('.lock'))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('load reports missing file with a clear error', () => {
    const result = load('/does/not/exist/state.json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('not found')
  })

  it('load reports schema mismatch', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, 'bad.json')
    try {
      writeFileSync(path, JSON.stringify({ version: 999, garbage: 'yes' }))
      const result = load(path)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('schema mismatch')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('update applies a pure functional transform', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, '.gaia/state.json')
    try {
      await save(path, fixture())
      const next = await update(path, (s) => ({ ...s, last_step: 'verify-keys.complete' }))
      expect(next.last_step).toBe('verify-keys.complete')
      const reloaded = load(path)
      expect(reloaded.ok).toBe(true)
      if (reloaded.ok) expect(reloaded.state.last_step).toBe('verify-keys.complete')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('saved file reads back as exactly-2-space-indented JSON ending with newline', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-state-'))
    const path = join(tmp, '.gaia/state.json')
    try {
      await save(path, fixture())
      const raw = readFileSync(path, 'utf-8')
      expect(raw.endsWith('\n')).toBe(true)
      expect(raw).toContain('  "version": 1')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
