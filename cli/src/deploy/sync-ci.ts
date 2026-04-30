// cli/src/deploy/sync-ci.ts — `--with-ci` flag implementation (Eng HIGH-13 / AD-AP-20).
//
// After Railway deploy succeeds, sync the same env vars to GitHub Actions
// secrets via `gh secret set`. Closes the day-2 cliff: founder pushes code,
// CI runs, hits Railway-green AND CI-green, not just Railway-green.

import { runCommand } from '../_spawn.ts'

export type SyncResult = {
  ok: boolean
  synced: readonly string[]
  errors: readonly { name: string; message: string }[]
}

export type SyncOptions = {
  envVarNames: readonly string[]
  envValues: Readonly<Record<string, string>>
  /** Test seam — defaults to spawning `gh`. */
  runCommand?: (
    cmd: string,
    args: readonly string[],
    stdin: string,
  ) => Promise<{ exitCode: number; stderr: string }>
}

const defaultRunCommand: NonNullable<SyncOptions['runCommand']> = async (cmd, args, stdin) => {
  // Use the shared spawn helper (#23/#27) — gives us 30s timeout +
  // SIGINT/SIGTERM forwarding for free. `gh secret set` takes ~1s typically;
  // 30s is generous.
  const result = await runCommand(cmd, args, { stdin, timeoutMs: 30_000 })
  return {
    exitCode: result.timedOut ? 124 : result.exitCode,
    stderr: result.timedOut ? `${result.stderr}\n[timed out after 30s]` : result.stderr,
  }
}

/**
 * Set each named env var as a GitHub Actions secret using `gh secret set NAME --body=<value>`.
 * Returns a per-name result. Skips empty values (avoids `gh secret set NAME --body=""` which
 * stores an empty secret silently).
 */
export async function syncToGitHub(opts: SyncOptions): Promise<SyncResult> {
  const run = opts.runCommand ?? defaultRunCommand
  const synced: string[] = []
  const errors: { name: string; message: string }[] = []

  for (const name of opts.envVarNames) {
    const value = opts.envValues[name] ?? ''
    if (value === '') {
      errors.push({ name, message: 'value is empty — refusing to set empty GitHub secret' })
      continue
    }
    // `--body -` is REQUIRED — without it `gh secret set` either prompts (hangs
    // in non-TTY) or treats the missing body as empty and silently sets the
    // secret to "" (RT-11). With `--body -` gh reads the value from stdin.
    // eslint-disable-next-line no-await-in-loop -- gh CLI is rate-limited; sequential is safer
    const result = await run('gh', ['secret', 'set', name, '--body', '-'], value)
    if (result.exitCode === 0) {
      synced.push(name)
    } else {
      errors.push({
        name,
        message: result.stderr.trim() || `gh secret set exited ${result.exitCode}`,
      })
    }
  }

  return { ok: errors.length === 0, synced, errors }
}
