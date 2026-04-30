// scripts/check-env-example-parity.ts — `.env.example` ↔ EnvSchema parity (AD-AP-21).
//
// Eng review HIGH-14: drift between packages/config/env.ts and .env.example
// is the most common newcomer footgun. This script fails CI when:
//   - EnvSchema has a REQUIRED key absent from .env.example (newcomer hits "Invalid env" with no template)
//   - .env.example has a key NOT in EnvSchema (rotted entry)
//
// The script is intentionally pragmatic — parses both files as text, no AST.
// Comment-prefixed lines (`# KEY=...`) in .env.example count as declared
// (they're documented optional keys).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ENV_EXAMPLE = join(ROOT, '.env.example')
const ENV_TS = join(ROOT, 'packages/config/env.ts')

if (!existsSync(ENV_EXAMPLE)) {
  console.error('No .env.example at repo root.')
  process.exit(1)
}
if (!existsSync(ENV_TS)) {
  console.error('No packages/config/env.ts found.')
  process.exit(1)
}

const exampleText = readFileSync(ENV_EXAMPLE, 'utf-8')
const envTsText = readFileSync(ENV_TS, 'utf-8')

// Keys declared in .env.example (uncommented or comment-uncommented form).
const exampleKeys = new Set<string>()
for (const line of exampleText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed) continue
  const match = trimmed.match(/^#?\s*([A-Z][A-Z0-9_]+)\s*=/)
  if (match?.[1]) exampleKeys.add(match[1])
}

// Required vs optional keys from EnvSchema. We treat any key wrapped in
// Type.Optional(...) as optional; everything else as required. The schema
// uses 2-space-indented `KEY: Type.X(...),` lines — pragmatic but robust:
// match the key declaration line and check whether `Type.Optional(` is the
// first Type wrapper.
const requiredKeys = new Set<string>()
const optionalKeys = new Set<string>()

// Match `  KEY: Type.X` (2-space indent + uppercase key + Type wrapper start).
const KEY_LINE = /^\s{2}([A-Z][A-Z0-9_]+)\s*:\s*(Type\.\w+)/gm

let m: RegExpExecArray | null
while ((m = KEY_LINE.exec(envTsText)) !== null) {
  const name = m[1]
  const wrapper = m[2]
  if (!name || !wrapper) continue
  if (wrapper === 'Type.Optional') {
    optionalKeys.add(name)
  } else {
    requiredKeys.add(name)
  }
}

const findings: string[] = []

// 1. Required keys missing from .env.example.
for (const key of requiredKeys) {
  if (!exampleKeys.has(key)) {
    findings.push(`[ERROR] EnvSchema requires "${key}" but .env.example has no entry.`)
  }
}

// 2. Optional keys missing from .env.example (warn — not a hard failure).
const missingOptional: string[] = []
for (const key of optionalKeys) {
  if (!exampleKeys.has(key)) missingOptional.push(key)
}

// 3. .env.example keys not present in either set (rotted entry).
const knownKeys = new Set([...requiredKeys, ...optionalKeys])
for (const key of exampleKeys) {
  if (!knownKeys.has(key)) {
    findings.push(`[ERROR] .env.example declares "${key}" but EnvSchema has no such key.`)
  }
}

if (findings.length > 0) {
  console.error('env.example parity check failed:')
  for (const finding of findings) console.error(`  ${finding}`)
  if (missingOptional.length > 0) {
    console.error(
      `\n  [warn] optional keys missing from .env.example: ${missingOptional.join(', ')}`,
    )
  }
  console.error('\nKeep packages/config/env.ts and .env.example in sync (AD-AP-21).')
  process.exit(1)
}

if (missingOptional.length > 0) {
  console.warn(
    `env.example parity: ok (warn — optional keys not in .env.example: ${missingOptional.join(', ')})`,
  )
} else {
  console.log(
    `env.example parity: ok (${requiredKeys.size} required + ${optionalKeys.size} optional keys aligned)`,
  )
}
