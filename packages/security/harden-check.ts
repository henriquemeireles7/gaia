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

// 1. process.env outside packages/config/env.ts
for (const f of codeFiles) {
  if (f === envFile) continue
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
