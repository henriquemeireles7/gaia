// cli/test/create.test.ts — invariants of the scaffolder.
//
// Per AD-AP-17: .gitignore is the FIRST file written. Per AD-AP-18:
// state.json holds env-var NAMES only, never values. Both are unit-tested
// here against a real tmp directory.

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { scaffold } from '../src/create.ts'

// Real secret prefixes are lowercase + long alphanumeric tail. Env-var NAMES
// (POLAR_ACCESS_TOKEN, RAILWAY_TOKEN, RESEND_API_KEY, DATABASE_URL) are
// uppercase, so case-sensitive shape patterns naturally avoid false positives.
const SECRET_PATTERNS = [
  /\bsk-(?:ant|live|test|proj)-[A-Za-z0-9_-]{20,}/, // Anthropic / Stripe / OpenAI
  /\bpolar_(?:oat|sat|at)_[A-Za-z0-9]{16,}/, // Polar OAT/SAT/AT tokens
  /\bre_[A-Za-z0-9]{16,}/, // Resend API key shape
  /\brailway_[A-Za-z0-9]{8,}/, // Railway token shape
  /\bwhsec_[A-Za-z0-9]{16,}/, // Stripe / generic webhook secrets
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT (3-part)
]

describe('scaffold', () => {
  it('writes .gitignore BEFORE state.json (AD-AP-17 invariant)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-scaffold-'))
    const target = join(tmp, 'app')
    try {
      const result = scaffold({
        targetDir: target,
        projectSlug: 'app',
        cliVersion: '0.0.0',
        startedAt: new Date(),
        dryRun: false,
      })
      const gitignore = result.files.find((f) => f.path === '.gitignore')
      const stateJson = result.files.find((f) => f.path === '.gaia/state.json')
      expect(gitignore?.order).toBe(1)
      expect(stateJson?.order).toBe(3)
      expect((gitignore?.order ?? 99) < (stateJson?.order ?? 0)).toBe(true)

      // Filesystem confirms the order via mtime — .gitignore is older or equal to state.json.
      const giStat = statSync(join(target, '.gitignore'))
      const stStat = statSync(join(target, '.gaia/state.json'))
      expect(giStat.mtimeMs).toBeLessThanOrEqual(stStat.mtimeMs)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('.gitignore lists .env.local + state.json so a botched run cannot leak secrets', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-scaffold-'))
    try {
      scaffold({
        targetDir: join(tmp, 'g'),
        projectSlug: 'g',
        cliVersion: '0.0.0',
        startedAt: new Date(),
        dryRun: false,
      })
      const gi = readFileSync(join(tmp, 'g', '.gitignore'), 'utf-8')
      expect(gi).toContain('.env.local')
      expect(gi).toContain('.gaia/state.json')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('state.json holds env-var NAMES only — no secret-shaped values (AD-AP-18)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-scaffold-'))
    try {
      scaffold({
        targetDir: join(tmp, 'g'),
        projectSlug: 'g',
        cliVersion: '0.0.0',
        startedAt: new Date(),
        dryRun: false,
      })
      const raw = readFileSync(join(tmp, 'g', '.gaia/state.json'), 'utf-8')
      const state = JSON.parse(raw) as { required_env: string[] }
      // Required env names exist as bare strings.
      expect(state.required_env).toContain('POLAR_ACCESS_TOKEN')
      expect(state.required_env).toContain('RESEND_API_KEY')
      // No secret-shaped values anywhere in the file.
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(raw)).toBe(false)
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('respects --dry-run (no files written)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-scaffold-'))
    const target = join(tmp, 'dry')
    try {
      const result = scaffold({
        targetDir: target,
        projectSlug: 'dry',
        cliVersion: '0.0.0',
        startedAt: new Date(),
        dryRun: true,
      })
      expect(result.files).toHaveLength(3)
      // Target dir was not created in dry-run.
      let exists = false
      try {
        statSync(target)
        exists = true
      } catch {
        exists = false
      }
      expect(exists).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('next-step routes to setup → deploy → smoke (post-Lee/Theo polish)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-scaffold-'))
    try {
      const result = scaffold({
        targetDir: join(tmp, 'app'),
        projectSlug: 'app',
        cliVersion: '0.0.0',
        startedAt: new Date(),
        dryRun: true,
      })
      expect(result.nextStep).toContain('cd app')
      expect(result.nextStep).toContain('bun gaia setup')
      expect(result.nextStep).toContain('bun gaia deploy')
      expect(result.nextStep).toContain('bun gaia smoke')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
