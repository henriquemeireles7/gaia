// cli/test/cli.test.ts — dispatcher entry point.
//
// Drives `main()` programmatically by stubbing process.argv and capturing
// stdout/stderr. Verifies: --version, --help, no-verb greeting, unknown-verb
// error code, smoke-without-url usage error, explain code path.

import { afterEach, describe, expect, it } from 'bun:test'

import { ExitCode } from '../src/exit-codes.ts'
import { main } from '../src/cli.ts'

const ORIGINAL_ARGV = process.argv

function setArgv(verb: string[]): void {
  process.argv = ['bun', '/path/to/cli.ts', ...verb]
}

function captureStreams(): { restore: () => { stdout: string; stderr: string } } {
  const out: string[] = []
  const err: string[] = []
  const origOut = process.stdout.write.bind(process.stdout)
  const origErr = process.stderr.write.bind(process.stderr)
  process.stdout.write = ((data: string | Uint8Array) => {
    out.push(typeof data === 'string' ? data : new TextDecoder().decode(data))
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((data: string | Uint8Array) => {
    err.push(typeof data === 'string' ? data : new TextDecoder().decode(data))
    return true
  }) as typeof process.stderr.write
  return {
    restore: () => {
      process.stdout.write = origOut
      process.stderr.write = origErr
      return { stdout: out.join(''), stderr: err.join('') }
    },
  }
}

afterEach(() => {
  process.argv = ORIGINAL_ARGV
})

describe('main dispatcher', () => {
  it('--version exits 0 and prints JSON version block', async () => {
    setArgv(['--version'])
    const cap = captureStreams()
    const code = await main()
    const { stdout } = cap.restore()
    expect(code).toBe(ExitCode.OK)
    const parsed = JSON.parse(stdout)
    expect(parsed.cli).toBeTruthy()
    expect(parsed.platform).toBeTruthy()
  })

  it('--help exits 0 and lists the verbs', async () => {
    setArgv(['--help'])
    const cap = captureStreams()
    const code = await main()
    const { stderr } = cap.restore()
    expect(code).toBe(ExitCode.OK)
    expect(stderr).toMatch(/Usage: bun gaia/)
    expect(stderr).toMatch(/verify-keys/)
    expect(stderr).toMatch(/deploy/)
  })

  it('no verb prints the conversational banner + next-hint', async () => {
    setArgv([])
    const cap = captureStreams()
    const code = await main()
    const { stderr } = cap.restore()
    expect(code).toBe(ExitCode.OK)
    expect(stderr).toMatch(/next:/)
  })

  it('unknown verb emits suffixed E0002_UNKNOWN_VERB and EX_USAGE', async () => {
    setArgv(['nonsense-verb'])
    const cap = captureStreams()
    const code = await main()
    const { stderr } = cap.restore()
    expect(code).toBe(ExitCode.EX_USAGE)
    expect(stderr).toMatch(/E0002_UNKNOWN_VERB/)
  })

  it('smoke without --url emits E0003_SMOKE_NO_URL', async () => {
    setArgv(['smoke'])
    const cap = captureStreams()
    const code = await main()
    const { stderr } = cap.restore()
    expect(code).toBe(ExitCode.EX_USAGE)
    expect(stderr).toMatch(/E0003_SMOKE_NO_URL/)
  })

  it('explain resolves --search and routes through the catalog', async () => {
    setArgv(['explain', '--search', 'lockfile'])
    const cap = captureStreams()
    const code = await main()
    cap.restore()
    // explain returns OK (0) for any successful catalog lookup.
    expect(code).toBe(ExitCode.OK)
  })
})
