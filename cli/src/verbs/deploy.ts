// cli/src/verbs/deploy.ts — `bun gaia deploy` (PR 5).
//
// Orchestrates: check (lint + types) → migrate → Railway deploy → retry on
// failure (with d-fail subprocess + classifier) → optional --with-ci sync.
//
// PR 5 ships the orchestration shape with mockable seams. The actual Railway
// deploy spawn lands here; tests use the `runner` injection to verify the
// retry / classify / sync-ci logic without a real Railway account.

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

import { classify, type ClassifiedFailure } from '../deploy/classifier.ts'
import { withBackoff, type RetryOutcome } from '../deploy/retry.ts'
import { syncToGitHub } from '../deploy/sync-ci.ts'
import { createEmitter, generateRunId } from '../events.ts'
import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { loadEnvFile } from '../providers/index.ts'
import { defaultStatePath, update } from '../state.ts'
import { createNarrator } from '../ui/narrate.ts'

export type DeployRunner = {
  /** Run `bun run check` (or test fixture). Returns Railway-shaped log on failure. */
  preflight: () => Promise<{ ok: true } | { ok: false; log: string }>
  /** Spawn the Railway deploy and return the build/deploy log. */
  deploy: () => Promise<{ ok: true; url: string } | { ok: false; log: string }>
  /** Invoke the d-fail skill subprocess with a classified failure hint. */
  invokeDFail: (failure: ClassifiedFailure) => Promise<{ ok: true } | { ok: false; reason: string }>
}

/** @public */
export type DeployInput = {
  projectDir: string
  flags: StandardFlags & { withCi?: boolean }
  runner: DeployRunner
  /** Test seam: skip the actual sleep between retries. */
  sleep?: (ms: number) => Promise<void>
}

/** @public */
export type DeployResult = {
  exitCode: ExitCodeValue
  url?: string
  attempts: number
  failureClass?: ClassifiedFailure['class']
  ciSynced: readonly string[]
}

export async function deploy(input: DeployInput): Promise<DeployResult> {
  const { projectDir, flags, runner, sleep } = input
  const runId = generateRunId()
  const emitter = createEmitter({ verb: 'deploy', runId, jsonMode: flags.json })
  const narrate = createNarrator({ emitter, quiet: flags.quiet, verbose: flags.verbose })

  emitter.emit('cli.start', { data: { with_ci: Boolean(flags.withCi) } })

  // Capture every failure log to disk so the user always has an artifact to
  // paste into a GitHub issue (Theme B). #25: strip ANSI escape codes — Railway
  // emits colored output that renders as garbage when pasted into GitHub markdown.
  // eslint-disable-next-line no-control-regex -- ANSI CSI escape sequences require \x1b
  const ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g
  const captureFailure = (stage: string, failure: ClassifiedFailure, log: string) => {
    try {
      const artifactPath = join(projectDir, '.gaia/last-deploy-failure.log')
      mkdirSync(dirname(artifactPath), { recursive: true })
      const header = `# Gaia deploy failure — captured ${new Date().toISOString()}\n# stage: ${stage}\n# class: ${failure.class}\n# code:  ${failure.errorCode}\n# fix:   ${failure.hint}\n\n`
      writeFileSync(artifactPath, header + log.replace(ANSI_PATTERN, '') + '\n')
    } catch {
      /* artifact best-effort */
    }
  }

  // Preflight — typecheck/lint must pass before we burn Railway minutes.
  const pre = await runner.preflight()
  if (!pre.ok) {
    const failure = classify(pre.log)
    captureFailure('preflight', failure, pre.log)
    narrate.error('preflight', `${failure.errorCode} ${failure.summary}`)
    narrate.hint(`bun gaia status   # also: cat .gaia/last-deploy-failure.log`)
    emitter.emit('cli.error', {
      data: { stage: 'preflight', error_code: failure.errorCode, class: failure.class },
    })
    return { exitCode: ExitCode.EX_DATAERR, attempts: 0, failureClass: failure.class, ciSynced: [] }
  }
  narrate.ok('preflight', 'bun run check is green')

  // Deploy with retry / d-fail self-heal.
  // `softFailUrl` captures the case where a non-blocking failure (F-10) fires
  // but no real URL was returned — we don't fabricate "(soft-fail; deploy continued)"
  // anymore (RT-3). When this happens the user gets a clear warning and we
  // refuse to advance to smoke without a real URL.
  let lastFailure: ClassifiedFailure | undefined
  let softFailWarning: string | undefined
  const retryOutcome: RetryOutcome<{ url: string }> = await withBackoff({
    sleep,
    attempt: async () => {
      const result = await runner.deploy()
      if (result.ok) return { url: result.url }
      const failure = classify(result.log)
      lastFailure = failure
      captureFailure('deploy', failure, result.log)
      if (!failure.ttfd_blocking) {
        // F-10: soft failure. We don't have a real URL to advance with. The user
        // must run `bun gaia status` to see what happened and decide next steps.
        softFailWarning = `${failure.errorCode} ${failure.summary}`
        narrate.warn(
          'deploy',
          `${softFailWarning} (non-blocking per F-10 — but no live URL was produced)`,
        )
        // Throw to trigger retry; if all attempts are soft-fails, we exit cleanly with no URL.
        throw new Error(`soft-fail/${failure.class}`)
      }
      narrate.warn('deploy', `${failure.errorCode} ${failure.summary} — invoking d-fail`)
      const heal = await runner.invokeDFail(failure)
      if (!heal.ok) {
        throw new Error(`d-fail/${failure.class}: ${heal.reason}`)
      }
      throw new Error(`retry needed after d-fail/${failure.class}`)
    },
  })

  if (!retryOutcome.ok) {
    // Distinguish hard-fail (3 blocking attempts) from soft-fail (F-10 with no URL).
    const isSoftFail = lastFailure?.ttfd_blocking === false
    if (isSoftFail) {
      narrate.warn(
        'deploy',
        `${softFailWarning ?? 'soft-fail'} — no live URL produced. Run \`bun gaia status\` to see the failure log; deploy did not proceed to smoke.`,
      )
      emitter.emit('cli.error', {
        data: {
          attempts: retryOutcome.attempts,
          class: lastFailure?.class ?? 'surfaced-cleanly',
          soft_fail: true,
        },
      })
      return {
        exitCode: ExitCode.EX_UNAVAILABLE,
        attempts: retryOutcome.attempts,
        failureClass: lastFailure?.class ?? 'surfaced-cleanly',
        ciSynced: [],
      }
    }
    narrate.error(
      'deploy',
      `${lastFailure?.errorCode ?? 'E3099_DEPLOY_UNKNOWN'} after ${retryOutcome.attempts} attempts: ${retryOutcome.lastError.message}`,
    )
    emitter.emit('cli.error', {
      data: { attempts: retryOutcome.attempts, class: lastFailure?.class ?? 'surfaced-cleanly' },
    })
    return {
      exitCode: ExitCode.EX_TEMPFAIL,
      attempts: retryOutcome.attempts,
      failureClass: lastFailure?.class ?? 'surfaced-cleanly',
      ciSynced: [],
    }
  }

  narrate.ok('deploy', `live at ${retryOutcome.value.url}`)

  // Optional --with-ci secret sync. S-2: confirm target repo before pushing
  // 4 secrets to whatever GitHub repo `gh` happens to be configured for.
  // Skipped when --yes / --ci is set (CI environments can't prompt).
  let ciSynced: readonly string[] = []
  if (flags.withCi) {
    const targetRepo = (() => {
      try {
        const r = spawnSync(
          'gh',
          ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
          {
            cwd: projectDir,
            encoding: 'utf-8',
          },
        )
        return r.status === 0 ? (r.stdout || '').trim() : '(unknown — `gh` not authenticated)'
      } catch {
        return '(unknown)'
      }
    })()

    if (!flags.yes && !flags.ci) {
      narrate.warn(
        'sync-ci',
        `About to set 4 GitHub Actions secrets (POLAR_ACCESS_TOKEN, RESEND_API_KEY, DATABASE_URL, RAILWAY_TOKEN) on ${targetRepo}.`,
      )
      const rl = createInterface({ input: process.stdin, output: process.stderr })
      try {
        const answer = (await rl.question(`     ▸ Continue? [y/N]: `)).trim().toLowerCase()
        if (answer !== 'y' && answer !== 'yes') {
          narrate.warn('sync-ci', 'Aborted by user — secrets NOT synced. Deploy stays green.')
          rl.close()
          // Skip sync but don't fail the deploy.
          // Persist deploy state without ciSynced; caller still gets the URL.
          // Fall through to state persistence below.
          // Use a sentinel to skip the actual sync:
          const statePath = flags.stateFile ?? defaultStatePath(projectDir)
          try {
            await update(statePath, (current) => ({
              ...current,
              deploy_attempts: retryOutcome.attempts,
              last_step: 'deploy.complete',
              next_step: 'smoke',
            }))
          } catch (err) {
            // #39: silent only for "not found" (no project context yet); loud
            // for corruption or schema mismatch.
            const msg = (err as Error).message
            if (!msg.includes('not found')) {
              narrate.warn('state.update', `state.json error: ${msg}`)
            }
          }
          emitter.emit('cli.complete', {
            data: { url: retryOutcome.value.url, attempts: retryOutcome.attempts, ci_synced: 0 },
            next: 'bun gaia smoke',
          })
          narrate.hint('bun gaia smoke')
          return {
            exitCode: ExitCode.OK,
            url: retryOutcome.value.url,
            attempts: retryOutcome.attempts,
            ciSynced: [],
          }
        }
      } finally {
        rl.close()
      }
    }

    const env = loadEnvFile(join(projectDir, '.env.local'))
    const sync = await syncToGitHub({
      envVarNames: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY', 'DATABASE_URL', 'RAILWAY_TOKEN'],
      envValues: env,
    })
    ciSynced = sync.synced
    if (sync.synced.length > 0) {
      narrate.ok('sync-ci', `synced ${sync.synced.length} secret(s) to GitHub Actions`)
    }
    for (const err of sync.errors) {
      narrate.warn('sync-ci', `${err.name}: ${err.message}`)
    }
  }

  // Persist deploy state.
  const statePath = flags.stateFile ?? defaultStatePath(projectDir)
  try {
    await update(statePath, (current) => ({
      ...current,
      deploy_attempts: retryOutcome.attempts,
      last_step: 'deploy.complete',
      next_step: 'smoke',
    }))
  } catch (err) {
    // #39: silent only for "not found" (first run before scaffold); loud for
    // corruption or schema mismatch.
    const msg = (err as Error).message
    if (!msg.includes('not found')) {
      narrate.warn('state.update', `state.json error: ${msg}`)
    }
  }

  emitter.emit('cli.complete', {
    data: { url: retryOutcome.value.url, attempts: retryOutcome.attempts },
    next: 'bun gaia smoke',
  })
  narrate.hint('bun gaia smoke')

  return {
    exitCode: ExitCode.OK,
    url: retryOutcome.value.url,
    attempts: retryOutcome.attempts,
    ciSynced,
  }
}
