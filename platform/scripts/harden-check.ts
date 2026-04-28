/**
 * Mechanical hardening checks — runs without LLM, sub-second execution.
 * Part of `bun run check` pipeline alongside biome + tsc + test.
 *
 * Usage:
 *   bun platform/scripts/harden-check.ts          # check only
 *   bun platform/scripts/harden-check.ts --fix     # auto-fix where possible
 *   bun platform/scripts/harden-check.ts --quiet   # exit code only, no output
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = import.meta.dir.replace('/platform/scripts', '')
const args = process.argv.slice(2)
const _FIX_MODE = args.includes('--fix')
const QUIET = args.includes('--quiet')
const JSON_OUTPUT = args.includes('--json')

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'error' | 'warn'
type Finding = {
  file: string
  line: number
  severity: Severity
  rule: string
  message: string
}

const findings: Finding[] = []

function report(f: Omit<Finding, 'file' | 'line'> & { file: string; line: number }) {
  findings.push(f)
}

// ─── File Discovery ───────────────────────────────────────────────────────────

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (
        entry.name === 'node_modules' ||
        entry.name === '.claude' ||
        entry.name === '.venv' ||
        entry.name === '.context' ||
        entry.name === 'dist' ||
        entry.name === 'mcp_agent_mail' ||
        entry.name === '.git' ||
        entry.name === '.beads'
      )
        continue
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // directory doesn't exist
  }
  return results
}

const tsFiles = walkDir(ROOT, ['.ts', '.tsx']).filter(
  (f) => !f.endsWith('.test.ts') && !f.endsWith('.d.ts') && !f.includes('CLAUDE.md'),
)

const routeFiles = tsFiles.filter(
  (f) => f.includes('features/') && (f.includes('routes.ts') || f.includes('route')),
)

const allCodeFiles = tsFiles.filter(
  (f) =>
    (f.includes('platform/') || f.includes('features/') || f.includes('providers/')) &&
    !f.includes('platform/scripts/'),
)

const uiFiles = walkDir(ROOT, ['.tsx', '.jsx', '.html']).filter((f) => !f.includes('node_modules'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rel(abs: string): string {
  return relative(ROOT, abs)
}

function scanFile(
  filePath: string,
  checks: Array<{ pattern: RegExp; rule: string; message: string; severity: Severity }>,
) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    for (const check of checks) {
      if (check.pattern.test(line) && !line.includes('harden:ignore')) {
        report({
          file: rel(filePath),
          line: i + 1,
          severity: check.severity,
          rule: check.rule,
          message: check.message,
        })
      }
    }
  }
}

// ─── Security & Code Checks ──────────────────────────────────────────────────

// 1. process.env outside platform/env.ts
for (const f of allCodeFiles) {
  if (f.endsWith('platform/env.ts')) continue
  scanFile(f, [
    {
      pattern: /process\.env\b/,
      rule: 'no-raw-env',
      message: 'Use `env` from platform/env.ts instead of process.env',
      severity: 'error',
    },
  ])
}

// 2. Raw c.json() in route files
for (const f of routeFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    // Match c.json( but not inside error handler or comment
    if (/\bc\.json\s*\(/.test(lines[i]!) && !lines[i]?.trim().startsWith('//')) {
      report({
        file: rel(f),
        line: i + 1,
        severity: 'error',
        rule: 'no-raw-json',
        message: 'Use success(), created(), throwError() instead of raw c.json()',
      })
    }
  }
}

// 3. as any in platform/ or features/
for (const f of allCodeFiles) {
  scanFile(f, [
    {
      pattern: /\bas\s+any\b/,
      rule: 'no-as-any',
      message: 'Avoid `as any` — use proper types or Zod inference',
      severity: 'warn',
    },
  ])
}

// 4. SQL injection via template literals
for (const f of allCodeFiles) {
  scanFile(f, [
    {
      pattern: /`[^`]*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^`]*\$\{/i,
      rule: 'no-sql-interpolation',
      message: 'SQL with template literal interpolation — use Drizzle query builder',
      severity: 'error',
    },
  ])
}

// 5. Hardcoded secrets
for (const f of tsFiles) {
  scanFile(f, [
    {
      pattern: /['"`](sk_live_|sk-ant-api|whsec_|rk_live_)[a-zA-Z0-9]{10,}['"`]/,
      rule: 'no-hardcoded-secrets',
      message: 'Hardcoded secret detected — use platform/env.ts',
      severity: 'error',
    },
  ])
}

// 6. Route handlers without zValidator (POST/PUT/PATCH should validate input)
for (const f of routeFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    // Match route definitions that accept body (post, put, patch) without zValidator
    if (
      /\.(post|put|patch)\s*\(/.test(line) &&
      !content.slice(0, content.indexOf(line) + line.length + 200).includes('zValidator')
    ) {
      // More precise: check if zValidator appears as an argument in the same route chain
      const routeBlock = lines.slice(i, Math.min(i + 5, lines.length)).join('\n')
      if (!routeBlock.includes('zValidator') && !routeBlock.includes('webhook')) {
        report({
          file: rel(f),
          line: i + 1,
          severity: 'warn',
          rule: 'require-zvalidator',
          message: 'POST/PUT/PATCH route without zValidator — add Zod input validation',
        })
      }
    }
  }
}

// 7. console.log of sensitive data
for (const f of allCodeFiles) {
  scanFile(f, [
    {
      pattern:
        /console\.(log|info|debug)\s*\([^)]*\b(password|secret|token|apiKey|api_key|auth_token|private_key)\b/i,
      rule: 'no-log-secrets',
      message: 'Logging sensitive variable — remove or redact',
      severity: 'error',
    },
  ])
}

// 8. eval() or new Function()
for (const f of allCodeFiles) {
  scanFile(f, [
    {
      pattern: /\beval\s*\(/,
      rule: 'no-eval',
      message: 'eval() is a security risk — find an alternative',
      severity: 'error',
    },
    {
      pattern: /new\s+Function\s*\(/,
      rule: 'no-new-function',
      message: 'new Function() is equivalent to eval — find an alternative',
      severity: 'error',
    },
  ])
}

// 9. fetch() without timeout
for (const f of allCodeFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (
      /\bfetch\s*\(/.test(lines[i]!) &&
      !lines[i]?.includes('AbortSignal') &&
      !lines[i]?.includes('signal')
    ) {
      // Check next few lines for signal option
      const block = lines.slice(i, Math.min(i + 5, lines.length)).join('\n')
      if (
        !block.includes('signal') &&
        !block.includes('AbortSignal') &&
        !block.includes('timeout')
      ) {
        report({
          file: rel(f),
          line: i + 1,
          severity: 'warn',
          rule: 'fetch-needs-timeout',
          message: 'fetch() without timeout — add AbortSignal.timeout()',
        })
      }
    }
  }
}

// ─── UI/UX Checks (Preact/Tailwind) ──────────────────────────────────────────

for (const f of uiFiles) {
  // dangerouslySetInnerHTML without sanitization
  scanFile(f, [
    {
      pattern: /dangerouslySetInnerHTML/,
      rule: 'no-dangerous-html',
      message: 'dangerouslySetInnerHTML — ensure content is sanitized (DOMPurify or equivalent)',
      severity: 'warn',
    },
  ])

  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // <img> without alt
    if (/<img\b/.test(line)) {
      const tagBlock = lines.slice(i, Math.min(i + 5, lines.length)).join(' ')
      const tagEnd = tagBlock.indexOf('/>')
      const tag = tagEnd > -1 ? tagBlock.slice(0, tagEnd + 2) : tagBlock
      if (!tag.includes('alt=') && !tag.includes('alt =')) {
        report({
          file: rel(f),
          line: i + 1,
          severity: 'warn',
          rule: 'img-needs-alt',
          message:
            '<img> missing alt attribute — add alt="" for decorative or descriptive alt for content',
        })
      }
    }

    // Inline style= instead of Tailwind (skip dynamic width/height for progress bars)
    if (
      /\bstyle\s*=\s*[{"]/.test(line) &&
      f.endsWith('.tsx') &&
      !line.includes('width:') &&
      !line.includes('height:')
    ) {
      report({
        file: rel(f),
        line: i + 1,
        severity: 'warn',
        rule: 'prefer-tailwind',
        message: 'Inline style attribute — use Tailwind classes instead',
      })
    }

    // Arbitrary Tailwind values (text-[17px], w-[123px], etc.)
    if (/\b(text|w|h|p|m|gap|top|left|right|bottom|max-w|min-h)-\[\d+px\]/.test(line)) {
      report({
        file: rel(f),
        line: i + 1,
        severity: 'warn',
        rule: 'no-arbitrary-tailwind',
        message: 'Arbitrary Tailwind value — use design system scale (text-sm, w-4, etc.)',
      })
    }
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

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
} else if (!QUIET && findings.length === 0) {
  console.log('  Hardening check passed — no issues found.\n')
}

// Errors = exit 1 (blocks commit). Warnings = exit 0 (informational).
if (errors.length > 0) {
  process.exit(1)
}

process.exit(0)
