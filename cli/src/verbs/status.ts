// cli/src/verbs/status.ts — instant project status (Theme C / Principle 1).
//
// Reads .gaia/state.json + the captured-failure artifacts and prints a
// 1-screen summary of "where am I in the 30-min flow + what's the next
// thing to run." Renders in <50ms — meant to be reflexive.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { defaultStatePath, load } from '../state.ts'
import { colorize } from '../ui/banner.ts'

export type StatusInput = {
  projectDir: string
  flags: StandardFlags
}

export type StatusResult = {
  exitCode: ExitCodeValue
}

const NEXT_HINT: Record<string, string> = {
  'create.complete': 'bun gaia verify-keys',
  'verify-keys.complete': 'bun gaia deploy',
  'deploy.complete': 'bun gaia smoke',
  'smoke.complete': 'open the live URL — you are activated 🟢',
}

function suggestNextCommand(s: {
  last_step: string
  next_step: string
  verified?: Record<string, { ok: boolean }>
}): string {
  // If verify-keys ran but didn't fully pass, suggest fixing keys first.
  if (s.verified) {
    const failing = Object.entries(s.verified).filter(([, v]) => !v.ok)
    if (failing.length > 0) {
      return `bun gaia verify-keys   # ${failing.length} provider(s) still failing — fix .env.local`
    }
  }
  return NEXT_HINT[s.last_step] ?? `bun gaia ${s.next_step}`
}

export function status(input: StatusInput): StatusResult {
  const { projectDir, flags } = input
  const statePath = flags.stateFile ?? defaultStatePath(projectDir)
  const loaded = load(statePath)

  if (!loaded.ok) {
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: loaded.error }, null, 2)}\n`)
    } else {
      process.stderr.write(
        `\n${colorize('amber', '!')} No Gaia project here.\n` +
          `  fix:  Run \`bun create gaia@latest <name>\` from a directory you own.\n\n`,
      )
    }
    return { exitCode: ExitCode.EX_DATAERR }
  }

  const s = loaded.state
  const nextCmd = suggestNextCommand(s)

  // Failure-artifact peek (Theme B): look for `.gaia/last-*-failure.{json,log}`.
  const artifacts: string[] = []
  for (const name of [
    '.gaia/last-verify.json',
    '.gaia/last-deploy-failure.log',
    '.gaia/last-smoke.json',
  ]) {
    const p = join(projectDir, name)
    if (existsSync(p)) artifacts.push(name)
  }

  if (flags.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          project_slug: s.project_slug,
          last_step: s.last_step,
          next_step: s.next_step,
          next_command: nextCmd,
          verified: s.verified ?? null,
          deploy_attempts: s.deploy_attempts ?? 0,
          artifacts,
        },
        null,
        2,
      )}\n`,
    )
    return { exitCode: ExitCode.OK }
  }

  // Human render.
  const lines: string[] = []
  lines.push('')
  lines.push(`${colorize('green', '▶')} ${colorize('bold', s.project_slug)}`)
  lines.push(`  ${colorize('dim', 'started: ')}${s.started_at}`)
  lines.push(`  ${colorize('dim', 'last:    ')}${s.last_step}`)
  lines.push(`  ${colorize('dim', 'next:    ')}${nextCmd}`)
  if (s.verified) {
    lines.push('')
    lines.push(`  ${colorize('dim', 'verified providers:')}`)
    for (const [provider, v] of Object.entries(s.verified)) {
      const mark = v.ok ? colorize('green', '✓') : colorize('amber', '✗')
      lines.push(
        `    ${mark} ${provider}${v.warnings.length > 0 ? ` (${v.warnings.length} warning(s))` : ''}`,
      )
    }
  }
  if ((s.deploy_attempts ?? 0) > 0) {
    lines.push('')
    lines.push(`  ${colorize('dim', 'deploy attempts: ')}${s.deploy_attempts}/3`)
  }
  if (artifacts.length > 0) {
    lines.push('')
    lines.push(`  ${colorize('dim', 'failure artifacts:')}`)
    for (const a of artifacts) lines.push(`    ${a}`)
  }
  lines.push('')
  process.stderr.write(`${lines.join('\n')}\n`)

  return { exitCode: ExitCode.OK }
}
