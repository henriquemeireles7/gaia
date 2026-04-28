// Re-inject critical project rules after context compaction
// These reminders prevent Claude from drifting to wrong tools/patterns in long sessions

// CUSTOMIZE: Replace with your project's critical reminders
const reminders = [
  // Stack choices (what to use, what NOT to use)
  // 'Stack: Bun (not npm/yarn), Biome (not ESLint/Prettier).',

  // Key commands
  // 'Run `bun run check` before every commit.',

  // Architecture reminders
  'Every code folder has a nested CLAUDE.md — Claude Code auto-loads it.',
  'Universal reference files live in decisions/.',
  'If you find contradictions between files: STOP, point them out, ask the user, and fix immediately.',

  // Pattern reminders
  // 'Use throwError() — never return ad-hoc errors.',
  // 'Tests colocated: foo.ts -> foo.test.ts in the same folder.',
]

console.log(reminders.join('\n'))
process.exit(0)
