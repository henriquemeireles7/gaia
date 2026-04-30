// cli/src/verbs/live.ts — flip from VENDOR_MODE=mock to VENDOR_MODE=live.
//
// Runs the existing setup interview (which collects + verifies vendor
// keys) AND appends `VENDOR_MODE=live` to .env.local at the end so the
// app reboots into live mode.
//
// `bun gaia setup` stays as an alias — same handler, same behavior. Both
// names work; `live` is the canonical one because it describes WHAT
// happens (mock → live), not how (paste keys).

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { colorize } from '../ui/banner.ts'
import { setup } from './setup.ts'

/** @public */
export type LiveInput = {
  projectDir: string
  flags: StandardFlags
}

/** @public */
export type LiveResult = {
  exitCode: ExitCodeValue
  filledKeys: readonly string[]
  skippedKeys: readonly string[]
}

/**
 * Atomic upsert of a key in .env.local — same shape as setup.ts's
 * appendToEnvFile but exposed here for the VENDOR_MODE flip. Refuses
 * values with newlines (would corrupt the file on next read).
 */
function setEnvVar(envPath: string, name: string, value: string): void {
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error(`refusing to write ${name}: value contains a newline`)
  }
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
  const lines = current.split('\n')
  let replaced = false
  const updated = lines.map((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq === -1) return line
    const key = trimmed.slice(0, eq).trim()
    if (key === name) {
      replaced = true
      return `${name}=${value}`
    }
    return line
  })
  if (!replaced) updated.push(`${name}=${value}`)
  const tmpPath = `${envPath}.tmp.${process.pid}`
  writeFileSync(tmpPath, updated.join('\n'))
  renameSync(tmpPath, envPath)
}

export async function live(input: LiveInput): Promise<LiveResult> {
  const { projectDir, flags } = input
  const envPath = join(projectDir, '.env.local')

  const result = await setup({ projectDir, flags })

  // Only flip when at least one provider was actually filled — if the user
  // skipped everything, leaving them in mock mode is the right move.
  if (result.filledKeys.length > 0 && result.skippedKeys.length === 0) {
    try {
      setEnvVar(envPath, 'VENDOR_MODE', 'live')
      process.stderr.write(
        `\n  ${colorize('green', '✓')} VENDOR_MODE=live written to .env.local\n` +
          `     restart the dev server: ${colorize('dim', 'bun dev')}\n\n`,
      )
    } catch (err) {
      process.stderr.write(
        `\n  ${colorize('amber', '!')} couldn't write VENDOR_MODE=live to .env.local: ${(err as Error).message}\n` +
          `     fix manually: add the line ${colorize('dim', 'VENDOR_MODE=live')} to .env.local\n\n`,
      )
    }
  } else if (result.skippedKeys.length > 0) {
    process.stderr.write(
      `\n  ${colorize('amber', '!')} ${result.skippedKeys.length} provider(s) skipped — staying in mock mode\n` +
        `     fix the skipped keys then re-run ${colorize('dim', '`bun gaia live`')}\n\n`,
    )
  }

  return result
}
