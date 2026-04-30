// cli/src/verbs/setup.ts — interactive orchestrator (Principles 5 + 6).
//
// Walks the user through filling .env.local with prompts + browser links per
// provider. After collection, runs verify-keys. This is the "indie founder
// minimum-effort" path: no docs to read, no separate editor, just paste tokens
// inline and we handle the rest.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

import { createEmitter, generateRunId } from '../events.ts'
import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { loadEnvFile, PROVIDERS } from '../providers/index.ts'
import { colorize } from '../ui/banner.ts'
import { verifyKeys } from './verify-keys.ts'

export type SetupInput = {
  projectDir: string
  flags: StandardFlags
}

export type SetupResult = {
  exitCode: ExitCodeValue
  filledKeys: readonly string[]
  skippedKeys: readonly string[]
}

function tryOpenBrowser(url: string): void {
  // #31: validate URL scheme before passing to OS opener — `open` and
  // `xdg-open` will execute file:// (read local files), javascript: (Safari),
  // and other schemes. PROVIDER_INFO is an internal allowlist today, but this
  // function takes a string so we defend in depth.
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
  } catch {
    /* ignore — we always print the URL anyway */
  }
}

/**
 * Atomically replace KEY=value in .env.local (RT-7). Reads, mutates lines,
 * writes via tmp+rename so a Ctrl-C mid-write or disk full cannot corrupt the
 * existing user secrets. Refuses values containing newlines (would split the
 * file into broken lines on next read).
 */
function appendToEnvFile(envPath: string, name: string, value: string): void {
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error(
      `refusing to write ${name}: value contains a newline. Re-paste without trailing newline.`,
    )
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
  // Atomic write: tmp + rename. POSIX guarantees rename atomicity on the same fs.
  const tmpPath = `${envPath}.tmp.${process.pid}`
  writeFileSync(tmpPath, updated.join('\n'))
  renameSync(tmpPath, envPath)
}

export async function setup(input: SetupInput): Promise<SetupResult> {
  const { projectDir, flags } = input
  const runId = generateRunId()
  const emitter = createEmitter({ verb: 'setup', runId, jsonMode: flags.json })
  const envPath = join(projectDir, '.env.local')

  emitter.emit('cli.start', { data: { interactive: true } })

  const filled: string[] = []
  const skipped: string[] = []

  if (flags.json || flags.ci) {
    process.stderr.write(
      `\n${colorize('amber', '!')} \`bun gaia setup\` is interactive — use \`bun gaia verify-keys\` in --json/--ci mode.\n\n`,
    )
    return { exitCode: ExitCode.EX_USAGE, filledKeys: [], skippedKeys: [] }
  }

  process.stderr.write(
    `\n${colorize('green', '▶')} ${colorize('bold', 'Gaia setup')} — paste each key inline.\n` +
      `   Type ${colorize('dim', 'skip')} to defer a provider, ${colorize('dim', 'open')} to launch the browser.\n\n`,
  )

  const env = loadEnvFile(envPath)
  const rl = createInterface({ input: process.stdin, output: process.stderr })

  // SIGINT handler: close readline cleanly so the parent shell isn't left in
  // raw mode, then exit 130 (RT-7 / RT-16). Any partial writes are already
  // atomic via appendToEnvFile's tmp+rename.
  const sigintHandler = () => {
    rl.close()
    process.stderr.write(
      `\n${colorize('amber', '!')} setup interrupted — partial work preserved in .env.local\n`,
    )
    process.exit(130)
  }
  process.once('SIGINT', sigintHandler)

  try {
    for (const provider of PROVIDERS) {
      const envVar = provider.envVar
      const info = provider.setupInfo
      const existing = env[envVar] ?? ''
      if (existing && existing !== '') {
        process.stderr.write(`  ${colorize('green', '✓')} ${envVar} already set — skipped\n`)
        filled.push(envVar)
        continue
      }
      process.stderr.write(`\n  ${colorize('bold', envVar)} — ${info.description}\n`)
      process.stderr.write(`     ${colorize('dim', `where: ${info.tokenPath}`)}\n`)
      process.stderr.write(`     ${colorize('dim', `signup: ${info.signupUrl}`)}\n`)

      // eslint-disable-next-line no-await-in-loop -- interactive prompts are sequential by nature
      const answer = (await rl.question(`     ▸ paste ${envVar} (or 'skip'/'open'): `)).trim()

      if (answer === 'skip' || answer === '') {
        skipped.push(envVar)
        process.stderr.write(`     ${colorize('amber', '!')} skipped — fill in .env.local later\n`)
        continue
      }
      if (answer === 'open') {
        tryOpenBrowser(info.signupUrl)
        process.stderr.write(`     ${colorize('dim', `opened ${info.signupUrl} in browser`)}\n`)
        // eslint-disable-next-line no-await-in-loop
        const retry = (await rl.question(`     ▸ paste ${envVar} (or 'skip'): `)).trim()
        if (retry === 'skip' || retry === '') {
          skipped.push(envVar)
          continue
        }
        appendToEnvFile(envPath, envVar, retry)
        filled.push(envVar)
        process.stderr.write(`     ${colorize('green', '✓')} written to .env.local\n`)
        continue
      }
      appendToEnvFile(envPath, envVar, answer)
      filled.push(envVar)
      process.stderr.write(`     ${colorize('green', '✓')} written to .env.local\n`)
    }
  } finally {
    rl.close()
    process.removeListener('SIGINT', sigintHandler)
  }

  process.stderr.write(`\n${colorize('dim', '─'.repeat(60))}\n`)
  process.stderr.write(
    `${colorize('green', '✓')} ${filled.length}/${PROVIDERS.length} provider(s) filled, ${skipped.length} skipped\n\n`,
  )

  if (skipped.length > 0) {
    process.stderr.write(
      `  ${colorize('amber', '!')} Skipped: ${skipped.join(', ')}\n` +
        `     fix:  edit .env.local, then re-run \`bun gaia setup\`\n\n`,
    )
    return { exitCode: ExitCode.EX_DATAERR, filledKeys: filled, skippedKeys: skipped }
  }

  // Hand off to verify-keys to confirm everything works.
  process.stderr.write(`${colorize('green', '→')} running \`bun gaia verify-keys\`…\n\n`)
  const verify = await verifyKeys({ projectDir, flags: { ...flags, quiet: false } })
  return {
    exitCode: verify.exitCode,
    filledKeys: filled,
    skippedKeys: skipped,
  }
}
