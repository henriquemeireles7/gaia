// .claude/skills/w-review/heuristics/check-ai-trace-tags.ts — observability/ai-trace-tags.
//
// The Anthropic adapter must emit a span on every complete()/stream()
// with required tags: model, tokens.in, tokens.out, tokens.cache,
// latency_ms, cost_usd, tool_use_count, error_class.
//
// We approximate by scanning packages/adapters/anthropic.ts for span +
// the required tag names.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const CANDIDATES = [
  'packages/adapters/anthropic.ts',
  'packages/adapters/ai/anthropic.ts',
  'packages/adapters/llm.ts',
  'packages/adapters/ai.ts',
] as const

const REQUIRED = ['model', 'tokens', 'latency', 'cost', 'tool_use_count', 'error_class'] as const

const found = CANDIDATES.find((rel) => existsSync(join(ROOT, rel)))
if (!found) {
  console.log('ai-trace-tags — no AI adapter file found at known paths; skipping')
  process.exit(0)
}

const text = readFileSync(join(ROOT, found), 'utf-8')

const hasSpan = /\b(?:tracer\.startSpan|trace\.span|otel\.span|withSpan)\b/.test(text)
const missingTags = REQUIRED.filter((t) => !new RegExp(`\\b${t}\\b`).test(text))

if (!hasSpan) {
  console.error(`ai-trace-tags — ${found} does not appear to start an OpenTelemetry span`)
  process.exit(1)
}

if (missingTags.length > 0) {
  console.error(`ai-trace-tags — ${found} missing tags: ${missingTags.join(', ')}`)
  console.error('See .gaia/reference/observability.md.')
  process.exit(1)
}

console.log(`ai-trace-tags — ${found}: span + all required tags present.`)
process.exit(0)
