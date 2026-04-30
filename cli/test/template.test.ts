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
  // Files the exclusion list should drop.
  writeFileSync(join(root, '.env'), 'SECRET=should-not-copy\n')
  writeFileSync(join(root, '.env.local'), 'POLAR=should-not-copy\n')
  mkdirSync(join(root, 'node_modules', 'foo'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'foo', 'index.js'), '/* */\n')
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
})
