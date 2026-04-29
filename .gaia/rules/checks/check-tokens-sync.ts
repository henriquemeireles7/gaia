// .gaia/rules/checks/check-tokens-sync.ts — fail if packages/ui/styles.css drifts
// from what scripts/generate-tokens-css.ts would produce now.
//
// Enforces the rule `tokens/single-source` in .gaia/rules/index.ts:
// tokens.ts is authoritative; the CSS file is a generated artifact and
// must not be hand-edited.
//
// Run as part of `bun run check` (see package.json scripts.check:tokens).
// To regenerate: `bun scripts/generate-tokens-css.ts`.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildFormattedCSS } from '../../../scripts/generate-tokens-css'

const target = join(process.cwd(), 'packages/ui/styles.css')
const onDisk = readFileSync(target, 'utf-8')
const expected = buildFormattedCSS()

if (onDisk !== expected) {
  console.error('packages/ui/styles.css is out of sync with packages/ui/tokens.ts.')
  console.error('Run `bun scripts/generate-tokens-css.ts` and commit the result.')
  process.exit(1)
}

console.error('tokens → CSS: in sync.')
