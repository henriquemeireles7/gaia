// scripts/check-hook-determinism.ts — methodology/hooks-deterministic.
//
// Hooks must run sub-100ms with no LLM calls. Block any hook source
// importing fetch-y AI SDKs or making outbound API calls.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const FORBIDDEN_IMPORTS = [
  '@anthropic-ai/sdk',
  'openai',
  '@google/generative-ai',
  'cohere-ai',
  'groq-sdk',
  'replicate',
] as const

type Finding = { file: string; line: number; reason: string }
const findings: Finding[] = []

for await (const file of new Glob('.claude/hooks/**/*.ts').scan({ cwd: process.cwd() })) {
  const text = readFileSync(file, 'utf-8')
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const pkg of FORBIDDEN_IMPORTS) {
      if (line.includes(`from '${pkg}'`) || line.includes(`from "${pkg}"`)) {
        findings.push({
          file,
          line: i + 1,
          reason: `imports ${pkg} (LLM SDK in hook)`,
        })
      }
    }
    if (/\bfetch\s*\(\s*['"`]https?:/.test(line)) {
      findings.push({
        file,
        line: i + 1,
        reason: 'outbound HTTP fetch in hook',
      })
    }
  }
}

if (findings.length > 0) {
  console.error('hook-determinism — findings:')
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.reason}`)
  }
  console.error(
    '\nHooks are deterministic and fast (<100ms). Move judgment to skills (CLAUDE.md or /review).',
  )
  process.exit(1)
}

process.exit(0)
