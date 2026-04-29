// .gaia/rules/checks/check-rules-shards.ts — shard-coverage drift check.
//
// Three invariants enforced here:
//
//   1. Path == skill. Every shard at .gaia/rules/skills/<prefix>-X.ts or
//      .gaia/rules/folders/A/B.ts exports `const skill` equal to its path
//      identifier ('<prefix>-X' or 'A/B'), and every rule in the shard
//      declares the same `skill`. ERROR on mismatch — drift here breaks
//      rulesForSkill / enforcedSkills semantics.
//
//   2. Folder coverage. Every fractal CLAUDE.md folder under apps/ or
//      packages/ has a corresponding .gaia/rules/folders/<path>.ts shard.
//      WARN if missing — having a CLAUDE.md without rules is debt.
//
//   3. Skill coverage. Every Gaia skill (.claude/skills/{h,w,a}-*) has a
//      corresponding .gaia/rules/skills/<name>.ts shard. WARN if missing.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Glob } from 'bun'

type Severity = 'error' | 'warn'
type Finding = { severity: Severity; message: string }
const findings: Finding[] = []

const cwd = process.cwd()

type ShardModule = {
  skill?: unknown
  [key: string]: unknown
}

async function loadShard(file: string): Promise<ShardModule> {
  return (await import(join(cwd, file))) as ShardModule
}

async function checkShard(file: string, root: 'skills' | 'folders'): Promise<void> {
  const expected = file.replace(`.gaia/rules/${root}/`, '').replace(/\.ts$/, '')

  const mod = await loadShard(file)
  if (typeof mod.skill !== 'string') {
    findings.push({ severity: 'error', message: `${file}: missing \`export const skill\`` })
    return
  }
  if (mod.skill !== expected) {
    findings.push({
      severity: 'error',
      message: `${file}: exports skill='${mod.skill}', expected '${expected}' (path identifier)`,
    })
    return
  }

  const arrEntry = Object.entries(mod).find(([k, v]) => k.endsWith('Rules') && Array.isArray(v))
  if (!arrEntry) {
    findings.push({
      severity: 'error',
      message: `${file}: no exported \`...Rules\` array — shard contributes nothing`,
    })
    return
  }
  const arr = arrEntry[1] as ReadonlyArray<{ skill: string; id: string }>
  if (arr.length === 0) {
    findings.push({
      severity: 'warn',
      message: `${file}: shard is empty — remove it or add at least one rule`,
    })
  }
  for (const r of arr) {
    if (r.skill !== expected) {
      findings.push({
        severity: 'error',
        message: `${file}: rule '${r.id}' has skill='${r.skill}', expected '${expected}'`,
      })
    }
  }
}

// Invariant 1 — path == skill, walk every shard.
for await (const file of new Glob('.gaia/rules/skills/*.ts').scan({ cwd })) {
  await checkShard(file, 'skills')
}
for await (const file of new Glob('.gaia/rules/folders/**/*.ts').scan({ cwd })) {
  await checkShard(file, 'folders')
}

// Invariant 2 — every fractal CLAUDE.md folder under apps/ or packages/
// has a folders/<path>.ts shard. Skip cross-cutting CLAUDE.mds (root,
// packages/, .gaia/, .gaia/initiatives/, etc.) — those don't own rules.
const FOLDER_SCOPES = ['apps', 'packages']
for (const scope of FOLDER_SCOPES) {
  for await (const file of new Glob(`${scope}/*/CLAUDE.md`).scan({ cwd })) {
    const dir = file.replace(/\/CLAUDE\.md$/, '')
    const expected = `.gaia/rules/folders/${dir}.ts`
    if (!existsSync(join(cwd, expected))) {
      findings.push({
        severity: 'warn',
        message: `${dir}/CLAUDE.md has no rule shard at ${expected}`,
      })
    }
  }
}

// Invariant 3 — every Gaia skill (.claude/skills/{h,w,a}-*) has a shard.
for await (const file of new Glob('.claude/skills/[hwa]-*/SKILL.md').scan({ cwd })) {
  const name = file.split('/')[2]
  if (!name) continue
  const expected = `.gaia/rules/skills/${name}.ts`
  if (!existsSync(join(cwd, expected))) {
    findings.push({
      severity: 'warn',
      message: `.claude/skills/${name}/SKILL.md has no rule shard at ${expected}`,
    })
  }
}

// Report.
const errors = findings.filter((f) => f.severity === 'error')
const warns = findings.filter((f) => f.severity === 'warn')

console.error('rules-shards — findings:')
if (findings.length === 0) {
  console.error('  (clean)')
} else {
  for (const f of findings) {
    console.error(`  [${f.severity.toUpperCase()}] ${f.message}`)
  }
}

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s). Fix shard membership before commit.`)
  process.exit(1)
}
if (warns.length > 0) {
  console.error(`\n${warns.length} warning(s). Skills/folders without rules are debt.`)
}
