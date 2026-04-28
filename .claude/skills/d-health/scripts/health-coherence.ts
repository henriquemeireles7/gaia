/**
 * Cross-references the "Seven Files" to find coherence gaps.
 * Reads files as TEXT (readFileSync), never imports from them.
 *
 * Usage: bun .claude/skills/d-health/scripts/health-coherence.ts
 */
import { type Finding, getRepoRoot, outputJson, readFileSafe, rel, walkDir } from './utils'

type CoherenceSummary = { total_entities: number; coherent: number }
type TableInfo = { sqlName: string; exportName: string }

const ROOT = getRepoRoot()
const findings: Finding[] = []
const scriptErrors: string[] = []
let coherent = 0
let totalEntities = 0

function gap(file: string, category: string, message: string) {
  findings.push({ file, line: 0, severity: 'low', category, message } as Finding)
}
function gapHigh(file: string, category: string, message: string) {
  findings.push({ file, line: 0, severity: 'high', category, message } as Finding)
}
function entity(ok: boolean, file: string, category: string, message: string) {
  totalEntities++
  if (ok) {
    coherent++
  } else {
    gap(file, category, message)
  }
}
function entityHigh(ok: boolean, file: string, category: string, message: string) {
  totalEntities++
  if (ok) {
    coherent++
  } else {
    gapHigh(file, category, message)
  }
}

// ─── File discovery ──────────────────────────────────────────────────────────
const tsFiles = walkDir(ROOT, ['.ts', '.tsx']).filter(
  (f) => !f.endsWith('.test.ts') && !f.endsWith('.d.ts') && !f.includes('/scripts/'),
)
const featureFiles = tsFiles.filter((f) => f.includes('features/'))
const featureRouteFiles = featureFiles.filter((f) => f.includes('route'))

// ─── Read Seven Files ────────────────────────────────────────────────────────
const envContent = readFileSafe(`${ROOT}/platform/env.ts`)
const errorsContent = readFileSafe(`${ROOT}/platform/errors.ts`)
const schemaContent = readFileSafe(`${ROOT}/platform/db/schema.ts`)
const routesContent = readFileSafe(`${ROOT}/platform/server/routes.ts`)
const responsesContent = readFileSafe(`${ROOT}/platform/server/responses.ts`)

// ─── Entity extraction (simple regex, no TS parser) ──────────────────────────
function extractTables(c: string | null): TableInfo[] {
  if (!c) return []
  return [...c.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\(\s*['"]([^'"]+)['"]/g)].map((m) => ({
    exportName: m[1]!,
    sqlName: m[2]!,
  }))
}
function extractErrorCodes(c: string | null): string[] {
  if (!c) return []
  return [...c.matchAll(/^\s+([A-Z][A-Z0-9_]+)\s*:\s*\{/gm)].map((m) => m[1]!)
}
function extractEnvVars(c: string | null): string[] {
  if (!c) return []
  return [...c.matchAll(/^\s+([A-Z][A-Z0-9_]+)\s*:\s*z\./gm)].map((m) => m[1]!)
}
function extractResponseHelpers(c: string | null): string[] {
  if (!c) return []
  return [...c.matchAll(/export\s+function\s+(\w+)/g)].map((m) => m[1]!)
}
function extractRouteMounts(c: string | null): { path: string; importName: string }[] {
  if (!c) return []
  return [...c.matchAll(/\.route\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/g)].map((m) => ({
    path: m[1]!,
    importName: m[2]!,
  }))
}

const tables = extractTables(schemaContent)
const errorCodes = extractErrorCodes(errorsContent)
const envVars = extractEnvVars(envContent)
const responseHelpers = extractResponseHelpers(responsesContent)
const routeMounts = extractRouteMounts(routesContent)

// ─── Cached file reader ──────────────────────────────────────────────────────
const cache = new Map<string, string>()
function contentOf(file: string): string {
  let c = cache.get(file)
  if (c === undefined) {
    c = readFileSafe(file) ?? ''
    cache.set(file, c)
  }
  return c
}

const AUTH_TABLES = new Set(['users', 'sessions', 'accounts', 'verifications'])
const IMPLICIT_ENV = new Set(['NODE_ENV', 'PORT', 'DATABASE_URL'])
const schemaRel = rel(`${ROOT}/platform/db/schema.ts`, ROOT)
const errorsRel = rel(`${ROOT}/platform/errors.ts`, ROOT)
const envRel = rel(`${ROOT}/platform/env.ts`, ROOT)

// ─── 1. table -> features (is the table referenced anywhere in features/) ────
for (const t of tables) {
  if (AUTH_TABLES.has(t.sqlName)) continue
  const ok = featureFiles.some((f) => {
    const c = contentOf(f)
    return c.includes(t.exportName) || c.includes(t.sqlName)
  })
  entity(
    ok,
    schemaRel,
    'table_no_route',
    `Table "${t.sqlName}" (${t.exportName}) defined but never referenced in features/`,
  )
}

// ─── 2. table -> error (lookup tables need *_NOT_FOUND) ──────────────────────
for (const t of tables) {
  if (AUTH_TABLES.has(t.sqlName)) continue
  const upper = t.sqlName.toUpperCase()
  const singular = upper.replace(/_?S$/, '')
  const ok = errorCodes.some(
    (code) =>
      code === `${upper}_NOT_FOUND` ||
      code === `${singular}_NOT_FOUND` ||
      (code.includes(singular) && code.endsWith('_NOT_FOUND')),
  )
  entity(
    ok,
    errorsRel,
    'table_no_error',
    `Table "${t.sqlName}" has no corresponding *_NOT_FOUND error code`,
  )
}

// ─── 3. route -> error (handlers should use throwError) ──────────────────────
for (const f of featureRouteFiles) {
  const c = contentOf(f)
  if (!/\.(get|post|put|patch|delete)\s*\(/.test(c)) {
    totalEntities++
    coherent++
    continue
  }
  entityHigh(
    c.includes('throwError'),
    rel(f, ROOT),
    'route_no_error',
    'Route handler does not use throwError() — errors may be ad-hoc',
  )
}

// ─── 4. route -> response (use helpers, not raw c.json) ──────────────────────
for (const f of featureRouteFiles) {
  const c = contentOf(f)
  if (!/\.(get|post|put|patch|delete)\s*\(/.test(c)) {
    totalEntities++
    coherent++
    continue
  }
  const ok =
    responseHelpers.some((h) => c.includes(h)) || c.includes('webhook') || c.includes('c.html')
  entityHigh(
    ok,
    rel(f, ROOT),
    'route_no_response',
    `Route handler does not use response helpers (${responseHelpers.join(', ')})`,
  )
}

// ─── 5. route -> auth (API routes need requireAuth) ──────────────────────────
const SKIP_AUTH = ['auth', 'webhook', 'health', 'checkout/flow']
for (const mount of routeMounts) {
  if (!mount.path.startsWith('/api/') || SKIP_AUTH.some((s) => mount.path.includes(s))) continue
  totalEntities++
  const routeFile = featureRouteFiles.find(
    (f) =>
      contentOf(f).includes(mount.importName) || f.includes(mount.importName.replace('Routes', '')),
  )
  if (!routeFile) {
    coherent++
    continue
  }
  const c = contentOf(routeFile)
  const ok = c.includes('requireAuth') || c.includes('requireRole') || c.includes('auth')
  if (ok) coherent++
  else gapHigh(rel(routeFile, ROOT), 'route_no_auth', `API route "${mount.path}" has no auth check`)
}

// ─── 6. env -> usage (each var referenced outside env.ts) ────────────────────
for (const v of envVars) {
  if (IMPLICIT_ENV.has(v)) {
    totalEntities++
    coherent++
    continue
  }
  const ok = tsFiles
    .filter((f) => !f.endsWith('platform/env.ts'))
    .some((f) => contentOf(f).includes(v))
  entity(ok, envRel, 'env_unused', `Env var "${v}" defined but never referenced outside env.ts`)
}

// ─── 7. error -> usage (each code thrown somewhere) ──────────────────────────
for (const code of errorCodes) {
  const ok = tsFiles
    .filter((f) => !f.endsWith('platform/errors.ts'))
    .some((f) => {
      const c = contentOf(f)
      return c.includes(`'${code}'`) || c.includes(`"${code}"`)
    })
  entity(ok, errorsRel, 'error_unused', `Error code "${code}" defined but never referenced`)
}

// ─── Output ──────────────────────────────────────────────────────────────────
outputJson<CoherenceSummary>({
  findings,
  errors: scriptErrors,
  summary: { total_entities: totalEntities, coherent },
})
process.exit(0)
