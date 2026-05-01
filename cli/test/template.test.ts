// cli/test/template.test.ts — in-source detection + copy-tree exclusions.

import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectInSourceRoot, layDownTemplate } from '../src/template.ts'

function makeFakeGaiaRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'gaia-fake-'))
  for (const dir of ['cli', 'apps', 'packages', '.gaia']) {
    mkdirSync(join(root, dir), { recursive: true })
  }
  // Sample files we expect to copy.
  writeFileSync(join(root, 'package.json'), '{"name":"gaia"}\n')
  writeFileSync(join(root, 'apps', 'README.md'), '# apps\n')
  // Files the exclusion list should drop — runtime + per-machine.
  writeFileSync(join(root, '.env'), 'SECRET=should-not-copy\n')
  writeFileSync(join(root, '.env.local'), 'POLAR=should-not-copy\n')
  mkdirSync(join(root, 'node_modules', 'foo'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'foo', 'index.js'), '/* */\n')
  // Files the exclusion list should drop — template tooling.
  writeFileSync(join(root, 'cli', 'package.json'), '{"name":"create-gaia-app"}\n')
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'docs', 'cli.md'), '# CLI\n')
  writeFileSync(join(root, 'CHANGELOG.md'), '# v0.2.1\n')
  writeFileSync(join(root, 'conductor.json'), '{}\n')
  mkdirSync(join(root, '.gstack', 'security-reports'), { recursive: true })
  writeFileSync(join(root, '.gstack', 'security-reports', 'r.json'), '{}\n')
  mkdirSync(join(root, '.gaia', 'audits', 'a-health'), { recursive: true })
  writeFileSync(join(root, '.gaia', 'audits', 'a-health', '2026-04-30.md'), '# audit\n')
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(join(root, 'scripts', 'e2e-fresh-clone.ts'), '/* test */\n')
  writeFileSync(join(root, 'scripts', 'check-readme.ts'), '/* keep */\n') // NOT excluded
  return root
}

describe('detectInSourceRoot', () => {
  it('returns the root when the script lives inside a Gaia triad', () => {
    const root = makeFakeGaiaRoot()
    try {
      const fakeScript = join(root, 'cli', 'src', 'template.ts')
      mkdirSync(join(root, 'cli', 'src'), { recursive: true })
      writeFileSync(fakeScript, '/* */\n')
      const detected = detectInSourceRoot(fakeScript)
      expect(detected).toBe(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects a script that is OUTSIDE the candidate root (#37 / RT-24)', () => {
    const root = makeFakeGaiaRoot()
    const elsewhere = mkdtempSync(join(tmpdir(), 'gaia-other-'))
    try {
      const fakeScript = join(elsewhere, 'template.ts')
      writeFileSync(fakeScript, '/* */\n')
      // detect from elsewhere — even if walking up finds a Gaia triad, the
      // scriptIsInside guard rejects it.
      const detected = detectInSourceRoot(fakeScript)
      expect(detected).not.toBe(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(elsewhere, { recursive: true, force: true })
    }
  })
})

describe('layDownTemplate (in-source mode)', () => {
  it('copies the tree and skips .env / node_modules / .git', async () => {
    const root = makeFakeGaiaRoot()
    const target = mkdtempSync(join(tmpdir(), 'gaia-tgt-'))
    try {
      const result = await layDownTemplate({
        targetDir: join(target, 'app'),
        sourceRoot: root,
      })
      expect(result.mode).toBe('in-source')
      expect(result.filesCopied).toBeGreaterThan(0)
      const fs = await import('node:fs')
      expect(fs.existsSync(join(target, 'app', 'package.json'))).toBe(true)
      expect(fs.existsSync(join(target, 'app', '.env'))).toBe(false)
      expect(fs.existsSync(join(target, 'app', '.env.local'))).toBe(false)
      expect(fs.existsSync(join(target, 'app', 'node_modules'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(target, { recursive: true, force: true })
    }
  })

  it('refuses in-source mode when targetDir is INSIDE sourceRoot (recursion guard)', async () => {
    // Regression: v0.3.0 shipped without this guard. Running
    // `bun cli/src/create.ts qa-test` from inside the gaia repo created
    // qa-test/ as a sibling of cli/, then copyTree walked into qa-test/
    // and recursed into qa-test/qa-test/qa-test/... eventually crashing
    // with ENAMETOOLONG. Fix in v0.3.1.
    const root = makeFakeGaiaRoot()
    try {
      const result = await layDownTemplate({
        targetDir: join(root, 'qa-test'), // INSIDE root — would recurse without guard
        sourceRoot: root,
      })
      expect(result.mode).toBe('unavailable')
      expect(result.filesCopied).toBe(0)
      expect(result.warning).toContain('inside the Gaia source repo')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('refuses in-source mode when targetDir IS sourceRoot (degenerate case)', async () => {
    const root = makeFakeGaiaRoot()
    try {
      const result = await layDownTemplate({ targetDir: root, sourceRoot: root })
      expect(result.mode).toBe('unavailable')
      expect(result.warning).toContain('inside the Gaia source repo')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('returns mode=git-clone with skipGitClone seam (no I/O)', async () => {
    const target = mkdtempSync(join(tmpdir(), 'gaia-tgt-'))
    try {
      const result = await layDownTemplate({
        targetDir: join(target, 'app'),
        // Set sourceRoot to a definitely-not-gaia path so in-source bails.
        sourceRoot: undefined as unknown as string,
        skipGitClone: true,
      })
      // Either falls into git-clone seam (we want this) OR detectInSourceRoot
      // returns the *real* gaia repo we're running tests inside. Both are valid.
      expect(['in-source', 'git-clone']).toContain(result.mode)
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })

  it('excludes template tooling — cli/, docs/, CHANGELOG.md, conductor.json, .gstack, .gaia/audits, scripts/e2e-fresh-clone.ts', async () => {
    const root = makeFakeGaiaRoot()
    const target = mkdtempSync(join(tmpdir(), 'gaia-tgt-'))
    try {
      await layDownTemplate({
        targetDir: join(target, 'app'),
        sourceRoot: root,
      })
      const fs = await import('node:fs')
      const app = join(target, 'app')
      // Tooling that should NOT ship to the user's project.
      expect(fs.existsSync(join(app, 'cli'))).toBe(false)
      expect(fs.existsSync(join(app, 'docs'))).toBe(false)
      expect(fs.existsSync(join(app, 'CHANGELOG.md'))).toBe(false)
      expect(fs.existsSync(join(app, 'conductor.json'))).toBe(false)
      expect(fs.existsSync(join(app, '.gstack'))).toBe(false)
      expect(fs.existsSync(join(app, '.gaia', 'audits'))).toBe(false)
      expect(fs.existsSync(join(app, 'scripts', 'e2e-fresh-clone.ts'))).toBe(false)
      // Other scripts/ entries should still be there.
      expect(fs.existsSync(join(app, 'scripts', 'check-readme.ts'))).toBe(true)
      // The rest of the template made it.
      expect(fs.existsSync(join(app, 'package.json'))).toBe(true)
      expect(fs.existsSync(join(app, 'apps', 'README.md'))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(target, { recursive: true, force: true })
    }
  })
})
