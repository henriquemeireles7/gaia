#!/usr/bin/env bun
// cli/src/cli.ts — entry point for `bun gaia <verb>`.
//
// Dispatches to verbs in cli/src/verbs/. Per AD-AP-15: `bun gaia` with no
// args prints the banner + verb list + "next:" hint — conversational, not
// a help-text dump.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createProductionRunner } from './deploy/runner.ts'
import { ExitCode } from './exit-codes.ts'
import { DEFAULT_FLAGS, parseFlags } from './flags.ts'
import { deploy } from './verbs/deploy.ts'
import { explain } from './verbs/explain.ts'
import { setup } from './verbs/setup.ts'
import { smoke } from './verbs/smoke.ts'
import { status } from './verbs/status.ts'
import { verifyKeys } from './verbs/verify-keys.ts'
import { printBanner } from './ui/banner.ts'

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(join(here, '../package.json'), 'utf-8')) as {
      version?: string
    }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const CLI_VERSION = readPackageVersion()

const VERBS = {
  status: 'Show project state + next-actionable command',
  setup: 'Interactive: paste your 4 API keys (Polar, Resend, Neon, Railway)',
  'verify-keys': 'Verify Polar / Resend / Neon / Railway API keys',
  deploy: 'Deploy to Railway with d-fail self-heal',
  smoke: 'Post-deploy smoke test (auth round-trip + Polar webhook)',
  explain: 'Explain an error code (E####), `--search <term>` for free-text',
} as const

function printHelp(): void {
  process.stderr.write(
    `\nUsage: bun gaia <verb> [options]\n\n` +
      `Verbs:\n` +
      Object.entries(VERBS)
        .map(([n, s]) => `  ${n.padEnd(14)} ${s}`)
        .join('\n') +
      `\n\n` +
      `Global flags:\n` +
      `  --json           NDJSON output on stdout, narration on stderr\n` +
      `  --dry-run        No external side effects; emit planned events\n` +
      `  --quiet, -q      Suppress narration\n` +
      `  --verbose, -v    Increase narration detail\n` +
      `  --no-color       Strip ANSI\n` +
      `  --no-telemetry   Disable anonymized first-run events\n` +
      `  --ci             Implies --yes --no-color --json\n` +
      `  --state-file=<path>  Override ./.gaia/state.json location\n` +
      `  --version        Print versions (cli + bun + node)\n` +
      `  --help, -h       This help\n\n` +
      `Bootstrap a new project: bun create gaia@latest <name>\n` +
      `Docs: https://github.com/henriquemeireles7/gaia\n\n`,
  )
}

function printVersion(): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        cli: CLI_VERSION,
        bun: process.versions.bun ?? null,
        node: process.versions.node ?? null,
        platform: process.platform,
      },
      null,
      2,
    )}\n`,
  )
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const { flags, positional, unknownFlags } = parseFlags(argv)

  if (flags.version) {
    printVersion()
    return ExitCode.OK
  }
  if (flags.help) {
    printHelp()
    return ExitCode.OK
  }

  // Windows refusal on every verb (#40) — `setup`/`verify-keys`/etc. all spawn
  // platform-specific processes (`xdg-open`, `which`, `bun install`) and would
  // crash later. Refuse early with a typed code.
  if (process.platform === 'win32') {
    process.stderr.write(
      `[E1002] Gaia v1 supports macOS and Linux only. Use WSL2 (https://learn.microsoft.com/windows/wsl/install).\n`,
    )
    return ExitCode.EX_CONFIG
  }

  const verb = positional[0]
  if (!verb) {
    // Conversational greeting per AD-AP-15.
    printBanner({ projectSlug: '(no project)', cliVersion: CLI_VERSION, startedAt: new Date() })
    process.stderr.write('  next: bun gaia verify-keys (or bun gaia --help for the verb list)\n\n')
    return ExitCode.OK
  }

  const projectDir = process.cwd()
  const verbArgs = positional.slice(1)

  switch (verb) {
    case 'status': {
      const result = status({ projectDir, flags })
      return result.exitCode
    }
    case 'setup': {
      const result = await setup({ projectDir, flags })
      return result.exitCode
    }
    case 'verify-keys': {
      const result = await verifyKeys({ projectDir, flags })
      return result.exitCode
    }
    case 'deploy': {
      const withCi = unknownFlags.includes('--with-ci')
      const runner = createProductionRunner({ projectDir })
      const result = await deploy({
        projectDir,
        flags: { ...flags, withCi },
        runner,
      })
      return result.exitCode
    }
    case 'smoke': {
      // Verb-specific flags (e.g. --url=) land in unknownFlags from parseFlags.
      // Pass full argv so `--url <value>` (split form) works too.
      const url = parseUrlFlag(argv)
      if (!url) {
        process.stderr.write(
          `[E0003_SMOKE_NO_URL] smoke requires --url=<base-url>.\n  next: bun gaia smoke --url=https://your-app.up.railway.app\n`,
        )
        return ExitCode.EX_USAGE
      }
      const result = await smoke({ projectDir, baseUrl: url, flags })
      return result.exitCode
    }
    case 'explain': {
      // Parse --search from the original argv (after the verb) so `--search foo`
      // (split by space) works regardless of how parseFlags split positional/unknown.
      const verbIdx = argv.indexOf('explain')
      const explainArgv = verbIdx >= 0 ? argv.slice(verbIdx + 1) : verbArgs
      const search = parseSearchFlag(explainArgv)
      // The code is the first positional that isn't a flag AND isn't the value of --search.
      const searchIdx = explainArgv.indexOf('--search')
      const code = explainArgv.find((arg, i) => {
        if (arg.startsWith('-')) return false
        if (searchIdx >= 0 && i === searchIdx + 1) return false
        return true
      })
      const result = explain({ code, search, projectDir, flags })
      return result.exitCode
    }
    default: {
      // Suffixed code form (#34) — exact-match consumers (parsing the literal
      // stderr line) can find the catalog entry without prefix-fallback logic.
      process.stderr.write(
        `[E0002_UNKNOWN_VERB] unknown verb "${verb}".\n  fix: try \`bun gaia --help\` to see verbs.\n`,
      )
      return ExitCode.EX_USAGE
    }
  }
}

/**
 * Parse a `--<flag>=value` or `--<flag> value` pattern from argv (#17).
 * Replaces the duplicated parseUrlFlag / parseSearchFlag.
 */
function parseStringFlag(name: string, args: readonly string[]): string | undefined {
  const prefix = `--${name}=`
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''
    if (arg.startsWith(prefix)) return arg.slice(prefix.length)
    if (arg === `--${name}`) {
      const next = args[i + 1]
      if (next && !next.startsWith('-')) return next
    }
  }
  return undefined
}

function parseUrlFlag(args: readonly string[]): string | null {
  return parseStringFlag('url', args) ?? null
}

function parseSearchFlag(args: readonly string[]): string | undefined {
  return parseStringFlag('search', args)
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      // Suffixed code form (#34) so `bun gaia explain E0099` resolves directly.
      process.stderr.write(`[E0099_INTERNAL] internal error: ${(err as Error).message}\n`)
      process.exit(ExitCode.EX_SOFTWARE)
    })
}

// Re-export for tests that need to drive the dispatcher programmatically.
export { main, DEFAULT_FLAGS }
