// cli/src/state.schema.ts — local copy of StateSchemaV1 for the standalone CLI.
//
// Per cli/CLAUDE.md the CLI cannot import from `@gaia/*` workspace packages OR
// from `.gaia/protocols/cli.ts` (the protocol file lives outside the npm tarball).
// This file duplicates StateSchemaV1 + StateV1 from .gaia/protocols/cli.ts.
//
// Drift between this file and .gaia/protocols/cli.ts is structurally caught by
// scripts/check-typebox-derivation.ts (extend that check to flag drift here).
//
// When updating: change BOTH this file and .gaia/protocols/cli.ts in the same PR.

import { Type, type Static } from '@sinclair/typebox'

const VerifiedProviderSchema = Type.Object({
  ok: Type.Boolean(),
  verified_at: Type.String(),
  warnings: Type.Array(Type.String()),
  ttfd_blocking: Type.Boolean(),
})

export const StateSchemaV1 = Type.Object({
  version: Type.Literal(1),
  project_slug: Type.String({ pattern: '^[a-z][a-z0-9-]{0,38}[a-z0-9]$' }),
  cli_version: Type.String(),
  started_at: Type.String(),
  bun_version: Type.Union([Type.String(), Type.Null()]),
  platform: Type.String(),
  required_env: Type.Array(Type.String({ pattern: '^[A-Z][A-Z0-9_]+$' })),
  verified: Type.Optional(
    Type.Object({
      polar: Type.Optional(VerifiedProviderSchema),
      resend: Type.Optional(VerifiedProviderSchema),
      neon: Type.Optional(VerifiedProviderSchema),
      railway: Type.Optional(VerifiedProviderSchema),
    }),
  ),
  last_step: Type.String(),
  next_step: Type.String(),
  tthw_ms: Type.Optional(
    Type.Object({
      banner: Type.Optional(Type.Number()),
      project_usable: Type.Optional(Type.Number()),
      dev_server: Type.Optional(Type.Number()),
    }),
  ),
  deploy_attempts: Type.Optional(Type.Number({ minimum: 0, maximum: 3 })),
  /** ISO timestamp of first smoke-green run. Idempotency marker for `flow.activated`. */
  activated_at: Type.Optional(Type.String()),
})

export type StateV1 = Static<typeof StateSchemaV1>
