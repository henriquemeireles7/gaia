// packages/workflows/index.ts — Inngest client (vision §Stack, §Architecture-10)
//
// Vision §Architecture-10: "Workflow orchestration is a platform primitive.
// Multi-step workflows use Inngest, not per-feature orchestration code."
//
// Functions are defined per feature in apps/api/features/<domain>/workflows/
// and registered with this client at boot.

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'gaia',
  name: 'gaia',
})

export type GaiaInngest = typeof inngest
