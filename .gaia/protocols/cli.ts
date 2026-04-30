// .gaia/protocols/cli.ts — TYPE-ONLY contract for the Gaia CLI.
//
// Per AD-AP-9: this file exports only types, constants, and TypeBox schemas.
// No runtime logic. Hooks under .claude/hooks/ may import these to validate
// CLI invocations; cli/ imports its own runtime helpers from cli/src/.
//
// Bidirectional rule: hooks → protocol (read), cli/ → protocol (read), but
// NEVER protocol → cli/. Lint enforces (PR 3).

import { Type, type Static } from '@sinclair/typebox'

// -----------------------------------------------------------------------------
// Verbs

export const VERBS = [
  'create',
  'verify-keys',
  'deploy',
  'smoke',
  'explain',
  'setup',
  'status',
] as const
export type Verb = (typeof VERBS)[number]

// -----------------------------------------------------------------------------
// POSIX-aligned exit codes (AD-AP-26 referenced by Eng review)

export const ExitCode = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  EX_USAGE: 64,
  EX_DATAERR: 65,
  EX_UNAVAILABLE: 69,
  EX_SOFTWARE: 70,
  EX_TEMPFAIL: 75,
  EX_NOPERM: 77,
  EX_CONFIG: 78,
} as const
export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode]

// -----------------------------------------------------------------------------
// NDJSON event names — every event a verb emits is one of these. Adding a new
// event = adding a key here AND an entry to EventPayloadSchema.

export const EVENT_NAMES = [
  // Lifecycle
  'cli.start',
  'cli.complete',
  'cli.error',
  // Step granularity (one per atomic operation in a verb)
  'step.start',
  'step.progress',
  'step.ok',
  'step.warn',
  'step.error',
  // Hints surfaced to the agent
  'hint.next',
  // Telemetry boundary (emitted alongside, not instead of, the above)
  'telemetry.first_run',
  'telemetry.ttfd',
  // Funnel events (Principle 7) — one per stage of the 30-min flow.
  'flow.discover', // README opened (emitted by docs site, not the CLI)
  'flow.scaffold', // bun create succeeded
  'flow.verify', // verify-keys all green
  'flow.deploy', // Railway live
  'flow.smoke', // smoke green
  'flow.activated', // first user signed up (Principle 2 — the locked activation event)
  // Observability — fired when an E#### code surfaces but has no catalog entry
  'catalog.miss',
] as const
export type EventName = (typeof EVENT_NAMES)[number]

// -----------------------------------------------------------------------------
// TypeBox schemas — every NDJSON line on stdout (when --json mode) MUST match.

export const EventBaseSchema = Type.Object({
  event_v: Type.Literal(1),
  ts: Type.String(),
  verb: Type.Union(VERBS.map((v) => Type.Literal(v))),
  /** Run identifier — links events from the same verb invocation. */
  run_id: Type.String({ pattern: '^[A-Za-z0-9_-]{8,}$' }),
  /** Event name from EVENT_NAMES. */
  name: Type.String(),
  /** Free-form structured payload — schema varies per event name. */
  data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  /** Optional `next:` hint a downstream agent can chain on. */
  next: Type.Optional(Type.String()),
})
export type EventBase = Static<typeof EventBaseSchema>

// -----------------------------------------------------------------------------
// state.json schema (TypeBox v1, AD-AP-2). state.json is the resume primitive
// per CEO reframing #3. Every verb reads + writes; concurrent runs use file lock.

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
  /** Env-var NAMES the project will need (AD-AP-18 — NEVER values). */
  required_env: Type.Array(Type.String({ pattern: '^[A-Z][A-Z0-9_]+$' })),
  /** Per-provider verification result snapshots. Each provider key is optional. */
  verified: Type.Optional(
    Type.Object({
      polar: Type.Optional(VerifiedProviderSchema),
      resend: Type.Optional(VerifiedProviderSchema),
      neon: Type.Optional(VerifiedProviderSchema),
      railway: Type.Optional(VerifiedProviderSchema),
    }),
  ),
  /** Last successfully completed step name. */
  last_step: Type.String(),
  /** Suggested next verb. */
  next_step: Type.String(),
  /** TTHW measurements, populated as the run progresses. */
  tthw_ms: Type.Optional(
    Type.Object({
      banner: Type.Optional(Type.Number()),
      project_usable: Type.Optional(Type.Number()),
      dev_server: Type.Optional(Type.Number()),
    }),
  ),
  /** Deploy attempt counter for d-fail self-heal cap (3 attempts). */
  deploy_attempts: Type.Optional(Type.Number({ minimum: 0, maximum: 3 })),
  /** ISO timestamp of first smoke-green run. Idempotency marker for `flow.activated`. */
  activated_at: Type.Optional(Type.String()),
})
export type StateV1 = Static<typeof StateSchemaV1>

// -----------------------------------------------------------------------------
// Telemetry payload allowlist (AD-AP-8). Anything NOT in this list is stripped
// before send. The list is conservative on purpose — every field is auditable.

export const TELEMETRY_ALLOWLIST = [
  'verb',
  'cli_version',
  'duration_ms',
  'exit_code',
  'error_class',
  'error_code',
  'attempt',
  'os',
  'bun_version',
  'machine_id_hash',
] as const
export type TelemetryFieldName = (typeof TELEMETRY_ALLOWLIST)[number]

// -----------------------------------------------------------------------------
// Standard CLI flags every verb supports.

export const STANDARD_FLAGS = [
  '--json',
  '--dry-run',
  '--verbose',
  '-v',
  '--quiet',
  '-q',
  '--yes',
  '-y',
  '--no-color',
  '--no-telemetry',
  '--ci',
  '--state-file',
  '--version',
  '--help',
  '-h',
] as const
