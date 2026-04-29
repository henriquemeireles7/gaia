// .gaia/rules/checks/check-reference-voice.ts — references/voice-consulted + references/voice-imperative.
//
// Reference files speak in the imperative present tense — they are the
// constitution, not a tutorial. Hedge words ("tend to", "usually", "you
// might want to", "consider", "perhaps") soften principles into
// suggestions. Tutorial verbs ("we'll see", "let's", "you'll learn")
// belong in dx.md / README, not in references.
//
// Exit 0 with no findings, 1 with errors. Hedge-word hits are errors;
// tutorial-voice hits are warnings (advisory).

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

type Finding = {
  file: string
  line: number
  rule: string
  match: string
  severity: 'error' | 'warn'
}
const findings: Finding[] = []

// Domain references that intentionally narrate (meta files). Skip them.
const VOICE_EXEMPT = new Set([
  '.gaia/reference/ax.md',
  '.gaia/reference/dx.md',
  '.gaia/reference/voice.md',
  '.gaia/reference/workflow.md',
  '.gaia/reference/harness.md',
  '.gaia/reference/methodology.md',
  '.gaia/reference/references.md',
  '.gaia/reference/skills.md',
])

const HEDGE_WORDS =
  /\b(tend to|usually|sometimes|you might want to|consider (?:if|whether)|perhaps|maybe|in general|generally speaking|typically|often|might be)\b/i

const TUTORIAL_VOICE =
  /\b(we'?ll|let'?s|you'?ll learn|in this section|as we'?ve seen|now let'?s)\b/i

for await (const file of new Glob('.gaia/reference/**/*.md').scan({ cwd: process.cwd() })) {
  if (VOICE_EXEMPT.has(file)) continue
  const text = readFileSync(file, 'utf-8')
  const lines = text.split('\n')
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.startsWith('```')) inFence = !inFence
    if (inFence) continue
    if (/^\s*<!--/.test(line)) continue

    const hedge = line.match(HEDGE_WORDS)
    if (hedge) {
      findings.push({
        file,
        line: i + 1,
        rule: 'references/voice-consulted',
        match: hedge[0],
        severity: 'error',
      })
    }
    const tutorial = line.match(TUTORIAL_VOICE)
    if (tutorial) {
      findings.push({
        file,
        line: i + 1,
        rule: 'references/voice-imperative',
        match: tutorial[0],
        severity: 'warn',
      })
    }
  }
}

const errors = findings.filter((f) => f.severity === 'error')

if (findings.length > 0) {
  console.error('reference-voice — findings:')
  for (const f of findings) {
    const tag = f.severity === 'error' ? 'ERROR' : 'WARN'
    console.error(`  [${tag}] ${f.file}:${f.line}  [${f.rule}]  "${f.match}"`)
  }
  console.error(
    '\nReferences are imperative — state the rule, not the soft suggestion. Move tutorial-voice copy to dx.md or README.',
  )
}

process.exit(errors.length > 0 ? 1 : 0)
