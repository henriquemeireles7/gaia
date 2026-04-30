// cli/src/verbs/verify-keys.ts — `bun gaia verify-keys` (PR 4).
//
// Reads .env.local, calls each provider's verify(), aggregates results,
// updates state.json, emits NDJSON events. Per F-10, providers that report
// `ttfd_blocking: false` produce warnings but do not fail the verb.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { createEmitter, generateRunId } from '../events.ts'
import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { loadEnvFile, PROVIDERS, type Fetcher, type VerifyResult } from '../providers/index.ts'
import { defaultStatePath, load, update } from '../state.ts'
import { createNarrator } from '../ui/narrate.ts'

/** @public */
export type VerifyKeysInput = {
  projectDir: string
  flags: StandardFlags
  /** Override .env.local path (testing). */
  envFile?: string
  /** Override fetch (testing). */
  fetcher?: Fetcher
}

/** @public */
export type VerifyKeysResult = {
  exitCode: ExitCodeValue
  results: readonly VerifyResult[]
}

export async function verifyKeys(input: VerifyKeysInput): Promise<VerifyKeysResult> {
  const { projectDir, flags, fetcher } = input
  const envPath = input.envFile ?? join(projectDir, '.env.local')
  const env = loadEnvFile(envPath)

  const runId = generateRunId()
  const emitter = createEmitter({ verb: 'verify-keys', runId, jsonMode: flags.json })
  const narrate = createNarrator({ emitter, quiet: flags.quiet, verbose: flags.verbose })

  emitter.emit('cli.start', {
    // env_file is the relative basename only (#24 / S-5). The absolute path
    // includes the user's home dir + project name — sensitive in shared CI
    // log aggregators (datadog/sentry). Use the basename for diagnostics.
    data: { env_file: '.env.local', providers: PROVIDERS.map((p) => p.name) },
  })

  // Progress signal (Spolsky): if state.verified exists, narrate "N/4 already
  // verified" before we start, so the user can see incremental progress on retries.
  const statePathForRead = flags.stateFile ?? defaultStatePath(projectDir)
  const priorLoaded = load(statePathForRead)
  if (priorLoaded.ok && priorLoaded.state.verified) {
    const priorOk = Object.values(priorLoaded.state.verified).filter((v) => v.ok).length
    if (priorOk > 0) {
      narrate.ok('progress', `${priorOk}/${PROVIDERS.length} provider(s) verified previously`)
    }
  }

  const results: VerifyResult[] = []
  let blockingFailures = 0
  let softWarnings = 0

  for (const provider of PROVIDERS) {
    const token = env[provider.envVar] ?? ''
    // Narrate manually rather than via narrate.step — verify() returns a
    // VerifyResult instead of throwing, so we need to inspect ok/ttfd_blocking
    // BEFORE deciding whether to print ✓ or ✗.
    emitter.emit('step.start', { data: { name: `verify ${provider.name}` } })
    // eslint-disable-next-line no-await-in-loop -- providers are sequential by design
    const result = await provider.verify({ token, fetcher })
    results.push(result)
    if (result.ok) {
      narrate.ok(`verify ${provider.name}`)
      for (const w of result.warnings) {
        softWarnings++
        narrate.warn(`verify ${provider.name}`, w)
      }
    } else if (result.ttfd_blocking) {
      blockingFailures++
      narrate.error(
        `verify ${provider.name}`,
        `${result.error?.code ?? 'E0000'} ${result.error?.message ?? 'unknown'}`,
      )
    } else {
      softWarnings++
      narrate.warn(
        `verify ${provider.name}`,
        `${result.error?.code ?? 'E0000'} ${result.error?.message ?? 'unknown'} (non-blocking per F-10)`,
      )
    }
  }

  // Persist verification snapshot to state.json (best-effort — state may not exist on the first run).
  // last_step only advances on full success; on partial/failure we keep the prior step
  // so `status` correctly reflects "you are still at verify-keys, not at deploy."
  const statePath = flags.stateFile ?? defaultStatePath(projectDir)
  const allOk = blockingFailures === 0
  try {
    await update(statePath, (current) => ({
      ...current,
      verified: results.reduce(
        (acc, r) => ({
          ...acc,
          [r.provider]: {
            ok: r.ok,
            verified_at: new Date().toISOString(),
            warnings: [...r.warnings],
            ttfd_blocking: r.ttfd_blocking,
          },
        }),
        current.verified ?? {},
      ),
      last_step: allOk ? 'verify-keys.complete' : current.last_step,
      next_step: allOk ? 'deploy' : 'verify-keys',
    }))
  } catch (err) {
    // Distinguish "no state.json" (first run before scaffold — silent) from
    // "state corrupted / schema mismatch" (loud, demands attention) — #39.
    const msg = (err as Error).message
    if (msg.includes('not found')) {
      // Silent — no project context yet.
    } else {
      narrate.warn('state.update', `state.json error: ${msg}`)
    }
  }

  // Theme B — capture verify result to disk for retry / issue-filing.
  try {
    const artifactPath = join(projectDir, '.gaia/last-verify.json')
    mkdirSync(dirname(artifactPath), { recursive: true })
    writeFileSync(
      artifactPath,
      `${JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          blocking_failures: blockingFailures,
          soft_warnings: softWarnings,
          results,
        },
        null,
        2,
      )}\n`,
    )
  } catch {
    /* artifact best-effort */
  }

  if (blockingFailures > 0) {
    emitter.emit('cli.error', {
      data: { blocking_failures: blockingFailures, soft_warnings: softWarnings },
    })
    narrate.hint(`bun gaia status   # see what's set + what's missing`)
    return { exitCode: ExitCode.EX_DATAERR, results }
  }

  emitter.emit('cli.complete', {
    data: { soft_warnings: softWarnings },
    next: 'bun gaia deploy',
  })
  narrate.hint('bun gaia deploy')
  return { exitCode: ExitCode.OK, results }
}
