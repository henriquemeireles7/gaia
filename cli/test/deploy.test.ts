import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ClassifiedFailure } from '../src/deploy/classifier.ts'
import { DEFAULT_FLAGS } from '../src/flags.ts'
import { deploy, type DeployRunner } from '../src/verbs/deploy.ts'

function fakeRunner(overrides: Partial<DeployRunner> = {}): DeployRunner {
  return {
    preflight: () => Promise.resolve({ ok: true }),
    deploy: () => Promise.resolve({ ok: true, url: 'https://test.up.railway.app' }),
    invokeDFail: () => Promise.resolve({ ok: true }),
    ...overrides,
  }
}

describe('deploy', () => {
  it('happy path returns OK + URL', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      const result = await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        runner: fakeRunner(),
        sleep: () => Promise.resolve(),
      })
      expect(result.exitCode).toBe(0)
      expect(result.url).toBe('https://test.up.railway.app')
      expect(result.attempts).toBe(1)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('preflight failure short-circuits (no deploy attempt)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      let deployCalled = false
      const result = await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        runner: fakeRunner({
          preflight: () => Promise.resolve({ ok: false, log: 'error TS2304: missing import' }),
          deploy: () => {
            deployCalled = true
            return Promise.resolve({ ok: true, url: 'never' })
          },
        }),
        sleep: () => Promise.resolve(),
      })
      expect(result.exitCode).toBe(65)
      expect(result.failureClass).toBe('typecheck')
      expect(deployCalled).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('typecheck failure → invokes d-fail → succeeds on attempt 2', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      let deployCount = 0
      const dfailCalls: ClassifiedFailure[] = []
      const result = await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        sleep: () => Promise.resolve(),
        runner: fakeRunner({
          deploy: () => {
            deployCount++
            if (deployCount === 1) {
              return Promise.resolve({ ok: false, log: 'error TS2304: cannot find name' })
            }
            return Promise.resolve({ ok: true, url: 'https://healed.up.railway.app' })
          },
          invokeDFail: (f) => {
            dfailCalls.push(f)
            return Promise.resolve({ ok: true })
          },
        }),
      })
      expect(result.exitCode).toBe(0)
      expect(result.attempts).toBe(2)
      expect(dfailCalls).toHaveLength(1)
      expect(dfailCalls[0]?.class).toBe('typecheck')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('exhausts 3 attempts → returns EX_TEMPFAIL (75)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      const result = await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        sleep: () => Promise.resolve(),
        runner: fakeRunner({
          deploy: () => Promise.resolve({ ok: false, log: 'error TS2304: persistent failure' }),
        }),
      })
      expect(result.exitCode).toBe(75)
      expect(result.attempts).toBe(3)
      expect(result.failureClass).toBe('typecheck')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('captureFailure strips ANSI escape codes from the log artifact (#25)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      // Real Railway/oxlint output includes \x1b[31m (red) etc. Verify the
      // captured artifact has them stripped so it pastes cleanly into GitHub.
      const ESC = String.fromCharCode(27)
      const ansiLog = `${ESC}[31merror TS2304:${ESC}[0m cannot find name`
      await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        sleep: () => Promise.resolve(),
        runner: fakeRunner({
          preflight: () => Promise.resolve({ ok: false, log: ansiLog }),
        }),
      })
      const fs = await import('node:fs')
      const captured = fs.readFileSync(join(tmp, '.gaia/last-deploy-failure.log'), 'utf-8')
      // No raw ESC byte should survive — the captureFailure helper strips ANSI
      // CSI sequences so the artifact pastes cleanly into a GitHub issue.
      expect(captured).not.toContain(ESC)
      expect(captured).toMatch(/error TS2304:/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('non-blocking soft-fail (F-10) returns EX_UNAVAILABLE (no fake URL)', async () => {
    // RT-3 fix: soft-fail no longer fabricates "(soft-fail; deploy continued)" as
    // a fake URL. The deploy verb returns EX_UNAVAILABLE so the user sees the
    // warning + captured artifact and can decide what to do next.
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      const result = await deploy({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true },
        sleep: () => Promise.resolve(),
        runner: fakeRunner({
          deploy: () =>
            Promise.resolve({
              ok: false,
              log: 'resend domain status: pending DNS verification',
            }),
        }),
      })
      expect(result.exitCode).toBe(69) // EX_UNAVAILABLE
      expect(result.url).toBeUndefined()
      expect(result.failureClass).toBe('resend-domain-pending')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
