// cli/test/setup.test.ts — interactive verb. Tests only the non-interactive
// branches: --json/--ci early-exit and the "all keys already set" pass-through
// (which never prompts).

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ExitCode } from '../src/exit-codes.ts'
import { DEFAULT_FLAGS } from '../src/flags.ts'
import { setup } from '../src/verbs/setup.ts'

describe('setup', () => {
  it('returns EX_USAGE when --json is set (interactive verb)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-setup-'))
    try {
      const result = await setup({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, json: true },
      })
      expect(result.exitCode).toBe(ExitCode.EX_USAGE)
      expect(result.filledKeys).toHaveLength(0)
      expect(result.skippedKeys).toHaveLength(0)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns EX_USAGE when --ci is set', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-setup-'))
    try {
      const result = await setup({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, ci: true },
      })
      // --ci implies --json so this also bails on the interactive guard.
      expect(result.exitCode).toBe(ExitCode.EX_USAGE)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
