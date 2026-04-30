// cli/src/deploy/runner.ts — production DeployRunner (PR 5 finish).
//
// PR 5 shipped the classifier + retry + sync-ci helpers and a `DeployRunner`
// injection seam — but never wrote the production runner that actually
// shells out to `bun run check` and `railway up`. This module is that
// runner.
//
// The d-fail integration is intentionally a hint, not a subprocess. The CLI
// classifies the failure, prints the recovery path + a `next:` line for the
// Claude agent to invoke `/d-fail`, then returns ok=true so the retry loop
// re-attempts. Between attempts, the agent does the actual fix. If the agent
// hasn't fixed it (or there's no agent), the next attempt fails with the same
// classification — which after 3 cycles surfaces with `bun gaia explain E3099`.

import { existsSync } from 'node:fs'

import { runCommand as spawnHelper } from '../_spawn.ts'
import { type ClassifiedFailure } from './classifier.ts'
import type { DeployRunner } from '../verbs/deploy.ts'

/** @public */
export type RunCommand = (
  cmd: string,
  args: readonly string[],
  cwd: string,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// Default timeouts per command class (#27 / RT-10).
const TIMEOUT_PREFLIGHT_MS = 5 * 60 * 1000 // 5 min — bun run check on a cold project
const TIMEOUT_DEPLOY_MS = 12 * 60 * 1000 // 12 min — Railway first-build ceiling
const TIMEOUT_QUICK_MS = 30 * 1000 // 30s — `which`, `railway status`

const defaultRunCommand: RunCommand = async (cmd, args, cwd) => {
  // Default timeout = 60s for unknown commands (sufficient for status checks).
  // Callers wanting longer timeouts pass their own runCommand.
  const result = await spawnHelper(cmd, args, { cwd, timeoutMs: 60_000 })
  return {
    exitCode: result.timedOut ? 124 : result.exitCode,
    stdout: result.stdout,
    stderr: result.timedOut ? `${result.stderr}\n[timed out after 60s]` : result.stderr,
  }
}

/** Run with a custom timeout — used internally by createProductionRunner for stages with known long ceilings. */
const runWithTimeout = async (
  cmd: string,
  args: readonly string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const result = await spawnHelper(cmd, args, { cwd, timeoutMs })
  return {
    exitCode: result.timedOut ? 124 : result.exitCode,
    stdout: result.stdout,
    stderr: result.timedOut ? `${result.stderr}\n[timed out after ${timeoutMs}ms]` : result.stderr,
  }
}

/** @public */
export type ProductionRunnerOptions = {
  projectDir: string
  /** Test seam — defaults to spawn(). */
  runCommand?: RunCommand
  /** Test seam — defaults to printing to stderr. */
  print?: (msg: string) => void
}

/**
 * The production DeployRunner. Three subprocess calls:
 *   1. preflight = `bun run check` (must be green before we burn Railway minutes)
 *   2. deploy    = `railway up --detach` (kicks build) then `railway status` (URL)
 *   3. invokeDFail = print classified hint + emit `/d-fail` next: line; return ok
 */
export function createProductionRunner(options: ProductionRunnerOptions): DeployRunner {
  const run = options.runCommand ?? defaultRunCommand
  // Internal helpers honor the test-seam runCommand if provided, otherwise use
  // class-specific timeouts. Test runners pass their own runCommand and get
  // immediate completions (no timeout).
  const runPreflight = options.runCommand
    ? options.runCommand
    : (cmd: string, args: readonly string[], cwd: string) =>
        runWithTimeout(cmd, args, cwd, TIMEOUT_PREFLIGHT_MS)
  const runDeploy = options.runCommand
    ? options.runCommand
    : (cmd: string, args: readonly string[], cwd: string) =>
        runWithTimeout(cmd, args, cwd, TIMEOUT_DEPLOY_MS)
  const runQuick = options.runCommand
    ? options.runCommand
    : (cmd: string, args: readonly string[], cwd: string) =>
        runWithTimeout(cmd, args, cwd, TIMEOUT_QUICK_MS)
  const print = options.print ?? ((msg: string) => process.stderr.write(`${msg}\n`))
  const cwd = options.projectDir
  void run // legacy seam; kept for callers that use the basic 60s default

  return {
    preflight: async () => {
      const r = await runPreflight('bun', ['run', 'check'], cwd)
      if (r.exitCode === 0) return { ok: true }
      // Pass BOTH stdout AND stderr to the classifier (RT-9). Railway's CLI
      // sometimes prints structured errors to stdout; tsgo writes to stderr;
      // bun runs split arbitrarily. Concatenating ensures no error log is missed.
      const log =
        [r.stderr, r.stdout].filter(Boolean).join('\n') || `bun run check exited ${r.exitCode}`
      return { ok: false, log }
    },
    deploy: async () => {
      // Reject early if `railway` is not installed.
      const which = await runQuick('which', ['railway'], cwd)
      if (which.exitCode !== 0) {
        return {
          ok: false,
          log:
            `railway CLI not found on PATH. Install: \`brew install railway\` or \`curl -fsSL https://railway.app/install.sh | sh\`. ` +
            `Then \`railway login\` + \`railway link\`.`,
        }
      }
      // Reject early if no railway.toml or .railway dir exists in the project.
      if (!existsSync(`${cwd}/railway.toml`) && !existsSync(`${cwd}/.railway`)) {
        return {
          ok: false,
          log: `No railway.toml in ${cwd}. Run \`railway link\` to associate this project with a Railway service first.`,
        }
      }
      const up = await runDeploy('railway', ['up', '--detach'], cwd)
      if (up.exitCode !== 0) {
        // Concat stdout + stderr (RT-9) — railway often writes structured failures to stdout.
        const log =
          [up.stderr, up.stdout].filter(Boolean).join('\n') || `railway up exited ${up.exitCode}`
        return { ok: false, log }
      }
      // Get the public URL via `railway status --json`.
      const status = await runQuick('railway', ['status', '--json'], cwd)
      if (status.exitCode !== 0) {
        return {
          ok: false,
          log: `railway up succeeded but \`railway status\` failed (${status.exitCode}). Check the Railway dashboard for the URL.`,
        }
      }
      try {
        const parsed = JSON.parse(status.stdout) as {
          publicDomain?: string
          deployments?: Array<{ url?: string }>
        }
        const url =
          parsed.publicDomain ??
          parsed.deployments?.find((d) => d.url)?.url ??
          'https://(railway-status-missing-url)'
        return { ok: true, url: url.startsWith('http') ? url : `https://${url}` }
      } catch (err) {
        return {
          ok: false,
          log: `Could not parse \`railway status --json\`: ${(err as Error).message}`,
        }
      }
    },
    invokeDFail: (failure: ClassifiedFailure) => {
      // Print the classified hint + emit `/d-fail` next: line for the agent.
      print(``)
      print(`  ↻ d-fail/${failure.class}: ${failure.summary}`)
      print(`     hint: ${failure.hint}`)
      print(`     next: /d-fail ${failure.errorCode}    (the agent will fix and signal retry)`)
      print(``)
      // Return ok=true so the retry attempts again. If the agent fixed the
      // issue between attempts, the retry succeeds. If not, the same class
      // re-surfaces and after 3 attempts the verb exits 75.
      return Promise.resolve({ ok: true })
    },
  }
}
