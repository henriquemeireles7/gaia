#!/usr/bin/env bun
// cli/src/create.ts — `bun create gaia-app@latest <name>` entry point.
//
// Per initiative 0002 AD-AP-2 + AD-AP-13 + AD-AP-17 + AD-AP-18:
//   1. Banner appears in <1000ms (TTHW-1 gate).
//   2. .gitignore is written FIRST in the project (before any state.json or .env.local).
//   3. state.json holds env-var NAMES only — never values.
//   4. The scaffolder ends with a prominent "▶ Next:" boxed message routing to claude + "set me up".
//
// PR 2 ships a stub clone (file-system copy from the bundled template).
// PR 3 fills in the typed events / NDJSON / state.schema.ts / telemetry.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runCommand } from './_spawn.ts'
import { formatFailure, preflight } from './preflight.ts'
import { layDownTemplate, type TemplateMode } from './template.ts'
import { printBanner } from './ui/banner.ts'

/**
 * Initialize a fresh git repo in the scaffolded project. Three commands:
 * `git init --initial-branch=main`, `git add .`, `git commit -m ...`.
 *
 * Two failure modes handled:
 *   1. git not installed → returns ok:false, scaffolder logs a hint
 *   2. user.email / user.name not configured globally → retry with
 *      scaffolder defaults baked in via `-c`. The `commit.gpgsign=false`
 *      override means the commit succeeds even if the user has GPG
 *      signing enabled but no key on this machine — the scaffolder is
 *      not the right place to fail on that.
 */
async function runGitInit(targetDir: string): Promise<{ ok: boolean; reason?: string }> {
  const init = await runCommand('git', ['init', '--initial-branch=main'], {
    cwd: targetDir,
    timeoutMs: 30_000,
  })
  if (init.exitCode !== 0) {
    return { ok: false, reason: `git init: ${init.stderr.slice(0, 120)}` }
  }
  const add = await runCommand('git', ['add', '.'], { cwd: targetDir, timeoutMs: 30_000 })
  if (add.exitCode !== 0) {
    return { ok: false, reason: `git add: ${add.stderr.slice(0, 120)}` }
  }
  // First try with the user's existing global config. If user.email is
  // missing, retry with scaffolder defaults — common on fresh dev boxes.
  const baseArgs = [
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'Initial commit from create-gaia-app',
  ]
  const commit = await runCommand('git', baseArgs, { cwd: targetDir, timeoutMs: 30_000 })
  if (commit.exitCode === 0) return { ok: true }
  if (
    commit.stderr.includes('user.email') ||
    commit.stderr.includes('user.name') ||
    commit.stderr.includes('Please tell me who you are')
  ) {
    const retryArgs = [
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.email=you@local',
      '-c',
      'user.name=You',
      'commit',
      '-m',
      'Initial commit from create-gaia-app',
    ]
    const retry = await runCommand('git', retryArgs, { cwd: targetDir, timeoutMs: 30_000 })
    if (retry.exitCode === 0)
      return { ok: true, reason: 'used scaffolder default author (you@local)' }
    return { ok: false, reason: `git commit retry: ${retry.stderr.slice(0, 120)}` }
  }
  return { ok: false, reason: `git commit: ${commit.stderr.slice(0, 120)}` }
}

async function runBunInstall(targetDir: string): Promise<{ ok: boolean; durationMs: number }> {
  // Use the shared spawn helper (#23) — gives us 5-min timeout + Ctrl-C
  // forwarding (#29) for free.
  const result = await runCommand('bun', ['install'], {
    cwd: targetDir,
    timeoutMs: 5 * 60 * 1000,
  })
  if (result.timedOut) {
    process.stderr.write(
      `  ! bun install timed out after 5 minutes — try \`bun install\` manually\n`,
    )
    return { ok: false, durationMs: result.durationMs }
  }
  if (result.exitCode !== 0) {
    process.stderr.write(
      `  ! bun install failed (exit ${result.exitCode}): ${result.stderr.slice(0, 300)}\n`,
    )
    return { ok: false, durationMs: result.durationMs }
  }
  return { ok: true, durationMs: result.durationMs }
}

const T0 = performance.now()

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

type ParsedArgs = {
  projectSlug: string | null
  force: boolean
  yes: boolean
  json: boolean
  dryRun: boolean
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {
    projectSlug: null,
    force: false,
    yes: false,
    json: false,
    dryRun: false,
  }
  for (const arg of argv) {
    if (arg === '--force') out.force = true
    else if (arg === '--yes' || arg === '-y') out.yes = true
    else if (arg === '--json') out.json = true
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg.startsWith('--'))
      continue // unknown flag — PR 3's flag parser will error properly
    else if (!out.projectSlug) out.projectSlug = arg
  }
  return out
}

function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{0,38}[a-z0-9]$/.test(slug)
}

/**
 * The scaffolder is intentionally written as a sequence of named, atomic steps.
 * Each step emits a stderr narration line (PR 3 will also emit a structured NDJSON event).
 * Steps that mutate the filesystem are gated by --dry-run.
 */
export type ScaffolderInput = {
  targetDir: string
  projectSlug: string
  cliVersion: string
  startedAt: Date
  dryRun: boolean
}

export type ScaffoldedFile =
  | { path: '.gitignore'; order: 1 }
  | { path: '.env.local'; order: 2 }
  | { path: '.gaia/state.json'; order: 3 }

export type ScaffolderResult = {
  files: ScaffoldedFile[]
  nextStep: string
}

const GITIGNORE_BODY = `# Gaia scaffolder — written FIRST per AD-AP-17.
node_modules/
dist/
.env
.env.local
.env.*.local

# Per-machine Gaia CLI artifacts (state + captured failure logs).
.gaia/state.json
.gaia/state.json.lock
.gaia/state.json.tmp.*
.gaia/last-*

# Mock-mode artifacts — local DB + sent-mail audit log. Never commit.
.gaia/pglite-data/
.gaia/sent-emails.jsonl

# Local-only security reports (e.g. /cso output) — never commit.
.gstack/

# OS / editor
.DS_Store
.vscode/*
!.vscode/extensions.json
.idea/

# Logs
*.log
`

const ENV_LOCAL_TEMPLATE = `# Gaia local env — fill these in via \`bun gaia verify-keys\` (PR 4).
# Do NOT commit this file. It's already in .gitignore.

# Polar (payments) — https://polar.sh
POLAR_ACCESS_TOKEN=

# Resend (email) — https://resend.com
RESEND_API_KEY=

# Neon (Postgres) — https://neon.tech
DATABASE_URL=

# Railway (deploy) — https://railway.app
RAILWAY_TOKEN=
`

/**
 * AD-AP-18: state.json holds env-var NAMES only.
 * The schema lands in PR 3 (cli/src/state.schema.ts). For PR 2 we write the
 * minimum shape that downstream verbs can read.
 */
function buildInitialState(input: ScaffolderInput): Record<string, unknown> {
  return {
    version: 1,
    project_slug: input.projectSlug,
    cli_version: input.cliVersion,
    started_at: input.startedAt.toISOString(),
    bun_version: process.versions.bun ?? null,
    platform: process.platform,
    // env-var NAMES the project will need (per AD-AP-18 — never values):
    required_env: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY', 'DATABASE_URL', 'RAILWAY_TOKEN'],
    last_step: 'create.complete',
    next_step: 'verify-keys',
  }
}

const PROJECT_README = (slug: string): string => `# ${slug}

Built from the [Gaia](https://github.com/henriquemeireles7/gaia) template — a clone-to-deploy SaaS template for the agent-native era.

## Quick start

\`\`\`bash
bun dev                       # mock mode — see your app at http://localhost:3000
\`\`\`

The app boots in **mock mode** by default. Polar, Resend, Anthropic, and the database all run as in-process fakes so you can iterate without signing up for any vendor.

## Make it real

Three paths from "scaffolded" to "shipped":

### Recommended (Claude Code users)

\`\`\`
/w-launch                     # interview-driven onboarding — JTBD interview, first feature, your real landing
\`\`\`

### CLI

\`\`\`bash
bun gaia live                 # connect Polar / Resend / Neon / Railway interactively
bun gaia deploy && bun gaia smoke
\`\`\`

### Just exploring

\`\`\`bash
bun dev                       # see the mock app, edit code, restart, iterate
\`\`\`

## What's where

| Path | Contents |
|---|---|
| \`apps/api/\` | Elysia backend — TypeBox routes, Eden Treaty types |
| \`apps/web/\` | SolidStart frontend (start here: \`apps/web/src/routes/index.tsx\`) |
| \`packages/db/\` | Drizzle schema + migrations (Postgres in live, PGLite in mock) |
| \`packages/adapters/\` | Vendor wrappers — \`mocks/\` subdir holds the mock-mode implementations |
| \`packages/security/\` | Rate limits, AI budget, audit log, CORS |
| \`.claude/skills/\` | Agent skills you can invoke from Claude Code |
| \`.gaia/\` | Methodology — vision, rules, hooks |

## Switch from mock to live

Set \`VENDOR_MODE=live\` in \`.env.local\` and provide real keys, or run \`bun gaia live\` and we'll do it for you.

## License

MIT
`

/**
 * Replace the template's README with a project-specific one. The template
 * README sells Gaia + references its initiatives + has a CHANGELOG that
 * doesn't apply to the user's project. Writing fresh is cleaner than
 * trying to merge.
 */
export function customizeReadme(targetDir: string, projectSlug: string): boolean {
  try {
    writeFileSync(join(targetDir, 'README.md'), PROJECT_README(projectSlug))
    return true
  } catch {
    return false
  }
}

/**
 * Customize the template's package.json for the user's project: rename to
 * the project slug, reset version to 0.1.0 (it's a brand-new app, not the
 * template's version), drop the `cli` workspace, and pin
 * `create-gaia-app` as a real npm version so `node_modules/.bin/gaia`
 * exists post-install and `bun gaia <verb>` resolves.
 *
 * No-op if package.json is missing (template laid down in stub/unavailable
 * mode) or unparseable. The template repo's package.json shape is the
 * source of truth for everything else (deps, scripts, workspaces).
 */
export function customizePackageJson(
  targetDir: string,
  projectSlug: string,
  cliVersion: string,
): boolean {
  const pkgPath = join(targetDir, 'package.json')
  let raw: string
  try {
    raw = readFileSync(pkgPath, 'utf-8')
  } catch {
    return false // template didn't include package.json (e.g. stub mode) — nothing to customize
  }
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return false // malformed — leave as-is so the user can debug
  }
  pkg.name = projectSlug
  pkg.version = '0.1.0'
  // Drop the "cli" workspace entry — that's the create-gaia-app source,
  // excluded from the user's project by EXCLUDE_PATHS. Leaving it in
  // package.json crashes `bun install` with "Workspace not found 'cli'".
  if (Array.isArray(pkg.workspaces)) {
    pkg.workspaces = (pkg.workspaces as string[]).filter((w) => w !== 'cli')
  }
  // Pin create-gaia-app as a real dependency so `node_modules/.bin/gaia`
  // gets symlinked by `bun install` and the README's `bun gaia <verb>`
  // path actually resolves. The source repo lists this as
  // `workspace:*` for local dev — rewrite to a caret range on the
  // running CLI's version so the scaffolded project pulls from npm.
  // Drop any stray entry from `dependencies` to keep it dev-only.
  const deps = (pkg.dependencies as Record<string, string> | undefined) ?? null
  if (deps && 'create-gaia-app' in deps) {
    delete deps['create-gaia-app']
  }
  const devDeps = ((pkg.devDependencies as Record<string, string> | undefined) ?? {}) as Record<
    string,
    string
  >
  devDeps['create-gaia-app'] = `^${cliVersion}`
  pkg.devDependencies = devDeps
  // Pretty-print preserving 2-space indent + trailing newline (npm convention).
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  return true
}

/**
 * Apply the scaffolder overlays — runs AFTER the template tree has been laid
 * down by `layDownTemplate()`. The .gitignore-first invariant (AD-AP-17) holds
 * because the overlays write `.gitignore` (or its merge) before any other
 * scaffolder-owned file.
 */
export function scaffold(input: ScaffolderInput): ScaffolderResult {
  const { targetDir, projectSlug, dryRun } = input
  const files: ScaffoldedFile[] = []

  if (!dryRun) {
    mkdirSync(targetDir, { recursive: true })
    mkdirSync(join(targetDir, '.gaia'), { recursive: true })
  }

  // STEP 1 — .gitignore FIRST (AD-AP-17). Overlays the template's .gitignore
  // with our scaffolder additions (state.json + .env.local lines). If a
  // template .gitignore already exists from layDownTemplate, this overwrites
  // — which is correct: the scaffolder owns the canonical project .gitignore.
  if (!dryRun) writeFileSync(join(targetDir, '.gitignore'), GITIGNORE_BODY)
  files.push({ path: '.gitignore', order: 1 })

  // STEP 2 — .env.local template (no values). NEVER overwrite an existing
  // .env.local (would clobber user secrets in --force re-runs).
  if (!dryRun) {
    try {
      writeFileSync(join(targetDir, '.env.local'), ENV_LOCAL_TEMPLATE, { flag: 'wx' })
    } catch {
      /* file already exists — preserve it */
    }
  }
  files.push({ path: '.env.local', order: 2 })

  // STEP 3 — state.json (no secrets — names only per AD-AP-18).
  const state = buildInitialState(input)
  if (!dryRun) {
    writeFileSync(join(targetDir, '.gaia/state.json'), `${JSON.stringify(state, null, 2)}\n`)
  }
  files.push({ path: '.gaia/state.json', order: 3 })

  // Hand-off copy: three paths, ordered by how much hand-holding the user
  // wants. /w-launch (Claude Code) is recommended for first-timers; the
  // CLI path is for users who know what they want; bun dev alone is for
  // exploration. Mock mode means the app already works at all three levels.
  const nextStep = `cd ${projectSlug}
  bun dev                    # see the mock app at http://localhost:3000
  /w-launch                  # Claude Code: interview → first feature → your real landing
  bun gaia live              # CLI: connect Polar, Resend, Neon, Railway`

  return { files, nextStep }
}

function printNextStepBox(text: string): void {
  const lines = text.split('\n')
  const width = Math.max(...lines.map((l) => l.length)) + 4
  const top = `┌${'─'.repeat(width)}┐`
  const bottom = `└${'─'.repeat(width)}┘`
  process.stderr.write(`\n${top}\n`)
  process.stderr.write(`│  ▶ Next:${' '.repeat(width - 9)}│\n`)
  for (const line of lines) {
    process.stderr.write(`│  ${line}${' '.repeat(width - line.length - 2)}│\n`)
  }
  process.stderr.write(`${bottom}\n`)
}

/**
 * Main entry. Wired to bin via package.json.
 */
async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (!args.projectSlug) {
    process.stderr.write(
      'Usage: bun create gaia-app@latest <project-slug> [--force] [--dry-run]\n' +
        'Slugs are lowercase letters/digits/dashes (3-40 chars).\n',
    )
    return 64 // EX_USAGE
  }
  if (!isValidSlug(args.projectSlug)) {
    process.stderr.write(
      `[E1005_INVALID_SLUG] "${args.projectSlug}" is not a valid project slug.\n` +
        '  fix: use lowercase letters, digits, dashes; 3-40 chars; must start with a letter.\n',
    )
    return 65 // EX_DATAERR
  }

  const targetDir = join(process.cwd(), args.projectSlug)

  // PREFLIGHT — fail fast before any I/O.
  const failure = preflight({
    bunVersion: process.versions.bun,
    platform: process.platform,
    targetDir,
    force: args.force,
  })
  if (failure) {
    process.stderr.write(formatFailure(failure))
    return failure.exit
  }

  // BANNER — TTHW-1 gate.
  const startedAt = new Date()
  const elapsed = printBanner(
    { projectSlug: args.projectSlug, cliVersion: CLI_VERSION, startedAt },
    T0,
  )
  if (elapsed > 1000) {
    // Soft warning — the test gate is the actual enforcement (cli/test/banner.test.ts).
    process.stderr.write(`[warn] banner rendered in ${elapsed.toFixed(0)}ms (target <1000ms).\n`)
  }

  // STEP A — TEMPLATE TREE — copy apps/ + packages/ + .claude/ + .gaia/ tree.
  // In-source mode (running from inside Gaia checkout) copies from repo root.
  // Published mode (npm install) does git clone of upstream.
  let templateMode: TemplateMode = 'unavailable'
  let filesCopied = 0
  if (!args.dryRun) {
    const tpl = await layDownTemplate({ targetDir })
    templateMode = tpl.mode
    filesCopied = tpl.filesCopied
    if (tpl.warning) {
      process.stderr.write(`  ! ${tpl.warning}\n`)
    } else {
      process.stderr.write(`  ✓ template tree (${tpl.mode}, ${tpl.filesCopied} files)\n`)
    }
    // Rename the template's package.json to the user's project slug + reset
    // version. Done before bun install so node_modules carries the right name.
    if (customizePackageJson(targetDir, args.projectSlug, CLI_VERSION)) {
      process.stderr.write(
        `  ✓ package.json customized (name=${args.projectSlug}, version=0.1.0, gaia verb runner pinned)\n`,
      )
    }
    // Replace the template's README with a project-specific one — the
    // template README sells Gaia + references its initiatives, not the
    // user's app. Same rationale as customizePackageJson.
    if (customizeReadme(targetDir, args.projectSlug)) {
      process.stderr.write(`  ✓ README.md written for ${args.projectSlug}\n`)
    }
  } else {
    process.stderr.write('  ✓ template tree (skipped in --dry-run)\n')
  }

  // STEP B — SCAFFOLDER OVERLAYS (.gitignore-first / .env.local / state.json).
  const result = scaffold({
    targetDir,
    projectSlug: args.projectSlug,
    cliVersion: CLI_VERSION,
    startedAt,
    dryRun: args.dryRun,
  })

  for (const file of result.files) {
    process.stderr.write(`  ✓ wrote ${file.path}\n`)
  }
  if (args.dryRun) {
    process.stderr.write('\n[dry-run] no files written.\n')
  }

  if (templateMode === 'unavailable') {
    process.stderr.write(
      `\n  [stub mode] template tree could not be laid down — only the overlay files exist.\n` +
        `              Run \`git clone https://github.com/henriquemeireles7/gaia ${args.projectSlug}\` and copy the overlay files in by hand.\n`,
    )
  } else if (!args.dryRun) {
    process.stderr.write(`  → installing dependencies (bun install)…\n`)
    const install = await runBunInstall(targetDir)
    if (install.ok) {
      process.stderr.write(
        `  ✓ dependencies installed (${(install.durationMs / 1000).toFixed(1)}s)\n`,
      )
    } else {
      process.stderr.write(
        `  ! dependencies NOT installed — run \`cd ${args.projectSlug} && bun install\` manually before any verb.\n`,
      )
    }
    // Run DB migrations so `bun dev` boots with tables. In mock mode this
    // creates the local PGLite store under .gaia/pglite-data. Tolerate
    // failure — happens in live mode without DATABASE_URL set, which is
    // expected for users who'll run `bun gaia live` themselves.
    if (install.ok) {
      const migrate = await runCommand('bun', ['run', 'db:migrate'], {
        cwd: targetDir,
        timeoutMs: 60_000,
      })
      if (migrate.exitCode === 0) {
        process.stderr.write(`  ✓ database migrated (PGLite mock store at .gaia/pglite-data)\n`)
      } else {
        process.stderr.write(
          `  ! db:migrate skipped — fix later with \`cd ${args.projectSlug} && bun run db:migrate\`\n`,
        )
      }
    }
    // Initialize git AFTER bun install so the .lock + node_modules are
    // present (lock tracked, node_modules excluded by template .gitignore).
    process.stderr.write(`  → git init + first commit…\n`)
    const git = await runGitInit(targetDir)
    if (git.ok) {
      process.stderr.write(`  ✓ git initialized${git.reason ? ` (${git.reason})` : ''}\n`)
    } else {
      process.stderr.write(
        `  ! git init skipped — ${git.reason ?? 'git not available'}. Run \`git init && git add . && git commit -m "Initial"\` manually.\n`,
      )
    }
    void filesCopied // suppress unused — kept for future telemetry
  }

  printNextStepBox(result.nextStep)

  return 0
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      // Suffixed code form (#34) so `bun gaia explain E1099` resolves directly.
      process.stderr.write(`[E1099_INTERNAL_CREATE] internal error: ${(err as Error).message}\n`)
      process.exit(70) // EX_SOFTWARE
    })
}
