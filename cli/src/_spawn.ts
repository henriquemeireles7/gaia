// cli/src/_spawn.ts — shared subprocess helper (PR /review #23).
//
// Three callers had near-identical wrappers around child_process.spawn:
//   - deploy/runner.ts (preflight, deploy, status)
//   - deploy/sync-ci.ts (gh secret set)
//   - create.ts (bun install)
//
// All three captured stdout+stderr, resolved on close, surfaced exitCode.
// This module is the canonical wrapper. Adds: timeout (RT-10/15) + Ctrl-C
// forwarding (RT-15) + structured output.

import { spawn } from 'node:child_process'

/** @public */
export type RunOptions = {
  cwd?: string
  /** Bytes piped into the child's stdin. Useful for `gh secret set --body -`. */
  stdin?: string
  /** Kill the child if it hasn't exited within this many ms. Default: no timeout. */
  timeoutMs?: number
  /** Forward parent SIGINT/SIGTERM to the child. Default: true. */
  forwardSignals?: boolean
}

/** @public */
export type RunResult = {
  exitCode: number
  stdout: string
  stderr: string
  /** True if killed by our timeout watchdog. */
  timedOut: boolean
  durationMs: number
}

export function runCommand(
  cmd: string,
  args: readonly string[],
  opts: RunOptions = {},
): Promise<RunResult> {
  const { cwd, stdin, timeoutMs, forwardSignals = true } = opts
  const t0 = performance.now()

  return new Promise((resolve) => {
    const child = spawn(cmd, [...args], {
      cwd,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    if (stdin !== undefined && child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    let timer: ReturnType<typeof setTimeout> | undefined
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
      }, timeoutMs)
    }

    const sigintForward = () => child.kill('SIGINT')
    const sigtermForward = () => child.kill('SIGTERM')
    if (forwardSignals) {
      process.on('SIGINT', sigintForward)
      process.on('SIGTERM', sigtermForward)
    }

    const finish = (code: number, fallbackStderr = '') => {
      if (timer) clearTimeout(timer)
      if (forwardSignals) {
        process.removeListener('SIGINT', sigintForward)
        process.removeListener('SIGTERM', sigtermForward)
      }
      resolve({
        exitCode: code,
        stdout,
        stderr: fallbackStderr ? `${stderr}\n${fallbackStderr}` : stderr,
        timedOut,
        durationMs: performance.now() - t0,
      })
    }

    child.on('error', (err) => finish(127, err.message))
    child.on('close', (code) => finish(code ?? 1))
  })
}
