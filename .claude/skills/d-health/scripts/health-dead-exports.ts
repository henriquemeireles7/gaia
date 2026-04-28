/**
 * Dead export detector — finds unused exports, error codes, permissions, and env vars.
 * Reads files as TEXT (readFileSync + regex), never imports from the application.
 * Usage: bun .claude/skills/d-health/scripts/health-dead-exports.ts
 */
import { type Finding, getRepoRoot, outputJson, readFileSafe, rel, walkDir } from './utils'

type DeadExportsSummary = { total: number; dead: number }
type ExportInfo = { name: string; file: string; line: number }

const ROOT = getRepoRoot()
const SCAN_DIRS = ['features', 'platform', 'providers']
const ENTRY_PATTERNS = [/\/index\.ts$/, /Dockerfile/]

// ─── Regex Patterns ──────────────────────────────────────────────────────────

const EXPORT_RE = /^export\s+(?:async\s+)?(?:function|const|class|type|interface|default)\s+(\w+)/gm
const REEXPORT_RE = /^export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gms
const IMPORT_RE = /import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g

// ─── Collect & Cache All TS Files ────────────────────────────────────────────

const allTsFiles: string[] = []
for (const dir of SCAN_DIRS) {
  allTsFiles.push(...walkDir(`${ROOT}/${dir}`, ['.ts', '.tsx']))
}
const sourceFiles = allTsFiles.filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))

const fileContents = new Map<string, string>()
for (const f of allTsFiles) {
  const content = readFileSafe(f)
  if (content) fileContents.set(f, content)
}

// ─── Step 1: Collect All Exports ─────────────────────────────────────────────

const allExports: ExportInfo[] = []

for (const f of sourceFiles) {
  const content = fileContents.get(f)
  if (!content) continue

  for (const match of content.matchAll(EXPORT_RE)) {
    const name = match[1]!
    const line = content.slice(0, match.index).split('\n').length
    allExports.push({ name, file: f, line })
  }

  for (const match of content.matchAll(REEXPORT_RE)) {
    const names = match[1]!.split(',').map((n) => {
      const parts = n.trim().split(/\s+as\s+/)
      return (parts[1] || parts[0])!.trim()
    })
    const line = content.slice(0, match.index).split('\n').length
    for (const name of names) {
      if (name) allExports.push({ name, file: f, line })
    }
  }
}

// ─── Step 2: Collect All Imports ─────────────────────────────────────────────

const importedNames = new Set<string>()

for (const f of allTsFiles) {
  const content = fileContents.get(f)
  if (!content) continue

  for (const match of content.matchAll(IMPORT_RE)) {
    if (match[1]) {
      for (const part of match[1].split(',')) {
        const trimmed = part.trim()
        if (!trimmed) continue
        const asParts = trimmed.split(/\s+as\s+/)
        importedNames.add((asParts[0] || '').trim())
      }
    }
    if (match[2]) importedNames.add(match[2])
  }
}

// ─── Step 3: Diff — Find Dead Exports ────────────────────────────────────────

const findings: Finding[] = []
const scriptErrors: string[] = []

for (const exp of allExports) {
  if (exp.file.endsWith('.test.ts')) continue
  if (ENTRY_PATTERNS.some((p) => p.test(exp.file))) continue
  if (exp.name === 'default') continue
  if (!importedNames.has(exp.name)) {
    findings.push({
      file: rel(exp.file, ROOT),
      line: exp.line,
      severity: 'low',
      category: 'dead_export',
      message: `Export "${exp.name}" is never imported anywhere`,
    })
  }
}

// ─── Step 4a: Dead Error Codes ───────────────────────────────────────────────

const errorsFile = readFileSafe(`${ROOT}/platform/errors.ts`)
if (errorsFile) {
  const errorCodeRe = /^\s+(\w+):\s*\{/gm
  const errorCodes: string[] = []
  for (const match of errorsFile.matchAll(errorCodeRe)) {
    errorCodes.push(match[1]!)
  }
  for (const code of errorCodes) {
    let used = false
    for (const [f, content] of fileContents) {
      if (f.endsWith('platform/errors.ts')) continue
      if (content.includes(`'${code}'`) || content.includes(`"${code}"`)) {
        used = true
        break
      }
    }
    if (!used) {
      const idx = errorsFile.indexOf(`${code}:`)
      const line = idx > -1 ? errorsFile.slice(0, idx).split('\n').length : 1
      findings.push({
        file: 'platform/errors.ts',
        line,
        severity: 'low',
        category: 'dead_error_code',
        message: `Error code "${code}" is never referenced outside errors.ts`,
      })
    }
  }
}

// ─── Step 4b: Dead Permissions ───────────────────────────────────────────────

const permsFile = readFileSafe(`${ROOT}/platform/auth/permissions.ts`)
if (permsFile) {
  const allPerms = new Set<string>()
  const permValueRe = /['"](\w+)['"]/g
  let inPermsObj = false
  for (const line of permsFile.split('\n')) {
    if (line.includes('permissions = {')) inPermsObj = true
    if (inPermsObj) {
      for (const match of line.matchAll(permValueRe)) {
        allPerms.add(match[1]!)
      }
    }
    if (inPermsObj && line.includes('} as const')) inPermsObj = false
  }
  for (const perm of allPerms) {
    let used = false
    for (const [f, content] of fileContents) {
      if (f.endsWith('permissions.ts')) continue
      const hasDirect =
        content.includes(`requirePermission('${perm}')`) ||
        content.includes(`requirePermission("${perm}")`)
      const hasCheck =
        content.includes('hasPermission(') &&
        (content.includes(`'${perm}'`) || content.includes(`"${perm}"`))
      if (hasDirect || hasCheck) {
        used = true
        break
      }
    }
    if (!used) {
      findings.push({
        file: 'platform/auth/permissions.ts',
        line: 1,
        severity: 'low',
        category: 'dead_permission',
        message: `Permission "${perm}" is never checked via requirePermission() or hasPermission()`,
      })
    }
  }
}

// ─── Step 4c: Dead Env Vars ──────────────────────────────────────────────────

const envFile = readFileSafe(`${ROOT}/platform/env.ts`)
if (envFile) {
  const envVarRe = /^\s+(\w+):\s*z\./gm
  const envVars: string[] = []
  for (const match of envFile.matchAll(envVarRe)) {
    envVars.push(match[1]!)
  }
  for (const varName of envVars) {
    let used = false
    for (const [f, content] of fileContents) {
      if (f.endsWith('platform/env.ts')) continue
      if (content.includes(`env.${varName}`) || content.includes(`['${varName}']`)) {
        used = true
        break
      }
    }
    if (!used) {
      const idx = envFile.indexOf(`${varName}:`)
      const line = idx > -1 ? envFile.slice(0, idx).split('\n').length : 1
      findings.push({
        file: 'platform/env.ts',
        line,
        severity: 'low',
        category: 'dead_env_var',
        message: `Env var "${varName}" is never referenced outside env.ts`,
      })
    }
  }
}

// ─── Output ──────────────────────────────────────────────────────────────────

const totalExports = allExports.filter(
  (e) =>
    !e.file.endsWith('.test.ts') &&
    !ENTRY_PATTERNS.some((p) => p.test(e.file)) &&
    e.name !== 'default',
).length

const summary: DeadExportsSummary = { total: totalExports, dead: findings.length }
outputJson<DeadExportsSummary>({ findings, errors: scriptErrors, summary })
process.exit(0)
