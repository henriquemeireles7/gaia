// packages/security/harden-check.ts — mechanical security validations.
//
// Runs as part of `bun run check`. Sub-second execution, no LLM. Errors
// fail the commit; warnings are advisory.
//
// Usage: bun packages/security/harden-check.ts [--quiet] [--json]

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const QUIET = args.includes('--quiet')
const JSON_OUTPUT = args.includes('--json')

type Severity = 'error' | 'warn'
type Finding = { file: string; line: number; severity: Severity; rule: string; message: string }
const findings: Finding[] = []

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  '.gaia',
  '.context',
  'dist',
  '.vinxi',
  '.output',
])

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...walk(full, exts))
      else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
    }
  } catch {
    /* missing dir */
  }
  return out
}

function rel(p: string): string {
  return relative(ROOT, p)
}

function scan(
  file: string,
  checks: { pattern: RegExp; rule: string; message: string; severity: Severity }[],
) {
  const content = readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.includes('harden:ignore')) continue
    for (const c of checks) {
      if (c.pattern.test(line)) {
        findings.push({
          file: rel(file),
          line: i + 1,
          severity: c.severity,
          rule: c.rule,
          message: c.message,
        })
      }
    }
  }
}

const tsFiles = walk(ROOT, ['.ts', '.tsx']).filter(
  (f) =>
    !f.endsWith('.d.ts') &&
    // Self-exclude: harden-check.ts contains regex patterns that match its own rules.
    !f.endsWith('packages/security/harden-check.ts'),
)
const codeFiles = tsFiles.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
const envFile = `${ROOT}/packages/config/env.ts`

// 1. process.env outside packages/config/env.ts. Tooling that runs on the
//    developer's machine (scripts/, cli/) or inside the agent harness
//    (.claude/) reads process.env directly — these aren't runtime API code
//    and the standalone-publishable cli package has no @gaia/* imports by
//    design (per cli/CLAUDE.md).
for (const f of codeFiles) {
  if (f === envFile) continue
  if (f.includes(`${ROOT}/scripts/`) || f.includes(`${ROOT}/cli/`) || f.includes('/.claude/')) {
    continue
  }
  scan(f, [
    {
      pattern: /\bprocess\.env\b/,
      rule: 'no-raw-env',
      message: 'Use env from packages/config/env.ts instead of process.env',
      severity: 'error',
    },
  ])
}

// 2. Hardcoded secrets
for (const f of tsFiles) {
  scan(f, [
    {
      pattern: /['"`](sk_live_|sk-ant-api|whsec_|rk_live_|polar_at_live_)[a-zA-Z0-9]{10,}['"`]/,
      rule: 'no-hardcoded-secrets',
      message: 'Hardcoded production secret detected — move to env.ts',
      severity: 'error',
    },
  ])
}

// 3. eval / new Function
for (const f of codeFiles) {
  scan(f, [
    {
      pattern: /\beval\s*\(/,
      rule: 'no-eval',
      message: 'eval() is a security risk',
      severity: 'error',
    },
    {
      pattern: /\bnew\s+Function\s*\(/,
      rule: 'no-new-function',
      message: 'new Function() is equivalent to eval',
      severity: 'error',
    },
  ])
}

// 4. SQL string interpolation
for (const f of codeFiles) {
  scan(f, [
    {
      pattern: /`[^`]*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^`]*\$\{/i,
      rule: 'no-sql-interpolation',
      message: 'SQL with template interpolation — use Drizzle query builder',
      severity: 'error',
    },
  ])
}

// 5. Logging sensitive variables
for (const f of codeFiles) {
  scan(f, [
    {
      pattern:
        /console\.(log|info|debug)\s*\([^)]*\b(password|secret|token|apiKey|api_key|auth_token|private_key)\b/i,
      rule: 'no-log-secrets',
      message: 'Sensitive variable in console call — remove or redact',
      severity: 'error',
    },
  ])
}

// 6. as any (advisory)
for (const f of codeFiles) {
  scan(f, [
    {
      pattern: /\bas\s+any\b/,
      rule: 'no-as-any',
      message: 'Avoid `as any` — use proper types or TypeBox inference',
      severity: 'warn',
    },
  ])
}

// 7. backend/no-hono-imports — Hono is the legacy stack; new code does not import from it.
for (const f of codeFiles) {
  scan(f, [
    {
      pattern: /from\s+['"]hono['"]|from\s+['"]@hono\//,
      rule: 'backend/no-hono-imports',
      message: 'Hono is the legacy stack — use Elysia. Remove the import.',
      severity: 'error',
    },
  ])
}

// 8. backend/no-elysia-in-adapters — adapters are framework-independent.
for (const f of codeFiles) {
  if (!f.includes('/packages/adapters/')) continue
  scan(f, [
    {
      pattern: /from\s+['"]elysia['"]|from\s+['"]@elysiajs\//,
      rule: 'backend/no-elysia-in-adapters',
      message: 'Adapters must not import from elysia/@elysiajs — keep them framework-independent.',
      severity: 'error',
    },
  ])
}

// 9. testing/no-test-only — `it.only`/`describe.only`/`test.only` hide skipped tests.
for (const f of tsFiles) {
  if (!f.endsWith('.test.ts') && !f.endsWith('.test.tsx')) continue
  scan(f, [
    {
      pattern: /\b(it|describe|test)\.only\s*\(/,
      rule: 'testing/no-test-only',
      message: 'Remove `.only` before committing — focused tests hide everything else as skipped.',
      severity: 'error',
    },
  ])
}

// 10. database/no-raw-pg-bypass — direct postgres driver only allowed in packages/db/
//    and migration/seed scripts (which legitimately need their own pool config).
for (const f of codeFiles) {
  if (
    f.includes('/packages/db/') ||
    f.includes('/apps/api/scripts/') ||
    f.endsWith('drizzle.config.ts')
  ) {
    continue
  }
  scan(f, [
    {
      pattern: /from\s+['"]postgres['"]/,
      rule: 'database/no-raw-pg-bypass',
      message:
        'Direct `postgres` import is restricted to packages/db/ and apps/api/scripts/. Import { db } from @gaia/db instead.',
      severity: 'error',
    },
  ])
}

// 11. frontend/no-direct-fetch-in-routes — routes use the Eden Treaty client.
for (const f of codeFiles) {
  if (!f.includes('/apps/web/src/routes/')) continue
  scan(f, [
    {
      pattern: /\bfetch\s*\(/,
      rule: 'frontend/no-direct-fetch-in-routes',
      message:
        'apps/web/src/routes must not call fetch() directly — use the typed `api` from ~/lib/api.',
      severity: 'error',
    },
  ])
}

// 12. frontend/no-vendor-sdk-on-client — vendor SDKs stay server-side.
const FRONTEND_VENDOR_BAN =
  /from\s+['"](@polar-sh\/sdk|@anthropic-ai\/sdk|stripe|resend|posthog-node|@aws-sdk\/client-s3)['"]/
for (const f of codeFiles) {
  if (!f.includes('/apps/web/src/')) continue
  scan(f, [
    {
      pattern: FRONTEND_VENDOR_BAN,
      rule: 'frontend/no-vendor-sdk-on-client',
      message:
        'apps/web must not import vendor SDKs — call the API via Eden Treaty so secrets stay server-side.',
      severity: 'error',
    },
  ])
}

// 13. code/named-errors-no-bare-throw — feature/route code throws AppError, not Error.
for (const f of codeFiles) {
  if (!f.includes('/apps/api/features/') && !f.includes('/apps/web/src/')) continue
  if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue
  scan(f, [
    {
      pattern: /\bthrow\s+new\s+Error\s*\(/,
      rule: 'code/named-errors-no-bare-throw',
      message:
        "Use `throw new AppError('CODE', details?)` from @gaia/errors — bare Error escapes the catalog.",
      severity: 'error',
    },
  ])
}

// 14. errors/no-leak-secrets-in-messages — error strings must not interpolate secrets.
for (const f of codeFiles) {
  scan(f, [
    {
      pattern:
        /(?:new\s+(?:Error|AppError|ProviderError)|throwError)\s*\([^)]*\$\{[^}]*\b(password|secret|token|apiKey|api_key|auth_token|private_key)\b/i,
      rule: 'errors/no-leak-secrets-in-messages',
      message:
        'Error message interpolates a sensitive identifier — never put secrets in user-visible messages.',
      severity: 'error',
    },
  ])
}

// 15. observability/no-pii-in-logs — log payloads must not include unredacted PII.
for (const f of codeFiles) {
  scan(f, [
    {
      pattern:
        /\b(?:log|logger)\.(?:info|warn|error|debug)\s*\([^)]*\b(password|secret|token|api_key|email)\s*:/i,
      rule: 'observability/no-pii-in-logs',
      message:
        'Logger payload includes a PII/secret key literally — redact or omit before emitting.',
      severity: 'error',
    },
  ])
}

// 16. onboarding/no-tour-modals — empty states are the onboarding surface, not modal tours.
const TOUR_LIB_BAN =
  /from\s+['"](shepherd\.js|intro\.js|react-joyride|driver\.js|@reactour\/tour|intro-js)(\/[^'"]*)?['"]/
for (const f of codeFiles) {
  if (!f.includes('/apps/web/')) continue
  scan(f, [
    {
      pattern: TOUR_LIB_BAN,
      rule: 'onboarding/no-tour-modals',
      message:
        'No modal-tour libraries — onboarding lives in empty states and progressive disclosure. See .gaia/reference/product/onboarding.md.',
      severity: 'error',
    },
  ])
}

// 17. commands/use-bun-not-npm — Bun is the package manager.
for (const f of tsFiles) {
  scan(f, [
    {
      pattern: /\bnpm\s+(install|run|i|exec)\b/,
      rule: 'commands/use-bun-not-npm',
      message:
        'Use Bun: `bun install` / `bun run X` / `bunx Y`. npm/pnpm/yarn invocations break the lockfile.',
      severity: 'warn',
    },
  ])
}

const errors = findings.filter((f) => f.severity === 'error')
const warnings = findings.filter((f) => f.severity === 'warn')

if (JSON_OUTPUT) {
  console.log(
    JSON.stringify({
      pass: errors.length === 0,
      errors: errors.length,
      warnings: warnings.length,
      findings,
    }),
  )
} else if (!QUIET && findings.length > 0) {
  console.log('\n  Hardening Check Results')
  console.log('  ═══════════════════════\n')
  for (const f of findings) {
    const icon = f.severity === 'error' ? '\x1b[31mERROR\x1b[0m' : '\x1b[33mWARN\x1b[0m'
    console.log(`  ${icon}  ${f.file}:${f.line}`)
    console.log(`         [${f.rule}] ${f.message}\n`)
  }
  console.log(`  Summary: ${errors.length} error(s), ${warnings.length} warning(s)\n`)
} else if (!QUIET) {
  console.log('  Hardening check passed — no issues found.\n')
}

process.exit(errors.length > 0 ? 1 : 0)
