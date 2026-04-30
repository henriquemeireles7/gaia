// .gaia/rules/checks/check-integration-treaty.ts — testing/integration-uses-eden-treaty.
//
// Every *.integration.test.ts file must use Eden Treaty (treaty(app))
// against the live app instance, not raw fetch() or HTTP-level mocks.
// This keeps the integration boundary type-safe.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const failures: string[] = []
for await (const file of new Glob('**/*.integration.test.ts').scan({ cwd: process.cwd() })) {
  if (file.includes('node_modules/')) continue
  const text = readFileSync(file, 'utf-8')
  const usesTreaty = /\btreaty\s*\(/.test(text) || /from\s+['"]@elysiajs\/eden['"]/.test(text)
  if (!usesTreaty) {
    failures.push(`${file}: integration test does not import / call treaty(app)`)
  }
}

if (failures.length > 0) {
  console.error('testing/integration-uses-eden-treaty — failures:')
  for (const f of failures) console.error(`  ${f}`)
  console.error(
    "\nUse `import { treaty } from '@elysiajs/eden'` and call treaty(app) so route types flow.",
  )
  process.exit(1)
}
process.exit(0)
