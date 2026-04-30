// cli/test/deploy.runner.test.ts — production DeployRunner with injected runCommand.

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createProductionRunner } from '../src/deploy/runner.ts'

type Cmd = { cmd: string; args: readonly string[]; cwd: string }

function makeRunCommand(responses: Array<{ exitCode: number; stdout?: string; stderr?: string }>): {
  run: (
    cmd: string,
    args: readonly string[],
    cwd: string,
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>
  calls: Cmd[]
} {
  const calls: Cmd[] = []
  let i = 0
  const run = async (cmd: string, args: readonly string[], cwd: string) => {
    calls.push({ cmd, args, cwd })
    const r = responses[i] ?? { exitCode: 0, stdout: '', stderr: '' }
    i++
    return { exitCode: r.exitCode, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
  }
  return { run, calls }
}

describe('createProductionRunner.preflight', () => {
  it('passes when bun run check exits 0', async () => {
    const { run } = makeRunCommand([{ exitCode: 0 }])
    const runner = createProductionRunner({ projectDir: '/tmp/x', runCommand: run })
    const result = await runner.preflight()
    expect(result.ok).toBe(true)
  })

  it('returns log concatenated from stderr+stdout when check fails (RT-9)', async () => {
    const { run } = makeRunCommand([
      { exitCode: 2, stdout: 'tsgo: type error', stderr: 'oxlint: failed' },
    ])
    const runner = createProductionRunner({ projectDir: '/tmp/x', runCommand: run })
    const result = await runner.preflight()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.log).toContain('tsgo')
      expect(result.log).toContain('oxlint')
    }
  })
})

describe('createProductionRunner.deploy', () => {
  it('refuses when railway CLI is not on PATH', async () => {
    const { run } = makeRunCommand([{ exitCode: 1 }])
    const runner = createProductionRunner({ projectDir: '/tmp/x', runCommand: run })
    const result = await runner.deploy()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.log).toMatch(/railway CLI not found/)
  })

  it('refuses when railway.toml is missing', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    try {
      const { run } = makeRunCommand([{ exitCode: 0, stdout: '/usr/local/bin/railway' }])
      const runner = createProductionRunner({ projectDir: tmp, runCommand: run })
      const result = await runner.deploy()
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.log).toMatch(/No railway\.toml/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns the URL from `railway status --json` after a successful up', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    writeFileSync(join(tmp, 'railway.toml'), '')
    try {
      const { run, calls } = makeRunCommand([
        { exitCode: 0, stdout: '/usr/local/bin/railway' }, // which
        { exitCode: 0 }, // railway up
        {
          exitCode: 0,
          stdout: JSON.stringify({ publicDomain: 'app-fixture.up.railway.app' }),
        }, // railway status
      ])
      const runner = createProductionRunner({ projectDir: tmp, runCommand: run })
      const result = await runner.deploy()
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.url).toBe('https://app-fixture.up.railway.app')
      expect(calls).toHaveLength(3)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns ok=false when `railway up` fails (concatenates stdout+stderr per RT-9)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-deploy-'))
    writeFileSync(join(tmp, 'railway.toml'), '')
    try {
      const { run } = makeRunCommand([
        { exitCode: 0, stdout: '/usr/local/bin/railway' },
        { exitCode: 1, stdout: 'TS2345: type mismatch', stderr: 'build failed' },
      ])
      const runner = createProductionRunner({ projectDir: tmp, runCommand: run })
      const result = await runner.deploy()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.log).toContain('TS2345')
        expect(result.log).toContain('build failed')
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('createProductionRunner.invokeDFail', () => {
  it('prints the classified hint and returns ok=true so retry attempts again', async () => {
    const captured: string[] = []
    const runner = createProductionRunner({
      projectDir: '/tmp/x',
      runCommand: makeRunCommand([]).run,
      print: (msg) => captured.push(msg),
    })
    const result = await runner.invokeDFail({
      class: 'typecheck',
      summary: 'TS error',
      hint: 'fix and recommit',
      ttfd_blocking: true,
      errorCode: 'E3001_DEPLOY_TYPECHECK',
    })
    expect(result.ok).toBe(true)
    expect(captured.some((line) => line.includes('d-fail/typecheck'))).toBe(true)
    expect(captured.some((line) => line.includes('E3001_DEPLOY_TYPECHECK'))).toBe(true)
  })
})
