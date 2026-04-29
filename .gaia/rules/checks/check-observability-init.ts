// .gaia/rules/checks/check-observability-init.ts — observability/init-at-boot.
//
// apps/api/server/app.ts must call `initObservability(env)` at module
// scope (i.e., before app.listen()). Without it, Sentry/Axiom/OTel
// never get the runtime hooks they need.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APP = join(process.cwd(), 'apps/api/server/app.ts')

const src = readFileSync(APP, 'utf-8')

// Strip comments and strings to avoid false positives.
const stripped = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""')

const initIdx = stripped.indexOf('initObservability(env)')
const listenIdx = stripped.search(/\.listen\s*\(/)

if (initIdx === -1) {
  console.error('apps/api/server/app.ts: missing initObservability(env) call.')
  console.error('  Rule: observability/init-at-boot')
  console.error('  Fix: import { initObservability } from "@gaia/core/observability" and')
  console.error('       call initObservability(env) at module scope before app.listen().')
  process.exit(1)
}

if (listenIdx !== -1 && initIdx > listenIdx) {
  console.error('apps/api/server/app.ts: initObservability(env) must run BEFORE app.listen().')
  console.error('  Rule: observability/init-at-boot')
  process.exit(1)
}

process.exit(0)
