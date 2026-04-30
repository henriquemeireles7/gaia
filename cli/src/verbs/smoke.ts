// cli/src/verbs/smoke.ts — `bun gaia smoke` (PR 6).
//
// Runs ASSERTIONS sequentially against the deployed URL. Per AD-AP-5 + DX
// requirement: at smoke success, print a celebration banner with the live URL
// and elapsed TTFD. State.json captures the smoke result for resume scenarios.

import { createEmitter, generateRunId } from '../events.ts'
import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import type { Fetcher } from '../providers/types.ts'
import { ASSERTIONS, type SmokeResult } from '../smoke/assertions.ts'
import { defaultStatePath, load, update } from '../state.ts'
import { colorize } from '../ui/banner.ts'
import { createNarrator } from '../ui/narrate.ts'

export type SmokeInput = {
  projectDir: string
  baseUrl: string
  flags: StandardFlags
  fetcher?: Fetcher
}

export type SmokeOutcome = {
  exitCode: ExitCodeValue
  results: readonly SmokeResult[]
  ttfdMinutes?: number
}

export async function smoke(input: SmokeInput): Promise<SmokeOutcome> {
  const { projectDir, baseUrl, flags, fetcher = fetch } = input
  const runId = generateRunId()
  const emitter = createEmitter({ verb: 'smoke', runId, jsonMode: flags.json })
  const narrate = createNarrator({ emitter, quiet: flags.quiet, verbose: flags.verbose })

  emitter.emit('cli.start', { data: { base_url: baseUrl } })

  const results: SmokeResult[] = []
  let blockingFailures = 0

  for (const assertion of ASSERTIONS) {
    // eslint-disable-next-line no-await-in-loop -- assertions are sequential by design
    const result = await assertion({ baseUrl, fetcher })
    results.push(result)
    if (result.ok) {
      narrate.ok(result.name, result.description)
      for (const w of result.warnings) narrate.warn(result.name, w)
    } else {
      blockingFailures++
      narrate.error(result.name, `${result.error?.code ?? 'E0000'} ${result.error?.message ?? ''}`)
    }
  }

  // Compute elapsed TTFD from state.started_at.
  const statePath = flags.stateFile ?? defaultStatePath(projectDir)
  let ttfdMinutes: number | undefined
  const loaded = load(statePath)
  if (loaded.ok) {
    const started = Date.parse(loaded.state.started_at)
    if (!Number.isNaN(started)) {
      ttfdMinutes = Math.round((Date.now() - started) / 60_000)
    }
  }

  if (blockingFailures > 0) {
    emitter.emit('cli.error', { data: { failed: blockingFailures } })
    return { exitCode: ExitCode.EX_DATAERR, results, ttfdMinutes }
  }

  // Persist smoke result + check whether this is the FIRST smoke-green run
  // (which is the locked activation event per Principle 2). Idempotency:
  // `activated_at` is set ONCE on first success and never re-set, so re-deploys
  // followed by re-smokes don't double-fire flow.activated (RT-12).
  let isFirstActivation = false
  const activationTimestamp = new Date().toISOString()
  try {
    await update(statePath, (current) => {
      isFirstActivation = current.activated_at === undefined
      return {
        ...current,
        last_step: 'smoke.complete',
        next_step: 'launch',
        activated_at: current.activated_at ?? activationTimestamp,
      }
    })
  } catch (err) {
    // Surface non-missing errors (#39).
    const msg = (err as Error).message
    if (!msg.includes('not found')) {
      narrate.warn('state.update', `state.json error: ${msg}`)
    }
  }

  // Funnel + activation events (Principles 2 + 7).
  emitter.emit('flow.smoke', { data: { base_url: baseUrl, ttfd_minutes: ttfdMinutes } })
  if (isFirstActivation) {
    emitter.emit('flow.activated', {
      data: {
        base_url: baseUrl,
        ttfd_minutes: ttfdMinutes,
      },
    })
  }

  // Celebration print (DX magical moment per founder Q5=A + AD-AP).
  if (!flags.quiet) {
    const banner = renderCelebration({ baseUrl, ttfdMinutes })
    process.stderr.write(banner)
  }

  emitter.emit('cli.complete', {
    data: { base_url: baseUrl, ttfd_minutes: ttfdMinutes },
    next: `open ${baseUrl}/sign-up to create your first user`,
  })

  return { exitCode: ExitCode.OK, results, ttfdMinutes }
}

function renderCelebration(input: { baseUrl: string; ttfdMinutes?: number }): string {
  // Lee Robinson: lead with achievement, not next step. Make URL prominent.
  // GR: clickable terminals support OSC-8 hyperlinks via `\x1b]8;;<url>\x1b\\<text>\x1b]8;;\x1b\\`
  const url = input.baseUrl.replace(/\/$/, '')
  const tag = input.ttfdMinutes !== undefined ? `TTFD ${input.ttfdMinutes} min` : 'live'
  const lines = [
    '',
    `${colorize('green', '🟢')}  ${colorize('bold', 'Your SaaS is live.')}`,
    '',
    `    ${colorize('green', url)}`,
    `    ${colorize('dim', tag)}`,
    '',
    `    ${colorize('dim', 'next: open the URL, sign up, then tweet it')}`,
    '',
  ]
  return `${lines.join('\n')}\n`
}
