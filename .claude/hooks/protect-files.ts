// .claude/hooks/protect-files.ts
// Two layers of protection:
//   1. Path-pattern blocks (.env, .git/, secrets/, *.pem, *.key, bun.lock).
//   2. Exact-path blocks from .gaia/rules.ts (vision §H9 — one policy, many
//      surfaces). The harness/permissions-immutable rule keeps permissions.md
//      and delegation.md out of skill/hook reach.

import { findRule } from '../../.gaia/rules'

const input = (await Bun.stdin.json()) as {
  tool_input?: { file_path?: string; path?: string }
}
const file: string = input.tool_input?.file_path ?? input.tool_input?.path ?? ''

// Layer 1: path-pattern protection.
const protectedPatterns: { pattern: RegExp; name: string }[] = [
  { pattern: /\.env(?!\.example)/, name: '.env files' },
  { pattern: /\.git\//, name: '.git directory' },
  { pattern: /bun\.lock/, name: 'bun.lock' },
  { pattern: /\.pem$/, name: 'PEM certificates' },
  { pattern: /\.key$/, name: 'private keys' },
  { pattern: /secrets\//, name: 'secrets directory' },
]

for (const { pattern, name } of protectedPatterns) {
  if (pattern.test(file)) {
    console.error(`Blocked: '${file}' is protected (${name}). Explain why this edit is necessary.`)
    process.exit(2)
  }
}

// Layer 2: exact-path blocks from rules.ts (harness/permissions-immutable).
const rule = findRule('harness/permissions-immutable')
for (const path of rule?.blocked ?? []) {
  if (file.endsWith(path)) {
    console.error(
      `Blocked: '${file}' cannot be modified by skills or hooks (rule harness/permissions-immutable).`,
      `\nVision §H8 — permissions are a product decision; only humans edit permissions.md and delegation.md.`,
    )
    process.exit(2)
  }
}

process.exit(0)
