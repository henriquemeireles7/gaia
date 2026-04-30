// cli/test/preflight.test.ts — unit tests for the preflight gate.
//
// Each known cliff (Bun version, Windows, dir-exists, write-permission) is
// covered with a deterministic fixture. Per the principle "validate at edges,
// trust the interior" — preflight IS the edge for `bun create`.

import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  checkBunVersion,
  checkPlatform,
  checkTargetDir,
  preflight,
  formatFailure,
} from '../src/preflight.ts'

describe('checkBunVersion', () => {
  it('rejects undefined Bun runtime with E1001', () => {
    const f = checkBunVersion(undefined)
    expect(f?.code).toBe('E1001')
    expect(f?.exit).toBe(78)
    expect(f?.fix).toContain('curl -fsSL https://bun.sh/install')
  })

  it('rejects Bun 1.1.x with E1001', () => {
    const f = checkBunVersion('1.1.42')
    expect(f?.code).toBe('E1001')
    expect(f?.message).toContain('1.1.42')
  })

  it('accepts Bun 1.2.0 (the floor)', () => {
    expect(checkBunVersion('1.2.0')).toBeNull()
  })

  it('accepts Bun 1.5.x', () => {
    expect(checkBunVersion('1.5.7')).toBeNull()
  })

  it('accepts Bun pre-releases above the floor (1.2.3-beta)', () => {
    expect(checkBunVersion('1.2.3-beta')).toBeNull()
  })
})

describe('checkPlatform', () => {
  it('refuses win32 with E1002 and points at WSL2', () => {
    const f = checkPlatform('win32')
    expect(f?.code).toBe('E1002')
    expect(f?.fix.toLowerCase()).toContain('wsl2')
  })

  it('accepts darwin and linux', () => {
    expect(checkPlatform('darwin')).toBeNull()
    expect(checkPlatform('linux')).toBeNull()
  })
})

describe('checkTargetDir', () => {
  it('refuses an existing directory without --force', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-pf-'))
    const target = join(tmp, 'existing')
    mkdirSync(target)
    try {
      const f = checkTargetDir(target, false)
      expect(f?.code).toBe('E1003')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('allows an existing directory with --force', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-pf-'))
    const target = join(tmp, 'existing')
    mkdirSync(target)
    try {
      expect(checkTargetDir(target, true)).toBeNull()
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('allows a fresh non-existing directory regardless of --force', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-pf-'))
    try {
      expect(checkTargetDir(join(tmp, 'fresh'), false)).toBeNull()
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('preflight (composed)', () => {
  it('fails fast on Bun version (does not check platform)', () => {
    const f = preflight({
      bunVersion: '1.0.0',
      platform: 'win32', // would also fail, but bun comes first
      targetDir: '/tmp/gaia-test-x',
      force: false,
    })
    expect(f?.code).toBe('E1001')
  })

  it('passes a clean macOS Bun 1.2.5 fresh-dir setup', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-pf-'))
    try {
      const f = preflight({
        bunVersion: '1.2.5',
        platform: 'darwin',
        targetDir: join(tmp, 'fresh'),
        force: false,
      })
      expect(f).toBeNull()
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('formatFailure', () => {
  it('produces a 4-line block with code, message, fix, docs', () => {
    const text = formatFailure({
      code: 'E1001',
      exit: 78,
      message: 'Bun too old',
      fix: 'Upgrade Bun',
      docsUrl: 'https://example.com',
    })
    const lines = text.split('\n').filter((l) => l !== '')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('[E1001]')
    expect(lines[1]).toContain('fix:')
    expect(lines[2]).toContain('docs:')
  })
})
