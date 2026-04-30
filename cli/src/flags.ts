// cli/src/flags.ts — standard flag parser (AD-AP-12 / Eng review HIGH-10).
//
// Every verb supports the same flag taxonomy. Parsing is deterministic and
// pure — given an argv, return a parsed shape + the residual positional args.

export type StandardFlags = {
  json: boolean
  dryRun: boolean
  verbose: boolean
  quiet: boolean
  yes: boolean
  noColor: boolean
  noTelemetry: boolean
  ci: boolean
  stateFile: string | null
  version: boolean
  help: boolean
}

export type ParsedArgs = {
  flags: StandardFlags
  positional: readonly string[]
  unknownFlags: readonly string[]
}

export const DEFAULT_FLAGS: StandardFlags = {
  json: false,
  dryRun: false,
  verbose: false,
  quiet: false,
  yes: false,
  noColor: false,
  noTelemetry: false,
  ci: false,
  stateFile: null,
  version: false,
  help: false,
}

/**
 * Parse a standard argv array. Recognized flags update `flags`; positional
 * args (no `-` prefix) are collected; unknown `--flags` are returned for
 * the caller to error on (or warn).
 *
 * `--ci` implies `--yes --no-color --json` (AD-AP-12).
 * `--no-color` implied when `process.env.NO_COLOR` or `process.env.CI` is set.
 */
export function parseFlags(argv: readonly string[]): ParsedArgs {
  const flags: StandardFlags = { ...DEFAULT_FLAGS }
  const positional: string[] = []
  const unknownFlags: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (arg === '--json') flags.json = true
    else if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--verbose' || arg === '-v') flags.verbose = true
    else if (arg === '--quiet' || arg === '-q') flags.quiet = true
    else if (arg === '--yes' || arg === '-y') flags.yes = true
    else if (arg === '--no-color') flags.noColor = true
    else if (arg === '--no-telemetry') flags.noTelemetry = true
    else if (arg === '--ci') flags.ci = true
    else if (arg === '--version') flags.version = true
    else if (arg === '--help' || arg === '-h') flags.help = true
    else if (arg === '--state-file') {
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        flags.stateFile = next
        i++
      }
    } else if (arg.startsWith('--state-file=')) {
      flags.stateFile = arg.slice('--state-file='.length)
    } else if (arg.startsWith('-')) {
      unknownFlags.push(arg)
    } else {
      positional.push(arg)
    }
  }

  // --ci implies --yes --no-color --json (AD-AP-12).
  if (flags.ci) {
    flags.yes = true
    flags.noColor = true
    flags.json = true
  }

  return { flags, positional, unknownFlags }
}

/**
 * Compute whether colored output is allowed for this invocation.
 * Honors --no-color, NO_COLOR env, non-TTY stderr, and CI env.
 */
export function shouldUseColor(flags: StandardFlags, isTty: boolean): boolean {
  if (flags.noColor) return false
  if (process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true') return false
  if (process.env.CI === 'true') return false
  return isTty
}
