---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Committing the four v5 runtime moves — incremental projection materialization workers, cross-instance state replicas, iii Function discipline with explicit budgets, and end-to-end conversation streaming — in Wave 0 (before paying customers arrive) eliminates the four architectural rewrites that calcify hardest under load: repartitioning the event log, retrofitting incremental materialization, replacing synchronous cross-instance calls with replicas, and instrumenting scattered async work after the fact.
falsifier: After 0005 ships, ≥1 of the four moves is bypassed in a later initiative — a projection rendered against the live events table, a cross-instance call resolved synchronously, an async concern shipped without an iii Function declaration with explicit budgets, or a conversation surface rendering non-streaming. Window: through Wave 5 ship-date.
measurement:
  {
    metric: 'count of runtime-discipline violations detected by validate-artifacts.ts + manual audit at end of Wave 5',
    source: '.gaia/rules.ts enforcement + audit grep for unbudgeted async work and synchronous cross-instance calls',
    baseline: 'N/A (pre-0005)',
    threshold: '0 violations',
    window_days: 240,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 0b
status: not-started
---

<!-- /autoplan restore point: /Users/henriquemeireles/.gstack/projects/henriquemeireles7-gaia/harden-runtime-autoplan-restore-20260429-024901.md -->

# Initiative 0005 — Foundation B: Runtime Discipline

The second half of Wave 0 — the v5-specific commitments. Where 0004 establishes the substrate (events, hexagonal, tenancy, MCP, conversation, metering, telemetry), 0005 wraps that substrate in the runtime that prevents the four decisions that calcify the moment paying customers exist. These two initiatives ship together; Wave 1 (Initiative 0006) cannot start until both are in.

> **Substrate clarification (founder decision 2026-04-29).** This initiative refers to "iii Function" throughout, and that means **iii.dev**. 0004 PR 2 (per 0004 §7.15 R-2) retires `packages/workflows/` and the `inngest` dependency, migrating `sendWelcome` to `packages/runtime/src/functions/send-welcome.ts`. Every "iii Function" reference in 0005 maps to an iii.dev function declared via `defineFunction(...)` from `packages/runtime/`. `packages/runtime/budgets/` (PR 1) is an adapter layer over iii.dev's primitives — not a from-scratch budget engine — and re-exports iii.dev's concurrency/throttle/rate-limit primitives plus timeline event emission. The earlier autoplan note that hedged "until and unless 0004 swaps" is superseded — 0004 commits to the swap.

## 1. Context / Research

The v5 vision document (archived as `_archive/2026-04-29-vision-v5-source.md`) names this initiative's target precisely: "four foundational moves are committed in Wave 0… each preserves what v4 says the system _is_ while making it dramatically faster and operationally simpler." Those four moves are this initiative.

Today's state (post-0004): the substrate exists on top of the v1 SaaS template scaffold. Events append (`packages/events/`), MCP advertises (Elysia plugin in `apps/api/server/app.ts:/mcp`), conversation parses and plans (`packages/conversation/`), metering meters (over events; integrates with `apps/api/server/billing.ts` Polar webhook), telemetry posts (`packages/telemetry/`). The runtime layer is `packages/runtime/` (iii.dev wrapper, replaces the prior Inngest in `packages/workflows/`). Chat and timeline are routes in `apps/web/` (`apps/web/src/routes/{chat,timeline,healthz}.tsx|.ts`), not separate SolidStart apps. New tables live in `packages/db/schema/` per the existing db CLAUDE.md pattern. But every read still hits live state or live queries; every cross-instance composition (when it lands in Wave 4) would block on synchronous network calls; every async concern is implicit; every conversation surface waits for complete responses. v4 ships at this level. v5 adds the runtime layer in this initiative. (See 0004 §7.15 for the existing-scaffold reconciliation pattern; 0005 §6 below mirrors it.)

The strategic premise: four decisions calcify the moment customers exist. If the event log is partitioned wrong under millions of rows, repartitioning under load is a months-long migration. If projections are read-on-demand and the admin renders against live queries, retrofitting incremental materialization means rewriting every projection. If cross-instance composition is synchronous, the network thesis depends on luck. If async work is scattered without explicit Functions, observability breaks, backpressure breaks, retries break. The runtime is the v5 commitment.

Why now: this initiative is the runtime equivalent of bun-replacing-npm or oxlint-replacing-eslint — same architecture, dramatically faster operation. The cost to ship now is one discipline. The cost to retrofit later is four rewrites on the hot path while customers are using the system.

## 2. Strategy

**Problem**: 0004 ships an architecturally clean but operationally untuned substrate. Reads work but aren't fast. Cross-instance composition would work but would cascade-fail under load. Async work runs but isn't observable. Conversation responds but doesn't stream. Each of these is a calcification clock.

**Approach** (chosen): four runtime moves shipped as one initiative because they share infrastructure (`packages/runtime/budgets/` underpins three of them) and one without the others is half-architecture.

**Cap table** (what 0005 ships v1.0):

| Surface              | Ships v1.0                                                                                                                                       | Capped                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Materialization      | `packages/materialization/{workers,handlers,invalidation}/` — iii Function workers consuming logical-replication stream, maintaining read tables | Per-projection materialize.ts handlers (those ship per-projection from Wave 1+)                                                                                               |
| Replicas             | `packages/replicas/{subscription,reconciliation,invalidation}/` — local materialized cache of remote state, refreshed via change subscriptions   | The four downstream consumers (capabilities composition, contracts network, channels network, subscribers cross-instance) — they bind to this in their respective initiatives |
| iii Function budgets | `packages/runtime/budgets/` — declarative budget specs (p50, p99, max memory, max concurrency); violations emit timeline events                  | Auto-remediation (manual reaction in v1.0)                                                                                                                                    |
| Streaming spine      | `packages/conversation/stream/` — end-to-end token streaming, parser/planner/confirmation render progressively; first token <200ms               | Streaming for cross-instance dialog surfaces (lands in Wave 4)                                                                                                                |
| Event log v2         | `packages/events/stream/` (logical replication consumers) + `packages/events/snapshot/` (periodic snapshots for fast replay)                     | Custom snapshot policies (tunable v1.0 defaults only)                                                                                                                         |
| MCP push             | `packages/mcp/push/` — push notifications on registry change; subscribers notified within seconds without polling                                | —                                                                                                                                                                             |
| Architecture ref     | `.gaia/reference/architecture/runtime-thesis.md` — formalizes "every read is fast, every async is explicit, every cross-instance is replicated"  | —                                                                                                                                                                             |

## 3. Folder Structure

Disposition: **EXTEND** = additive change to an existing 0004 package; **NEW** = wholly new package; **EDIT** = modify file in existing scaffold.

```
gaia/
├── packages/
│   ├── runtime/                      # EXTEND (PR 1) — package created in 0004
│   │   └── src/
│   │       └── budgets/              # NEW subdir (PR 1) — per-Function latency, memory, concurrency budgets; budget violations emit timeline events
│   │
│   ├── events/                       # EXTEND (PRs 2-3) — package created in 0004
│   │   └── src/
│   │       ├── stream/               # NEW subdir (PR 2) — logical replication consumer (CREATE PUBLICATION events_pub already issued in 0004 PR 3)
│   │       └── snapshot/             # NEW subdir (PR 3) — periodic snapshots for fast replay
│   │
│   ├── materialization/              # NEW package (PRs 4-5)
│   │   └── src/
│   │       ├── workers/              # iii Functions consuming event stream (defined via packages/runtime/define-function.ts from 0004)
│   │       ├── handlers/             # event-to-state mutation handler contract (per-projection bind from Wave 1+, 0006)
│   │       └── invalidation/         # cache invalidation on schema changes
│   │
│   ├── replicas/                     # NEW package (PRs 6-7) — local materialized replicas of remote state
│   │   └── src/
│   │       ├── subscription/         # subscribing to remote event streams
│   │       ├── reconciliation/       # detecting and applying remote drift
│   │       └── invalidation/         # local invalidation on remote change
│   │
│   ├── mcp/                          # EXTEND (PR 8) — package created in 0004
│   │   └── push/                     # NEW subdir (PR 8) — push notifications on registry change; subscribers notified on change without polling. The 0004 polling baseline (`mcp/registry/poll.ts`) becomes a fallback path.
│   │
│   ├── conversation/                 # EXTEND (PR 9) — package created in 0004 (parser/planner/confirmation already shipped)
│   │   └── stream/                   # NEW subdir (PR 9) — end-to-end streaming spine; parser/planner/confirmation refactor to consume the stream; consumes packages/adapters/llm AsyncIterable<LLMChunk> from 0004 PR 6
│   │
│   └── db/                           # EDIT (PRs 3, 4, 11) — extend existing packages/db/schema/ with new entities (per 0004 §7.15 R-3, all new tables live here)
│       └── schema/
│           ├── event-snapshots.ts    # NEW (PR 3) — snapshot rows: tenant_id, last_seq, snapshot_at, snapshot jsonb
│           ├── materialization-state.ts # NEW (PR 4) — worker bookmark: worker_id, tenant_id, last_seq, lag_seconds, last_run_at
│           ├── replica-bookmarks.ts  # NEW (PR 6) — replica subscription state: replica_id, remote_url, last_seq, last_reconciled_at
│           └── budget-violations.ts  # NEW (PR 1) — function_name, budget_kind (p50|p99|memory|concurrency), observed, threshold, occurred_at
│
├── apps/
│   ├── web/                          # EDIT (PRs 9, 10, 11) — existing SolidStart app
│   │   └── src/routes/
│   │       ├── chat.tsx              # EDIT (PR 9) — chat route shipped in 0004 PR 10; this initiative swaps the parser/planner/confirmation invocation path to consume the streaming spine
│   │       └── timeline.tsx          # EDIT (PR 11) — timeline route shipped in 0004 PR 11; this initiative adds budget-violation events to the rendered feed
│   └── api/                          # EDIT (PR 8) — Elysia server; the MCP plugin (mounted at /mcp in 0004 PR 5) gains a /mcp/subscribe push endpoint
│
└── .gaia/
    └── reference/
        └── architecture/             # EXTEND (PR 12) — directory created in 0004 PR 12
            └── runtime-thesis.md     # NEW — formalizes the four runtime commitments
```

## 4. Implementation

**Order of operations**:

1. `packages/runtime/budgets/` first — every other v5 commitment declares a budget. Underlying primitive must exist before consumers reference it.
2. `packages/events/stream/` — logical replication consumer infrastructure. Materialization workers consume from this; replicas may consume from remote variants.
3. `packages/events/snapshot/` — periodic snapshots so replay doesn't read from the beginning of time. Required for materialization worker bootstrap.
4. `packages/materialization/{workers,handlers,invalidation}/` — the runtime model for projections. No projections yet (those ship Wave 1+ in 0006), but the infrastructure must be ready.
5. `packages/replicas/{subscription,reconciliation,invalidation}/` — the cross-instance state replication primitive. Four downstream consumers bind to this in later initiatives.
6. `packages/mcp/push/` — push notifications. Replaces polling; subscribers notified on registry change within seconds.
7. `packages/conversation/stream/` — the streaming spine. Parser/planner/confirmation refactor to consume the stream. `apps/chat/` from 0004 swaps in.
8. `.gaia/reference/architecture/runtime-thesis.md` — canonical runtime thesis: every read fast, every async explicit, every cross-instance replicated, conversation streaming end-to-end.
9. Wire `apps/timeline/` to surface budget-violation events alongside everything else. Founders see "your projection materialization is running 3x slower than budget" without learning what materialization is.
10. Smoke test: a no-op projection ships with the materialization scaffold to prove end-to-end (event emit → logical replication → worker → read table) before Wave 1 lands the first real projection.

**Risks**:

1. **Postgres logical replication consumer lag under burst load.** Mitigation: bounded in-memory queue on the consumer (default 1024 events); when full, halt the WAL ack — Postgres pauses sending, which is the natural backpressure mechanism. Lag exceeding threshold for >5 min fires `materialization.lag` budget violation; manual remediation v1.0.
2. **Replica reconciliation drift detection has false positives causing thrash.** Mitigation: drift detection algorithm = sequence-number watermark + periodic content-hash verification of recent window (six hours default); reconciliation runs at most once per minute regardless of push rate (clamp); drift events are logged before correction.
3. **Streaming spine increases tail latency for malformed LLM responses.** Mitigation: three named timeouts — first-token (3s default), inter-token (5s), total (60s). Only first-token timeout triggers non-streaming fallback; inter-token and total abort. Emit budget event.
4. **iii Function budget declarations diverge from actual runtime.** Mitigation: budget violations tracked over time; the budget itself is auditable in `packages/runtime/budgets/`; reviewed quarterly. Budget VALUES land after PR 10 from observed baselines; PR 1 ships budget primitive (schema + emission machinery) only.
5. **No real projection exists v1.0 to prove the materialization pipeline.** Mitigation: the no-op projection smoke test (PR 10) is mandatory; Wave 1 lands real projections immediately after.
6. **Logical replication slot leakage halts production.** Orphaned slots retain WAL indefinitely; Neon disk fills; Postgres halts. Mitigation: slot naming `gaia_<consumer_id>_<partition>` (deterministic, recoverable); idempotent slot creation via `pg_replication_slots` lookup before `CREATE_REPLICATION_SLOT`; slot drop on graceful shutdown; scheduled `slot-gc` Function drops slots inactive >24h with no consumer heartbeat; bounded WAL retention threshold — if breached, kill the consumer and drop the slot (fail loud, not fail-quiet-fill-disk).
7. **Cross-tenant data leak via logical replication.** Postgres logical replication streams ALL rows in published tables; partition awareness is not automatic. Mitigation: single consumer per replication slot with tenant filter applied in the materialization handler before any read-table write. `validate-artifacts.ts` rule: handlers under `packages/materialization/handlers/` must reference `event.tenant_id` in every read-table mutation. Per-tenant slots are not viable at Lovable-graduate scale (Neon `max_replication_slots` cap).
8. **Replica trust boundary undefended → replay attacks against the network thesis.** Without source authentication and replay protection, a compromised registry or malicious remote can forge or replay events into local replica state. Mitigation: each remote event carries `(remote_instance_id, monotonic_seq, signature)`; local replica refuses any event with `seq <= last_seen_seq` for that instance (replay protection); subscription handshake exchanges public keys and verifies signature before drift detection; TLS required for replica subscriptions; replica tables append-only at the consumer layer (drift correction writes new versions, never mutates rows).
9. **MCP push storms / DoS on subscribers.** Mitigation: subscriber registration scoped to publishing instance + tenant via `apiKey`; push payload signed by publisher (composes with risk 8); per-subscriber rate limit and backoff on 429; circuit breaker after N consecutive failures; dead-subscriber TTL with `subscription-gc` Function (24h dead → unsubscribe); idempotency key on each push so retries don't double-apply.
10. **Streaming spine partial-response corruption.** A streamed plan that crashes mid-stream must not write a half-plan event. Mitigation: planner outputs are buffered in-memory until stream-complete; only the complete plan emits a `plan.created` event (events are append-only and "events as truth" demands complete plans only); cancellation is plumbed end-to-end (HTTP request abort → stream consumer abort → SDK `AbortController`); per-stream token budget enforced; on breach, emit `budget.violation` and end gracefully.
11. **Budget violation events DoS the timeline.** A Function violating its budget on every invocation at 1000 rps = 1000 events/sec into the timeline. Mitigation: per `(function_id, violation_type)`, at most one violation event every 60s; suppression window increments a counter exposed on the suppressed event ("1,247 violations in last 60s"); the violation event itself is exempt from budget enforcement (otherwise infinite loop).
12. **Materialization replay thundering herd against snapshots.** Cold-start of N workers reads the same snapshot from storage simultaneously. Mitigation: per-worker local-disk snapshot cache keyed by `snapshot_id`; staggered worker start with 0–30s jitter; snapshots stored in S3 (using `packages/adapters/storage`) keyed by `tenant_id/projection_id/lsn.snap`, not in-table.
13. **Snapshot/WAL gap makes replay impossible.** If `snapshot.lsn < pg_replication_slots.restart_lsn`, the WAL gap is unrecoverable. Mitigation: pre-flight check on every worker bootstrap refuses to start and fires `snapshot.gap` event if violated; snapshot policy keeps last 3 snapshots per (tenant, projection) and runs scheduled GC.
14. **Materialization handler non-idempotency corrupts read tables on retry.** Mitigation: every handler signature receives `(event, readTableTx, ctx)` where `ctx.event_id` is the dedup key; read tables MUST have `last_event_id_applied` watermark column; SQL writes use `WHERE last_event_id_applied < event.id` to enforce monotonic application; mutation testing in PR 5 verifies double-application produces same state.
15. **Onboarding founder churns before runtime layer matters.** The discipline is invisible value v1.0; a Lovable-graduate founder may not reach the scale where calcification matters before deciding the system feels heavy. Mitigation: `apps/timeline/` budget surface (PR 11) renders visibly on the first invocation so the founder feels the runtime — even if no projection has materialized yet.

**Out of scope**:

- Per-projection materialization handlers (Initiative 0006 and onward — each projection ships its own).
- The four replicas consumers (capabilities composition in 0009, contracts network in 0007, channels network in 0008, subscribers cross-instance in 0010).
- Auto-remediation of budget violations (manual reaction in v1.0).
- Cross-instance conversation streaming (Wave 4).

## 5. PR Breakdown

| PR  | Title                                                                | Files (high-level)                                                               | Status  |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| 1   | `packages/runtime/budgets/` — declarative budget specs               | budget schema, p50/p99/memory/concurrency, violation event emission              | pending |
| 2   | `packages/events/stream/` — logical replication consumer infra       | consumer abstraction, ordering guarantees, ack discipline                        | pending |
| 3   | `packages/events/snapshot/` — periodic snapshot machinery            | snapshot policy, snapshot table, replay-from-snapshot logic                      | pending |
| 4   | `packages/materialization/workers/` — iii Function worker shape      | worker lifecycle, event-stream subscription, replay bootstrap                    | pending |
| 5   | `packages/materialization/handlers/` + `invalidation/`               | handler contract (per-projection contracts bind from 0006), invalidation hooks   | pending |
| 6   | `packages/replicas/subscription/` — remote event stream subscription | subscription protocol against shared registry                                    | pending |
| 7   | `packages/replicas/reconciliation/` + `invalidation/`                | drift detection, correction, local invalidation                                  | pending |
| 8   | `packages/mcp/push/` — push notifications on registry change         | push protocol, subscriber model, change detection                                | pending |
| 9   | `packages/conversation/stream/` — end-to-end streaming spine         | streaming primitives consuming `packages/adapters/llm` `AsyncIterable<LLMChunk>` (from 0004 PR 6); parser/planner/confirmation refactor; `apps/web/src/routes/chat.tsx` swaps in the streaming path | pending |
| 10  | No-op projection smoke test                                          | minimal projection proves emit → replication → worker → read table end-to-end; lives at `packages/materialization/src/workers/__smoke__/noop-projection.ts` + a row in `packages/db/schema/` for the smoke read table | pending |
| 11  | Budget-violation surface in `apps/web/src/routes/timeline.tsx`       | timeline events for budget violations, founder-readable copy. Edit existing route shipped in 0004 PR 11; new `error-event.tsx`-style component for budget-class events | pending |
| 12  | `.gaia/reference/architecture/runtime-thesis.md`                     | canonical four-commitment thesis, linked from CLAUDE.md and root resolver        | pending |
| 13  | End-of-wave runtime audit                                            | grep + `validate-artifacts.ts` audit; 0 violations across the four runtime moves | pending |

## 7. Hardening Specification

Per-PR concrete acceptance criteria added by /autoplan 2026-04-29 (HOLD SCOPE — no new packages or PRs, but each existing PR row below pins the specs that PR cannot ship without).

### PR 1 — `packages/runtime/budgets/`

**Goal:** ship the budget primitive (declaration + violation emission). Budget VALUES land later from observed baselines (post-PR 10).

**Files:**

| Path                                                                                                 | What                                                                                                                                                                           | Why                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/runtime/budgets/package.json`                                                              | Workspace package manifest. Depends on `@gaia/events`, `@gaia/runtime` (iii.dev wrapper from 0004), `typebox`.                                                                  | Establishes the package boundary so other packages import via `@gaia/runtime/budgets`.                                                      |
| `packages/runtime/budgets/CLAUDE.md`                                                                 | Folder-scoped principles: budgets are a thin adapter over the substrate, not a runtime engine; rate-limit emission is mandatory; violation events are exempt from enforcement. | Hexagonal discipline: future contributors must not turn this into a custom runtime.                                                         |
| `packages/runtime/budgets/types.ts`                                                                  | TypeScript types: `Budget`, `BudgetSpec` (`{ p50?, p99?, maxMemory?, maxConcurrency?, maxTokens? }`), `ViolationEvent`, `BudgetCtx`.                                           | Single shape consumed by every `defineBudget` call across packages.                                                                         |
| `packages/runtime/budgets/schema.ts`                                                                 | TypeBox schema for `BudgetSpec` (validates declarative budget specs at load time).                                                                                             | Catches misconfigured budgets at boot, not at runtime. Same pattern as the rest of the codebase.                                            |
| `packages/runtime/budgets/define.ts`                                                                 | `defineBudget(name, spec)` factory. Returns a `Budget` value used by `wrapFunction`.                                                                                           | Single entry point for declaring a budget against a Function.                                                                               |
| `packages/runtime/budgets/wrap.ts`                                                                   | `wrapFunction(iiiFn, budget)` adapter. Translates `BudgetSpec` → iii.dev options (`concurrency`, `throttle`, `rateLimit`) and installs runtime measurement hooks.              | The **only** place the iii.dev-specific translation lives. Single file to touch if iii.dev's option surface changes.                        |
| `packages/runtime/budgets/violation.ts`                                                              | Violation detection + event emission with rate limit (one per `(function_id, violation_type)` per 60s; counter on suppressed event).                                           | Without rate limit, a Function violating its budget at 1000 rps would write 1000 events/sec into the timeline (DoS on the timeline writer). |
| `packages/runtime/budgets/rate-limit.ts`                                                             | In-memory token bucket per `(function_id, violation_type)` with 60s window. Pure function, no IO.                                                                              | Idempotent + testable in isolation; shared by all violation paths.                                                                          |
| `packages/runtime/budgets/iii-adapter.ts`                                                            | Concrete iii.dev adapter. Maps `BudgetSpec.p99` → measurement, `maxConcurrency` → `concurrency`, etc.                                                                          | Encapsulates iii.dev option specifics; isolated from the rest of the budget package.                                                        |
| `packages/runtime/budgets/define.test.ts`, `wrap.test.ts`, `violation.test.ts`, `rate-limit.test.ts` | Co-located unit tests; property test for rate-limit idempotency.                                                                                                               | Coverage for the public surface and the rate-limit invariant.                                                                               |
| `packages/runtime/budgets/README.md`                                                                 | Usage example: `wrapFunction(myFn, defineBudget('my-fn', { p99: 200, maxConcurrency: 10 }))`.                                                                                  | One-screen DX so Wave 1+ projection authors don't need to grep the package.                                                                 |

**Acceptance criteria:**

- Budget primitive ships in PR 1; budget VALUES (actual p50/p99/memory/concurrency numbers) ship after PR 10 from observed baselines. PR 1 acceptance: schema + violation event emission + rate-limited emit (one event per `(function_id, violation_type)` per 60s; counter on suppressed event surfaces aggregate). The violation event itself is exempt from budget enforcement.
- Wraps iii.dev's `concurrency`/`throttle`/`rateLimit` primitives. `packages/runtime/budgets/` is a thin adapter, ~50–150 lines + tests, not a runtime engine.

### PR 2 — `packages/events/stream/`

**Goal:** logical-replication consumer infrastructure with safe slot lifecycle, role separation, and tenant-aware ack discipline.

**Files:**

| Path                                                                          | What                                                                                                                                                                                      | Why                                                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/events/stream/package.json`                                         | Manifest. Depends on `pg-logical-replication`, `@gaia/runtime/budgets`, `@gaia/events/schema`, `@gaia/tenancy`.                                                                           | Boundary for stream consumer; budgets wrap the consumer Function.                                                           |
| `packages/events/stream/CLAUDE.md`                                            | Folder principles: never bypass slot lifecycle; never skip tenant scoping; consumer is per-`(slot, partition)`, not per-tenant; use `gaia_replicator` role.                               | Hexagonal + security discipline at the most error-prone surface.                                                            |
| `packages/events/stream/types.ts`                                             | `StreamEvent`, `Consumer`, `SlotName`, `LSN`, `AckMode = 'on-write' \| 'on-batch'`.                                                                                                       | Single shape for downstream materialization workers.                                                                        |
| `packages/events/stream/slot.ts`                                              | Slot lifecycle: `ensureSlot(name)` (idempotent — `SELECT FROM pg_replication_slots` then `CREATE_REPLICATION_SLOT` if absent), `dropSlot(name)`, `slotName(consumerId, partition)`.       | Slot leakage is the textbook way logical replication kills production. Centralizing the lifecycle is the only safe pattern. |
| `packages/events/stream/consumer.ts`                                          | The consumer: subscribes to a slot, decodes WAL, exposes `AsyncIterable<StreamEvent>`, handles ordering + idempotent ack.                                                                 | The hot path. Every materialization worker drives one of these.                                                             |
| `packages/events/stream/ack.ts`                                               | Ack discipline: at-least-once delivery, write-then-ack, ack batching, poison-message dead-letter to `events.dead_letter` table.                                                           | Ack semantics decide whether retries duplicate or lose events. Centralizing it makes the contract explicit.                 |
| `packages/events/stream/backpressure.ts`                                      | Bounded queue (1024 default) coordinated with WAL ack — when full, halt ack so Postgres pauses sending.                                                                                   | Native Postgres backpressure; prevents OOM under burst load.                                                                |
| `packages/events/stream/role.ts`                                              | Connection factory using `REPLICATION_URL` (the `gaia_replicator` role); refuses to use `DATABASE_URL` (the app role).                                                                    | Role separation enforced at the connection factory, not by hope.                                                            |
| `packages/events/stream/harden-check.ts`                                      | Startup assertion: query `pg_settings` for `max_replication_slots >= N` and `wal_level = 'logical'`. Throw if violated.                                                                   | Fails fast at boot rather than failing weird at runtime.                                                                    |
| `packages/events/stream/wal-monitor.ts`                                       | Periodic check of `pg_replication_slots.confirmed_flush_lsn` lag; emits `materialization.lag` budget violation if lag > threshold; kills consumer + drops slot if WAL retention breached. | Fail loud, not fail-quiet-fill-disk. The single most important operational guard.                                           |
| `packages/events/stream/slot-gc.ts`                                           | Scheduled iii.dev Function: drops slots inactive >24h with no consumer heartbeat (heartbeat written to `events.consumer_heartbeats` by the consumer).                                     | Catches orphaned slots from crashed deploys / dropped containers.                                                           |
| `packages/events/stream/migrations/0001_publication.sql`                      | `CREATE PUBLICATION gaia_events FOR TABLE events;` + `events.consumer_heartbeats` + `events.dead_letter` tables.                                                                          | Publication must exist before any slot can attach. Heartbeats power slot-gc.                                                |
| `packages/events/stream/migrations/0002_replication_role.sql`                 | `CREATE ROLE gaia_replicator WITH REPLICATION LOGIN PASSWORD ...; GRANT SELECT ON events TO gaia_replicator;`. Documented Neon provisioning step.                                         | Privilege separation: only the consumer can read WAL; the app role cannot.                                                  |
| `packages/events/stream/{consumer,slot,ack,backpressure,wal-monitor}.test.ts` | Unit + integration. Integration uses ephemeral Neon branch with publication + slot in setup; teardown drops slot deterministically.                                                       | Replication is hard to test; an ephemeral Neon branch per PR is the only honest path.                                       |
| `packages/events/stream/README.md`                                            | "How to consume the events stream" — 30-line walkthrough with the `gaia_replicator` connection string, slot naming, heartbeat.                                                            | DX for the materialization worker authors who'll bind to this in PR 4 + Wave 1.                                             |

**Acceptance criteria:**

- Slot naming: `gaia_<consumer_id>_<partition>` (deterministic).
- Idempotent slot creation: `pg_replication_slots` lookup before `CREATE_REPLICATION_SLOT` (Postgres has no native `IF NOT EXISTS` for slots).
- Slot drop on graceful shutdown; scheduled `slot-gc` Function drops slots inactive >24h with no consumer heartbeat.
- WAL retention bound: if breached, kill consumer and drop slot — fail loud.
- Replication role separation: separate `gaia_replicator` role with `REPLICATION` privilege; app role `gaia_app` lacks it. Connection strings as separate env vars (`DATABASE_URL`, `REPLICATION_URL`). README documents Neon provisioning step; `bun create gaia` (0004) adds it.
- Tenant filtering enforced at handler layer, NOT at publication (Postgres row filters are static, not per-consumer-tenant). Constitutional rule: every materialization handler receives `event.tenant_id` and scopes its read-table writes; `validate-artifacts.ts` rule fails CI if a handler mutates a read table without referencing `event.tenant_id`.
- Test strategy: ephemeral Neon branch per PR (already in `packages/db/CLAUDE.md` §6) with `CREATE PUBLICATION` + `CREATE_REPLICATION_SLOT` in setup; teardown drops slot deterministically.
- Startup-time `harden-check.ts` assertion: query `pg_settings` for `max_replication_slots >= N` and refuse to boot if violated.

### PR 3 — `packages/events/snapshot/`

**Goal:** periodic per-`(tenant, projection)` snapshots in S3 so workers don't replay from the beginning of time on cold start.

**Files:**

| Path                                                                                                   | What                                                                                                                                                       | Why                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/events/snapshot/package.json`                                                                | Manifest. Depends on `@gaia/adapters/storage`, `@gaia/events/stream`, `@gaia/runtime/budgets`.                                                             | Reuse existing storage adapter; don't reinvent S3 plumbing.                             |
| `packages/events/snapshot/CLAUDE.md`                                                                   | Folder principles: snapshots are S3 blobs not DB rows; always scoped to `(tenant, projection)`; pre-flight gap check is mandatory.                         | Prevents future contributors from "just put it in a table" — that doubles DB size.      |
| `packages/events/snapshot/types.ts`                                                                    | `Snapshot`, `SnapshotKey = '{tenant_id}/{projection_id}/{lsn}.snap'`, `SnapshotPolicy = { maxEvents, maxAgeMs }`.                                          | Common shape for store + policy + replay.                                               |
| `packages/events/snapshot/key.ts`                                                                      | Key derivation + parsing. Validates LSN format, tenant_id format.                                                                                          | Centralized key format = no string concat scattered across files.                       |
| `packages/events/snapshot/store.ts`                                                                    | `read(key)`, `write(key, blob)`, `list(tenant, projection)`, `delete(key)` — backed by `@gaia/adapters/storage`.                                           | The storage interface; swap S3 for any blob store by changing the adapter.              |
| `packages/events/snapshot/policy.ts`                                                                   | "Should we snapshot now?" — `shouldSnapshot(events_since_last, ms_since_last, policy)`. Pure function.                                                     | Trigger logic decoupled from execution; testable without IO.                            |
| `packages/events/snapshot/take.ts`                                                                     | iii.dev Function that produces a snapshot: reads read-table state at LSN, writes blob to store.                                                            | The actual snapshot work; runs against the worker's read table at a consistent LSN.     |
| `packages/events/snapshot/replay.ts`                                                                   | Cold-start helper: load latest snapshot for `(tenant, projection)`, return `(state, lsn)` so worker knows where to start consuming WAL.                    | The other half of the snapshot story — a snapshot is useless without a replay path.     |
| `packages/events/snapshot/preflight.ts`                                                                | `assertSnapshotCovers(snapshot.lsn, slot.restart_lsn)` — refuses to start a worker if `snapshot.lsn < restart_lsn`. Emits `snapshot.gap` event on failure. | Catches the irrecoverable case (WAL pruned past snapshot) at boot, not after data loss. |
| `packages/events/snapshot/gc.ts`                                                                       | Scheduled Function: keep last 3 per `(tenant, projection)`; delete older.                                                                                  | Without GC, snapshots accumulate forever.                                               |
| `packages/events/snapshot/{store,policy,take,replay,preflight,gc}.test.ts` + `replay.property.test.ts` | Unit + property test: `snapshot(events[0..n]) + replay(events[n..m]) ≡ replay(events[0..m])`.                                                              | Property test catches subtle replay bugs unit tests miss.                               |
| `packages/events/snapshot/README.md`                                                                   | "How snapshots work" — when they're taken, where they live, how a worker bootstraps from one.                                                              | DX for materialization worker authors.                                                  |

**Acceptance criteria:**

- Snapshot scope: per `(tenant_id, projection_id)`. Stored in S3 via `packages/adapters/storage`, keyed `tenant_id/projection_id/lsn.snap` — NOT in-table (snapshots are GBs at scale; doubling DB size is not acceptable).
- Snapshot policy: every N events or T hours per `(tenant, projection)`, whichever first. Default N=10000, T=1h (tunable per-projection from Wave 1+).
- Snapshot GC: keep last 3 snapshots per `(tenant, projection)`; delete older. Implemented as scheduled iii Function.
- Pre-flight check on every worker bootstrap: `snapshot.lsn >= pg_replication_slots.restart_lsn`. If gap detected, refuse to start and fire `snapshot.gap` event.
- Property test: `snapshot(events[0..n]) + replay(events[n..m]) ≡ replay(events[0..m])`.

### PR 4 — `packages/materialization/workers/`

**Goal:** the iii Function shape that runs a materialization worker — lifecycle, replay bootstrap, backpressure, snapshot caching.

**Files:**

| Path                                                                                                    | What                                                                                                                                                         | Why                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `packages/materialization/package.json`                                                                 | Workspace root for materialization (workers/ + handlers/ + invalidation/).                                                                                   | Single import surface for downstream projection authors.                                                         |
| `packages/materialization/CLAUDE.md`                                                                    | Folder principles: workers are iii Functions wrapped with budgets; handlers are pure; invalidation flips a pointer not a table; tenant_id is non-negotiable. | Hexagonal + idempotency discipline at the projection runtime.                                                    |
| `packages/materialization/workers/types.ts`                                                             | `Worker`, `WorkerConfig`, `WorkerHandle`, `WorkerStatus`.                                                                                                    | Shape consumed by Wave 1+ projection authors who declare a worker per projection.                                |
| `packages/materialization/workers/lifecycle.ts`                                                         | `start(config)`, `stop(handle)`. Wires together: snapshot replay → consumer subscribe → handler dispatch → ack. Wraps with budgets.                          | Single owner of the worker lifecycle; no scattered start/stop calls.                                             |
| `packages/materialization/workers/jitter.ts`                                                            | Pure function returning a random delay in `[0, 30000]`ms. Awaited at start before snapshot read.                                                             | Avoids thundering herd against S3 snapshots when N workers cold-boot simultaneously (deploy, restart).           |
| `packages/materialization/workers/snapshot-cache.ts`                                                    | Local-disk cache of snapshots keyed by `snapshot_id`. Read-through; falls through to S3 on miss.                                                             | A worker that restarts often reads the same snapshot repeatedly; local cache saves S3 egress + latency.          |
| `packages/materialization/workers/queue.ts`                                                             | Bounded in-memory queue (1024 default). Backed by an array + condition variable.                                                                             | Buffer between consumer (fast) and handler (slow). Bounded so memory stays predictable.                          |
| `packages/materialization/workers/dispatch.ts`                                                          | Pulls events off the queue and routes to the registered handler for `(projection_id, event.type)`. Plumbs `ctx.event_id` for idempotency.                    | The hot path — the place handlers are actually called.                                                           |
| `packages/materialization/workers/registry.ts`                                                          | `registerHandler(projection_id, event_type, handler)` + `getHandler(projection_id, event_type)`.                                                             | Indirection so PR 5 (handlers) and Wave 1+ (per-projection bindings) plug into the worker without import cycles. |
| `packages/materialization/workers/heartbeat.ts`                                                         | Periodic write to `events.consumer_heartbeats` (powers slot-gc from PR 2).                                                                                   | Without heartbeat, slot-gc can't tell live from dead consumers.                                                  |
| `packages/materialization/workers/{lifecycle,queue,dispatch,registry,heartbeat,snapshot-cache}.test.ts` | Unit.                                                                                                                                                        | Coverage on the lifecycle state machine.                                                                         |
| `packages/materialization/workers/chaos.test.ts`                                                        | Integration: spin up worker, emit 1000 events mid-replay, kill the process, restart, assert state is correct (zero loss, zero duplication).                  | The single most important test in 0005 — proves the runtime survives crashes.                                    |

**Acceptance criteria:**

- Per-worker local-disk snapshot cache keyed by `snapshot_id`; subsequent restarts read from disk if `snapshot_id` matches.
- Staggered start-up: workers boot with 0–30s jitter to avoid simultaneous snapshot reads.
- Bounded in-memory queue (default 1024 events). When full, halt the WAL ack — Postgres pauses sending. Lag exceeding threshold for >5 min fires `materialization.lag` budget violation.
- Chaos test in CI: kill mid-replay, restart, verify zero events lost and zero events double-applied.

### PR 5 — `packages/materialization/handlers/` + `invalidation/`

**Goal:** the handler contract Wave 1+ projections bind to. No real handlers ship in this PR (per F-4) — the contract + idempotency + purity + versioning + invalidation primitives ship.

**Files:**

| Path                                                                                       | What                                                                                                                                                                                                                    | Why                                                                                                   |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/materialization/handlers/CLAUDE.md`                                              | Folder principles: handlers are PURE — no LLM, no HTTP, no env access. Only event→state.                                                                                                                                | The single most-likely-to-be-violated rule in the codebase; needs a folder-scoped reminder + CI rule. |
| `packages/materialization/handlers/types.ts`                                               | `Handler<E, T>`, `HandlerCtx { event_id, tenant_id, lsn }`, `ErrorPolicy = 'skip-after-N-retries' \| 'block'`.                                                                                                          | Single shape for every projection author.                                                             |
| `packages/materialization/handlers/define.ts`                                              | `defineHandler({ projection, event_type, version, errorPolicy?, retries? }, fn)`. Registers with the worker registry.                                                                                                   | Single declarative entry point; consistent shape across Wave 1+ projections.                          |
| `packages/materialization/handlers/idempotency.ts`                                         | `applyIdempotently(tx, table, row, event_id)` helper: writes `WHERE last_event_id_applied < event.id`.                                                                                                                  | Centralizes the watermark pattern so handlers can't accidentally skip it.                             |
| `packages/materialization/handlers/error.ts`                                               | Error classification: `RetriableError`, `PoisonError`, `BlockingError`. Routes `block` → halt partition; `skip-after-N-retries` → emit `materialization.handler.skip` event after N attempts.                           | Per-handler error policy enforced uniformly; skip events surface in timeline.                         |
| `packages/materialization/handlers/version.ts`                                             | Handler version metadata + `currentVersion(projection)` lookup.                                                                                                                                                         | Required by invalidation/pointer for the v1→v2 swap dance.                                            |
| `packages/materialization/handlers/lint-purity.ts`                                         | Static analysis script (Bun + AST) that fails CI if any file under `handlers/` imports from `@gaia/adapters/*` or non-allowlisted paths. Allowlist: `@gaia/domain`, `@gaia/db`, `@gaia/events/schema`, `@gaia/tenancy`. | Hexagonal boundary enforcement at the most error-prone layer.                                         |
| `packages/materialization/invalidation/types.ts`                                           | `Pointer { projection: string; current: 'v1' \| 'v2' \| ... }`.                                                                                                                                                         | The atomic swap surface.                                                                              |
| `packages/materialization/invalidation/pointer.ts`                                         | `getCurrent(projection)`, `flipTo(projection, version)` (atomic via `INSERT ... ON CONFLICT DO UPDATE` on `projection_pointers` table).                                                                                 | The only place the pointer is mutated; everywhere else reads.                                         |
| `packages/materialization/invalidation/index.ts`                                           | Public API: `invalidateOnSchemaChange(projection)`. Triggered when schema migrations land.                                                                                                                              | Single entry point so projection authors don't reach into pointer.ts.                                 |
| `packages/materialization/invalidation/migrations/0001_pointers.sql`                       | `CREATE TABLE projection_pointers (projection text PRIMARY KEY, current text NOT NULL, updated_at timestamptz DEFAULT now());`.                                                                                         | The pointer table itself.                                                                             |
| `packages/materialization/handlers/{define,idempotency,error,version,lint-purity}.test.ts` | Unit + property test for idempotency (run handler N times → same state).                                                                                                                                                | Mutation testing verifies the watermark check actually short-circuits double-applies.                 |
| `packages/materialization/invalidation/{pointer,index}.test.ts`                            | Unit + integration on a Neon branch (atomic flip under concurrent reads).                                                                                                                                               | Pointer flip is a race condition surface; needs a real DB to test.                                    |
| `.gaia/rules/checks/validate-artifacts.ts` (extended)                                                 | Adds rules: every read-table migration must include `last_event_id_applied`; every file under `handlers/` must pass `lint-purity.ts`.                                                                                   | Constitutional rules go in `validate-artifacts.ts`, not in folder READMEs.                            |

**Acceptance criteria:**

- Handler signature: `(event, readTableTx, ctx)` where `ctx.event_id` is the dedup key.
- Idempotency contract: read tables MUST have `last_event_id_applied` watermark column; handler SQL uses `WHERE last_event_id_applied < event.id`. `validate-artifacts.ts` rule: any read-table migration must include `last_event_id_applied` (or equivalent watermark column).
- Handler purity rule: files under `packages/materialization/handlers/` may import only from `@gaia/domain`, `@gaia/db`, `@gaia/events/schema`, `@gaia/tenancy`. Imports from `@gaia/adapters/*` or any IO surface fail CI. Handlers are pure event→state functions.
- Per-handler error policy: `'skip-after-N-retries' | 'block'`. Default `block` (safer). `skip` handlers emit `materialization.handler.skip` event per skip — surfaced in timeline.
- Versioning: each handler declares `version: N`. Read tables namespaced (`projection_v1`, `projection_v2`). During transition, both versions consume the event stream; the MCP/admin surface reads `current` (a pointer); flips atomically when v2 reaches v1's LSN. Old read tables retained for one snapshot cycle then GC'd.
- Mutation testing in PR 5 verifies double-application produces same state.

### PR 6 — `packages/replicas/subscription/`

**Goal:** subscribe to a remote Gaia instance's event stream, verify trust at the boundary, defend against replay/forge.

**Files:**

| Path                                                                                                            | What                                                                                                                                                                          | Why                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/replicas/package.json`                                                                                | Workspace root for replicas (subscription/ + reconciliation/ + invalidation/).                                                                                                | Single import surface; F-3 says four downstream consumers bind here later.                                                                           |
| `packages/replicas/CLAUDE.md`                                                                                   | Folder principles: replicas are append-only at the consumer layer; signature verification is non-negotiable; replay protection by monotonic seq; TLS required.                | Network thesis collapses without a clear trust boundary; folder doc is where future contributors meet it.                                            |
| `packages/replicas/subscription/types.ts`                                                                       | `RemoteEvent { remote_instance_id, seq, payload, signature }`, `Subscription`, `InstanceId`, `PubKey`.                                                                        | Common shape for client + handshake + signature verification.                                                                                        |
| `packages/replicas/subscription/client.ts`                                                                      | Subscribes to a remote instance's event stream over TLS. Iterates incoming events; rejects on signature/seq failure; writes accepted events to local replica tables.          | The consumer side of cross-instance composition; the entire network thesis runs through this file.                                                   |
| `packages/replicas/subscription/handshake.ts`                                                                   | Initial subscription handshake: exchange public keys, verify against pinned fingerprint (registered in shared registry), establish session.                                   | Without handshake, client.ts can't know whose key to verify against.                                                                                 |
| `packages/replicas/subscription/signature.ts`                                                                   | `verify(event, pub_key) → boolean`. Wraps a vetted crypto library (e.g. `@noble/ed25519`); does not roll its own crypto.                                                      | Centralized verification; one place to audit.                                                                                                        |
| `packages/replicas/subscription/replay-guard.ts`                                                                | `accept(event) → 'accept' \| 'reject'` based on `event.seq > last_seen_seq[event.remote_instance_id]`. Persists watermark per instance.                                       | Replay protection — a malicious remote replays old events to fast-forward / corrupt local state. This is the guard.                                  |
| `packages/replicas/subscription/watermark.ts`                                                                   | `getWatermark(instance_id)`, `setWatermark(instance_id, seq)`. Backed by `replica_watermarks` table.                                                                          | Watermark is the load-bearing state. Single accessor so replay-guard + cancellation + reconciliation all see the same value.                         |
| `packages/replicas/subscription/append-only.ts`                                                                 | Wraps any write to a replica table to enforce append-only at the consumer layer (refuses UPDATE/DELETE; adds a new row with `version` and `lsn`).                             | Drift correction must write new rows, not mutate. Enforced here so handlers can't accidentally violate.                                              |
| `packages/replicas/subscription/cancel.ts`                                                                      | `unsubscribe(remote_instance_id)`: best-effort `DELETE` on remote endpoint + local cleanup. Watermark preserved for re-subscribe.                                             | Without explicit cancel, dead subscriptions burn remote resources for 24h until subscription-gc reaps.                                               |
| `packages/replicas/subscription/migrations/0001_replicas.sql`                                                   | `replica_events` (append-only), `replica_watermarks (instance_id PRIMARY KEY, seq, last_seen_at)`, `replica_pinned_keys (instance_id, fingerprint)`.                          | Schema for the trust + watermark + pinning state.                                                                                                    |
| `packages/replicas/subscription/{client,handshake,signature,replay-guard,watermark,cancel,append-only}.test.ts` | Unit.                                                                                                                                                                         | Coverage of the trust + lifecycle paths.                                                                                                             |
| `packages/replicas/subscription/two-instance.test.ts`                                                           | In-process harness: two instances in same process sharing an in-memory event bus that mimics MCP push semantics. Validates handshake → publish → consume end-to-end.          | Real two-instance e2e is out-of-scope for 0005 (deferred to Wave 4); this in-process harness is the closest honest test. Document the gap in README. |
| `packages/replicas/subscription/adversarial.test.ts`                                                            | Adversarial tests: replay attack (resubmit old seq), forked history (different events at same seq), tampered payload (signature fails), forged pubkey (fingerprint mismatch). | The trust model is only as good as the tests proving it works.                                                                                       |

**Acceptance criteria:**

- Trust model (mandatory before subscription code is written):
  - Each remote event carries `(remote_instance_id, monotonic_seq, signature)`.
  - Local replica refuses any event with `seq <= last_seen_seq` for that instance (replay protection).
  - Subscription handshake exchanges public keys; signature verified before drift detection.
  - TLS required, no exceptions. Mutual TLS preferred for cross-instance.
  - Local replica tables append-only at the consumer layer — drift correction writes new versions, never mutates rows.
- Subscription cancellation: explicit `unsubscribe` request issued on shutdown (best effort); subscription record carries watermark so re-subscription resumes from `last_seen_seq` rather than zero.
- Test strategy: in-process two-instance harness using shared in-memory event bus that mimics MCP push semantics. Real two-instance e2e is out-of-scope for 0005 — document the gap; defer to Wave 4.

### PR 7 — `packages/replicas/reconciliation/` + `invalidation/`

**Goal:** detect drift between local replicas and remote sources; correct it without thrashing under push-storms.

**Files:**

| Path                                                                                             | What                                                                                                                                       | Why                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/replicas/reconciliation/types.ts`                                                      | `DriftReport { instance_id, divergent_seqs, hash_local, hash_remote }`, `ReconciliationConfig { cadenceMs, clampMs }`.                     | Common shape for scheduler + checks + correction.                                                                                     |
| `packages/replicas/reconciliation/scheduler.ts`                                                  | Schedules reconciliation per `(instance_id, projection)` at 6h cadence; clamps to max once per minute regardless of push rate.             | Six-hour cadence preserves F-7; the 1/min clamp prevents push-storm cascades from thrashing reconciliation.                           |
| `packages/replicas/reconciliation/watermark-check.ts`                                            | Cheap primary check: ask remote for its `tip_seq`; compare to local `last_seen_seq`. Mismatch = drift candidate.                           | Watermark is cheap; runs every cadence tick.                                                                                          |
| `packages/replicas/reconciliation/hash-check.ts`                                                 | Periodic verification: `hash(sorted(events[since=now-window]))` local vs remote. Mismatch = real drift, not just lag.                      | Hash check catches Byzantine drift the watermark misses (e.g., forks). Runs less often than watermark check (every Nth cadence tick). |
| `packages/replicas/reconciliation/correction.ts`                                                 | Applies drift correction: log the diff first; then write new (versioned) rows to replica tables. Never mutates rows.                       | "Logs before applying" is the rule from F-7; append-only-on-replicas is the rule from PR 6.                                           |
| `packages/replicas/reconciliation/log.ts`                                                        | `logDrift(report)` → writes to `replica_drift_log` table for operator review.                                                              | Operator gets a record of every drift event; trust model audit trail.                                                                 |
| `packages/replicas/invalidation/index.ts`                                                        | `onRemoteChange(instance_id, projection)` — invalidates local cached state on remote change push.                                          | Push-driven invalidation; coordinates with PR 8 push notifications.                                                                   |
| `packages/replicas/reconciliation/migrations/0001_drift_log.sql`                                 | `replica_drift_log` table: `(detected_at, instance_id, projection, diff_summary, correction_lsn)`.                                         | Audit trail for drift events.                                                                                                         |
| `packages/replicas/reconciliation/{scheduler,watermark-check,hash-check,correction,log}.test.ts` | Unit.                                                                                                                                      | Coverage on detection + correction logic.                                                                                             |
| `packages/replicas/reconciliation/adversarial.test.ts`                                           | Drift fixtures: hash-divergence under malicious replay, fork (different events at same seq), tampered payload, forged instance public key. | Validates that reconciliation degrades safely against the attacker model from PR 6.                                                   |
| `packages/replicas/invalidation/index.test.ts`                                                   | Unit + integration: push triggers invalidation; clamp prevents thrash.                                                                     | Confirms the 1/min clamp protects against push storms.                                                                                |

**Acceptance criteria:**

- Drift detection algorithm: sequence-number watermark + periodic content-hash verification of recent window. Watermark is cheap and primary; hash-of-window is verification. Hash is computed over `hash(sorted(events[since=t-window]))`.
- Reconciliation cadence: 6-hour default (preserves F-7); MAX-frequency clamp of once per minute regardless of push rate (prevents push-storm cascade thrashing reconciliation).
- Drift correction logs the diff before applying.
- Adversarial test scenarios in CI: malicious-remote replay, fork (different events at same seq), tampered payload (signature fails), forged instance public key.

### PR 8 — `packages/mcp/push/`

**Goal:** push notifications on registry change with auth, rate limit, circuit breaker, dead-subscriber GC. Lands BEFORE PR 6 so subscription is push-driven from the start.

**Files:**

| Path                                                                                                        | What                                                                                                                                                               | Why                                                                                                    |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `packages/mcp/push/CLAUDE.md`                                                                               | Folder principles: auth + signature + rate limit + idempotency are non-negotiable; never push without all four.                                                    | The push surface is a permanent fan-out attack surface; one missed defense is a category-defining bug. |
| `packages/mcp/push/types.ts`                                                                                | `Subscriber { id, instance_id, tenant_id, endpoint, last_successful_push_at, failure_count }`, `PushEvent { idempotency_key, payload, signature }`, `PushReceipt`. | Common shape for publisher + subscriber + GC.                                                          |
| `packages/mcp/push/publisher.ts`                                                                            | `publish(event)`: looks up subscribers for the event's tenant + topic, fans out via HTTP POST, records receipts.                                                   | The push hot path.                                                                                     |
| `packages/mcp/push/subscriber.ts`                                                                           | `register(instance_id, endpoint, apiKey)`, `unregister(subscriber_id)`. Validates apiKey (tenant-scoped).                                                          | Subscriber lifecycle; bearer-token auth at registration.                                               |
| `packages/mcp/push/auth.ts`                                                                                 | `verifyApiKey(token, expected_tenant)` — looks up the existing `apiKey` row from 0004's schema.                                                                    | Reuses existing auth surface; doesn't invent a new credential.                                         |
| `packages/mcp/push/signature.ts`                                                                            | `signPayload(payload, instance_priv_key)`, `verifySignature(payload, sig, pub_key)`. Wraps the same vetted crypto library as PR 6.                                 | Composes with PR 6's trust model — subscribers can verify pushes the same way.                         |
| `packages/mcp/push/rate-limit.ts`                                                                           | Per-subscriber token bucket. Honors 429 with exponential backoff.                                                                                                  | Without rate limit, one fast-changing registry → 1000 subscribers DoS each other.                      |
| `packages/mcp/push/circuit-breaker.ts`                                                                      | Trips after N consecutive failures (default 5); `OPEN` state skips pushes; `HALF_OPEN` retries periodically.                                                       | Prevents wasted requests to dead subscribers; isolates failure domains.                                |
| `packages/mcp/push/idempotency.ts`                                                                          | Generates idempotency key per push (UUID v7); subscribers dedupe on receipt.                                                                                       | Retries must not double-apply on subscriber side.                                                      |
| `packages/mcp/push/gc.ts`                                                                                   | Scheduled Function: subscribers with `last_successful_push_at > 24h ago` are unsubscribed.                                                                         | Without GC, dead subscribers accumulate and waste fan-out cycles.                                      |
| `packages/mcp/push/migrations/0001_subscribers.sql`                                                         | `mcp_subscribers` table with `(id, instance_id, tenant_id, endpoint, api_key_id, last_successful_push_at, consecutive_failures, created_at)`.                      | Schema for the subscriber registry.                                                                    |
| `packages/mcp/push/{publisher,subscriber,auth,signature,rate-limit,circuit-breaker,idempotency,gc}.test.ts` | Unit + integration on a Neon branch.                                                                                                                               | Coverage on the auth + signature + rate-limit + GC paths.                                              |
| `packages/mcp/push/load.test.ts`                                                                            | 1000 subscribers fan-out in CI.                                                                                                                                    | Validates the rate-limit + circuit-breaker + idempotency primitives at push-storm scale.               |

**Acceptance criteria:**

- Subscriber registers with bearer token scoped to publishing instance + tenant (`apiKey` row from existing schema).
- Push payload signed by publishing instance's key (composes with PR 6 trust model).
- Per-subscriber rate limit; backoff on 429; circuit breaker after N consecutive failures (default N=5).
- Dead-subscriber TTL: `last_successful_push_at` field; subscribers >24h dead are unsubscribed by `subscription-gc` iii Function.
- Idempotency key on each push so retries don't double-apply.
- Load test in CI: 1000 subscribers fan-out.
- **Sequencing reorder:** PR 8 lands before PR 6 (replicas) so subscription is push-driven from the start. Polling-fallback is not v1.0.

### PR 9 — `packages/conversation/stream/`

**Goal:** end-to-end streaming spine — first token <200ms, cancellation, token budget, complete-plan-only persistence, three named timeouts.

**Files:**

| Path                                                                                              | What                                                                                                                                                          | Why                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/conversation/stream/CLAUDE.md`                                                          | Folder principles: cancellation is plumbed end-to-end; only complete plans persist; three named timeouts; non-streaming fallback only on first-token timeout. | The streaming surface is touched by parser/planner/confirmation; the discipline lives here so each consumer doesn't reinvent it.                     |
| `packages/conversation/stream/types.ts`                                                           | `TokenEvent`, `StreamConfig { firstTokenMs, interTokenMs, totalMs, maxTokens }`, `StreamHandle { abort(), state }`.                                           | Shape consumed by parser-stream + planner-stream + confirmation-stream.                                                                              |
| `packages/conversation/stream/spine.ts`                                                           | The core: takes an LLM stream + `AbortController`, returns a `StreamHandle`. Plumbs cancellation, timeouts, budget.                                           | The single hot path; everything else composes onto this.                                                                                             |
| `packages/conversation/stream/precondition.ts`                                                    | Boot-time check: verifies `@gaia/adapters/llm` exports `stream()`. Throws if not — refuses to start.                                                          | Today's `packages/adapters/ai.ts` is non-streaming. Without this check, PR 9 silently falls back to one-shot calls and the streaming claim is a lie. |
| `packages/conversation/stream/abort.ts`                                                           | `wireAbort(httpRequest, sdkAbortController)` — closes the SSE connection abort propagates to LLM SDK within 100ms.                                            | End-to-end cancellation saves cost when users close tabs mid-stream.                                                                                 |
| `packages/conversation/stream/budget.ts`                                                          | Per-stream token budget enforcement. On breach: emit `budget.violation`, abort the stream, end gracefully.                                                    | A runaway prompt without per-stream budget = cost incident.                                                                                          |
| `packages/conversation/stream/timeouts.ts`                                                        | Three named timeouts: `first-token (3s default)`, `inter-token (5s)`, `total (60s)`. Only first-token timeout triggers non-streaming fallback; others abort.  | Single set of named timers; explicit names so logs and timeline events are readable.                                                                 |
| `packages/conversation/stream/buffer.ts`                                                          | Buffers partial output in memory; emits a single `plan.created` event on stream-complete. Crashes mid-stream = no partial event written.                      | "Events as truth" requires complete plans only; partial events are lies.                                                                             |
| `packages/conversation/stream/fallback.ts`                                                        | Non-streaming fallback path triggered by first-token timeout only. Emits `stream.fallback` event.                                                             | Visible operator signal that streaming isn't working for the active provider.                                                                        |
| `packages/conversation/stream/parser-stream.ts`                                                   | Refactor of `packages/conversation/parser/` (from 0004) to consume `TokenEvent` stream incrementally.                                                         | Streaming intent extraction; the user sees the parser thinking.                                                                                      |
| `packages/conversation/stream/planner-stream.ts`                                                  | Refactor of `packages/conversation/planner/` (from 0004) to consume the parser stream.                                                                        | Streaming action sequencing; the user sees the plan forming.                                                                                         |
| `packages/conversation/stream/confirmation-stream.ts`                                             | Refactor of `packages/conversation/confirmation/` (from 0004) to render progressively.                                                                        | Streaming confirmation render; the user sees what they're approving as it forms.                                                                     |
| `packages/conversation/stream/{spine,abort,budget,timeouts,buffer,fallback,precondition}.test.ts` | Unit.                                                                                                                                                         | Coverage on each primitive.                                                                                                                          |
| `packages/conversation/stream/cancellation.test.ts`                                               | Integration: simulate user closing tab mid-stream; assert SDK abort within 100ms.                                                                             | Validates the end-to-end abort plumbing.                                                                                                             |
| `packages/conversation/stream/timeout-cascade.test.ts`                                            | Integration: mock LLM with first-token-slow, inter-token-slow, total-slow scenarios; assert correct fallback / abort behavior per scenario.                   | Each timeout has a different consequence; cascade test validates routing.                                                                            |
| `packages/conversation/stream/partial-persistence.test.ts`                                        | Integration: emit half a plan, kill stream; assert no `plan.created` event written.                                                                           | Validates buffer-on-complete invariant.                                                                                                              |
| `packages/conversation/stream/mocks/llm.ts`                                                       | Mock LLM provider matching the `stream()` shape from `@gaia/adapters/llm`. Configurable for slow-first-token, slow-inter-token, runaway-tokens, etc.          | Reusable across all streaming tests; scenarios encoded once.                                                                                         |

**Acceptance criteria:**

- **Hard precondition:** `packages/adapters/llm/` (0004 PR 7) MUST expose `stream(prompt, opts): AsyncIterable<TokenEvent>` returning the Anthropic SDK's `messages.stream` async iterator. Today's `packages/adapters/ai.ts` calls `ai.messages.create({...})` (non-streaming) — PR 9 cannot start until 0004 PR 7 ships streaming. Verify before kickoff.
- Cancellation plumbed end-to-end: HTTP request abort → stream consumer abort → SDK `AbortController`. Closing the SSE connection within 100ms aborts the upstream LLM call.
- Per-stream token budget enforced; on breach emit `budget.violation` event (PR 11 surfaces) and end gracefully.
- Partial response persistence: planner outputs buffered in-memory until stream-complete; only the complete plan emits a `plan.created` event.
- Three named timeouts: first-token (3s default, only this triggers non-streaming fallback), inter-token (5s, abort), total (60s, abort).
- Test: cancellation, timeout-cascade, partial-persistence test cases against mock LLM.

### PR 10 — No-op projection smoke test

**Goal:** the only true end-to-end test in 0005. Proves the materialization pipeline works (emit → replication → worker → read table) before Wave 1 lands real projections.

**Files:**

| Path                                                                           | What                                                                                                                                                                 | Why                                                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/materialization/workers/__smoke__/noop-projection.ts`                | Minimal projection: counts events of type `smoke.tick` per tenant. No business logic.                                                                                | Smallest possible projection that still exercises every primitive (consumer, snapshot, handler, ack, watermark). |
| `packages/materialization/workers/__smoke__/noop-handler.ts`                   | Handler that increments a counter using `applyIdempotently` from PR 5. Declared with `defineHandler({ projection: 'smoke', event_type: 'smoke.tick', version: 1 })`. | Exercises the handler contract end-to-end.                                                                       |
| `packages/materialization/workers/__smoke__/migrations/0001_smoke_counter.sql` | `smoke_counter (tenant_id, count, last_event_id_applied)` table.                                                                                                     | Read table for the smoke projection; validates the watermark column rule.                                        |
| `packages/materialization/workers/__smoke__/load-test.ts`                      | Emits 10,000 `smoke.tick` events; polls `smoke_counter`; asserts all 10K visible within 5s p99 across 5 runs.                                                        | Latency target — fails the build if the architecture is too slow.                                                |
| `packages/materialization/workers/__smoke__/chaos-test.ts`                     | Spins up worker, emits 1000 events, kills the process at event 500, restarts, asserts: zero events lost, zero double-applied.                                        | Crash-recovery target — the runtime promises this.                                                               |
| `packages/materialization/workers/__smoke__/cold-bootstrap-test.ts`            | Drops read table; snapshot LSN advances; new worker bootstraps from snapshot+WAL. Asserts <30s for 100k events.                                                      | Cold-start target — proves snapshot+replay works at realistic scale.                                             |
| `.github/workflows/smoke.yml`                                                  | CI workflow: runs the three smoke tests on every PR touching `packages/materialization/`, `packages/events/`, `packages/replicas/`.                                  | Guards regressions — the smoke tests must keep passing as Wave 1+ lands handlers.                                |
| `packages/materialization/workers/__smoke__/README.md`                         | Describes the smoke test surface and how to extend it for Wave 1+ projections.                                                                                       | DX so projection authors know how to add their own smoke step.                                                   |

**Acceptance criteria (replaces "minimal projection proves end-to-end"):**

- Emit 10,000 events → all 10,000 visible in read table within 5s p99.
- Kill the worker mid-stream; restart; verify zero events lost, zero events double-applied.
- Cold-bootstrap: drop read table, snapshot LSN advances; new worker rebuilds in <30s for 100k events.
- This is the only true e2e in the initiative. Failure here means the architecture doesn't work.

### PR 11 — `apps/timeline/` budget-violation surface

**Goal:** founder-readable budget violation feed in the timeline app. Visible on first invocation so the runtime is felt before any projection materializes.

**Files:**

| Path                                                        | What                                                                                                                              | Why                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/timeline/src/feeds/budget-violations.ts`              | Subscribes to `budget.violation` events; renders into the timeline feed.                                                          | The budget primitive's user-facing surface.                                                                            |
| `apps/timeline/src/feeds/budget-violations.test.ts`         | Unit: rendering of single violation, suppressed counter rendering, dedup of identical violations.                                 | Coverage on the feed logic.                                                                                            |
| `apps/timeline/src/copy/budget-copy.ts`                     | Founder-readable copy templates: "your `<function>` is running `<N>x` slower than budget", "`<N>` budget violations in last 60s". | Single source of voice for budget messages; no jargon, no function IDs in copy.                                        |
| `apps/timeline/src/aggregation/suppressed.ts`               | Renders the suppressed-violation counter from PR 1's rate limit (one row, not N).                                                 | Without aggregation, the timeline gets 1,247 identical rows under sustained violation — exactly the DoS PR 1 prevents. |
| `apps/timeline/src/components/BudgetViolationCard.tsx`      | UI component: violation icon, copy, severity, link to Function definition, dismiss action.                                        | The concrete UI surface; reuses `packages/ui/` design tokens.                                                          |
| `apps/timeline/src/components/BudgetViolationCard.test.tsx` | Component test: severity styles, click-through to Function, dismissal.                                                            | Coverage on the visual surface.                                                                                        |
| `apps/timeline/src/index.ts` (extended)                     | Registers `budget-violations` feed alongside existing feeds.                                                                      | Surfacing the feed; minimal change to the existing app shell.                                                          |

**Acceptance criteria:**

- Renders `budget.violation` events with founder-readable copy ("your projection materialization is running 3x slower than budget").
- Renders the suppressed-violation counter from PR 1 ("1,247 budget violations in last 60s") — not 1,247 individual rows.
- Visible on first invocation so the runtime is felt even before any projection materializes (mitigation for risk 15).

### PR 12 — `.gaia/reference/architecture/runtime-thesis.md`

**Goal:** canonical reference document formalizing the four runtime commitments. Authored via `/h-reference` (5-part shape).

**Files:**

| Path                                                    | What                                                                                                                                                                                                                                                      | Why                                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `.gaia/reference/architecture/runtime-thesis.md`        | The reference doc itself. 5-part shape per h-reference: principles → mechanisms → enforcement → exceptions → migration. Names the four commitments: every read fast, every async explicit, every cross-instance replicated, every conversation streaming. | Future contributors and audits read this to understand what 0005 commits to. |
| `.gaia/CLAUDE.md` (updated)                             | Adds `runtime-thesis.md` to the routing table under "Architecture refs".                                                                                                                                                                                  | Discovery path so the agent finds it during code edits.                      |
| `CLAUDE.md` (root, updated)                             | Adds runtime-thesis row to the docs resolver table.                                                                                                                                                                                                       | Top-level resolver — agent consults this first on any runtime question.      |
| `.gaia/rules.ts` (extended)                             | Adds rule entries enforced via `validate-artifacts.ts` (referenced by PR 13): `RUNTIME_NO_SYNC_CROSS_INSTANCE`, `RUNTIME_BUDGETED_FUNCTIONS_ONLY`, `RUNTIME_NO_LIVE_EVENT_TABLE_READ`, `RUNTIME_STREAMING_ONLY`.                                          | Rules enforce the thesis in CI; the doc explains the why.                    |
| `.gaia/rules/checks/check-reference-shape.ts` (extended if needed) | Verifies runtime-thesis.md follows the 5-part shape. Already run in CI on every PR touching `.gaia/reference/`.                                                                                                                                           | Reference docs must follow the shape; existing script enforces it.           |

**Acceptance criteria:**

- Document follows 5-part shape per `.claude/skills/h-reference/reference.md`.
- Routing tables in `CLAUDE.md` (root) and `.gaia/CLAUDE.md` updated.
- Rule entries in `.gaia/rules.ts` map to PR 13 audit checks.

### PR 13 — End-of-wave runtime audit (concrete definition)

**Goal:** validate the four runtime moves shipped without bypass. Auditable, reproducible, written to disk.

**Files:**

| Path                                                  | What                                                                                                                                                         | Why                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/audit-runtime-discipline.ts`                 | Reads rule definitions from `.gaia/rules.ts` (the four `RUNTIME_*` rules from PR 12) and runs each against the codebase. Outputs a structured report.        | Single entry point; reproducible; output is data, not a console log.                                                                                                    |
| `scripts/audit-checks/no-sync-cross-instance.ts`      | Greps for `fetch(...)` patterns calling `*.gaia.network` or `*.gaia.app` URLs outside `packages/replicas/`. Allowlist file documents intentional exceptions. | Synchronous cross-instance calls are the calcification PR 6/7 prevents.                                                                                                 |
| `scripts/audit-checks/budgeted-functions.ts`          | Parses TS AST; finds `defineFunction(...)` calls (the iii.dev wrapper from `@gaia/runtime`); flags any without a `wrapFunction(..., budget)` wrapper.            | Unbudgeted Functions break the observability + backpressure thesis.                                                                                                     |
| `scripts/audit-checks/no-live-event-table-read.ts`    | Greps for `from events` SQL outside `packages/events/`, `packages/materialization/`.                                                                         | Live event-table reads bypass the materialized projection layer; calcifies the admin to slow queries.                                                                   |
| `scripts/audit-checks/streaming-only-conversation.ts` | Greps for `messages.create` outside an allowlist of legacy/test paths.                                                                                       | Non-streaming conversation surfaces violate the streaming spine commitment.                                                                                             |
| `scripts/audit-checks/smoke-still-passes.ts`          | Re-runs PR 10 smoke tests against the integration branch; fails the audit if regressed.                                                                      | Audit isn't just static; it confirms the runtime still works.                                                                                                           |
| `.github/workflows/runtime-audit.yml`                 | CI workflow: runs the audit on every push to `master` after 0005 PR 12 lands; uploads report as artifact; fails the build on any violation.                  | Audit must run automatically, not on someone remembering.                                                                                                               |
| `.gaia/audit/0005-runtime-audit-{date}.md` (template) | Output document template populated by `audit-runtime-discipline.ts` per run.                                                                                 | Append-only audit trail per CLAUDE.md rule "state-changing actions emit structured logs to Axiom" — but the audit summary is also written to the repo for human review. |

**Acceptance criteria:**

- `bun run scripts/audit-runtime-discipline.ts` exits non-zero on any violation.
- CI runs the audit on every push to `master`.
- The four `RUNTIME_*` rule entries in `.gaia/rules.ts` are exercised by their corresponding check scripts.
- Audit output written to `.gaia/audit/0005-runtime-audit-{date}.md`.
- The no-op smoke test (PR 10) is re-run as part of the audit and must still pass.

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                                                                                                         | Source                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| F-1 | Wave 0 splits into 0004 (substrate) + 0005 (runtime). 0006 (Wave 1) cannot start until both ship.                                                                                                                | Founder 2026-04-29                                |
| F-2 | The four v5 runtime moves ship together: materialization, replicas, budgets, streaming spine. They share the budgets primitive and one without the others is half-architecture.                                  | Founder 2026-04-29 (v5 vision §what-changed)      |
| F-3 | `packages/replicas/` ships in 0005 with no consumers wired. The four consumers (capabilities composition, contracts network, channels network, subscribers cross-instance) bind in their respective initiatives. | Founder 2026-04-29 (v5 vision §packages/replicas) |
| F-4 | Per-projection materialize.ts handlers do NOT ship in 0005. The infrastructure ships; the handlers ship per projection from Wave 1+.                                                                             | Founder 2026-04-29 (v5 vision §Wave 1)            |
| F-5 | Streaming spine target: first token in <200ms. Cross-instance dialog streaming is out of scope (Wave 4).                                                                                                         | Founder 2026-04-29 (v5 vision §runtime-thesis)    |
| F-6 | Budget violations emit timeline events; auto-remediation is out of scope v1.0. Founders react to violations manually in v1.0.                                                                                    | Founder 2026-04-29 (v5 vision §timeline)          |
| F-7 | Replica reconciliation runs at six-hour default cadence, tunable per-replica. Drift correction logs before applying.                                                                                             | Founder 2026-04-29 (v5 vision §runtime-thesis)    |
| F-8 | A no-op projection smoke test is mandatory PR 10 — proves the materialization pipeline end-to-end before Wave 1 lands real projections.                                                                          | Founder 2026-04-29                                |

## 7. Existing-scaffold reconciliation (added 2026-04-29)

Mirrors 0004 §7.15. Names the points where 0005 intersects the existing scaffold + 0004 substrate, so w-code's PR-by-PR plan does not have to rediscover them.

| #   | Decision                                                                                                                          | PR(s)         |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| R-1 | All new tables go to `packages/db/schema/<entity>.ts` per 0004 §7.15 R-3. Migrations in `packages/db/migrations/`. No per-package `drizzle/` directories. | 1, 3, 4, 6 |
| R-2 | `packages/runtime/`, `packages/events/`, `packages/mcp/`, `packages/conversation/` are EXTENDED (new subdirs added), not created. They were created in 0004 PRs 2, 3, 5, 7 respectively. | 1, 2, 3, 8, 9 |
| R-3 | The Postgres `CREATE PUBLICATION events_pub` was already issued in 0004 PR 3. PR 2 here adds the **consumer** code, not the publication. Verify `wal_level=logical` was applied. | 2 |
| R-4 | `packages/conversation/stream/` (PR 9) consumes the `AsyncIterable<LLMChunk>` contract from `packages/adapters/llm/` (0004 PR 6). The non-streaming `complete()` wrapper from 0004 stays for callers that don't yet stream — do NOT remove it in this initiative. | 9 |
| R-5 | "Apps/timeline budget-violation surface" (PR 11) is an EDIT to `apps/web/src/routes/timeline.tsx` (0004 PR 11), not a new app. Same for the chat refresh in PR 9 — `apps/web/src/routes/chat.tsx` is edited, not created. | 9, 11 |
| R-6 | Healthz endpoint at `apps/web/src/routes/healthz.ts` (from 0004 PR 11) extends in this initiative to also probe materialization worker liveness + replica reconciliation. One healthz, not two. | 11 |
| R-7 | MCP plugin in `apps/api/server/app.ts` (0004 PR 5) gains a `/mcp/subscribe` push endpoint in PR 8. The polling path (`packages/mcp/registry/poll.ts` from 0004) stays as a fallback for clients that haven't migrated to push. | 8 |
| R-8 | `validate-artifacts.ts` extension: PR 1 adds a rule that every `defineFunction` call has a `budget` field set; PR 13 verifies. The existing rule modules from 0004 PR 4 are extended, not duplicated. | 1, 13 |
| R-9 | The no-op projection smoke test (PR 10) lives at `packages/materialization/src/workers/__smoke__/noop-projection.ts` plus a smoke read table in `packages/db/schema/_smoke.ts`. Smoke artifacts are clearly marked so 0006's first real projection can sit alongside them without confusion. | 10 |
| R-10 | Inngest is already removed (0004 PR 2). Do NOT reference `packages/workflows/` or `inngest` in any 0005 code or doc. The substrate is iii.dev; AD-1 below supersedes the earlier autoplan hedge. | All |

**Existing-files-touched trace:**

- `packages/runtime/src/define-function.ts` — PR 1 adds `budget?: Budget` field to the wrapper signature
- `packages/db/schema/index.ts` — PRs 1, 3, 4, 6 add re-exports for the new entity files
- `apps/web/src/routes/chat.tsx` — PR 9 swaps in streaming-path imports
- `apps/web/src/routes/timeline.tsx` — PR 11 adds budget-violation rendering
- `apps/web/src/routes/healthz.ts` — PR 11 adds materialization + replica probes
- `apps/api/server/app.ts` — PR 8 mounts `/mcp/subscribe` route inside the existing mcpPlugin chain
- `.gaia/rules/checks/validate-artifacts.ts` — PR 1 adds budget-required rule; PR 13 invokes the full sweep

<!-- AUTOPLAN DECISION LOG (added 2026-04-29) -->

| ID    | Decision                                                                                                                                                                                                                           | Classification | Principle                     | Source                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------- | ------------------------------------ |
| AD-1  | "iii Function" maps to iii.dev. Founder committed (2026-04-29) — 0004 PR 2 retires `packages/workflows/` and removes the `inngest` dep. The earlier autoplan hedge ("maps 1:1 to Inngest, wrapper insulates if 0004 swaps") is superseded. | Mechanical     | P5 explicit-over-clever       | Founder 2026-04-29 (overrides autoplan eng #1, ceo #5) |
| AD-2  | Slot lifecycle (naming, idempotent create, GC, retention bound) added to PR 2.                                                                                                                                                     | Mechanical     | P1 completeness               | autoplan eng #2                      |
| AD-3  | Tenant filtering enforced at handler layer with `validate-artifacts.ts` rule (single consumer per slot, not per-tenant slots — Neon `max_replication_slots` cap).                                                                  | Mechanical     | P1 completeness, P3 pragmatic | autoplan eng #3                      |
| AD-4  | PR 9 streaming spine declares hard precondition on 0004 PR 7 (streaming-aware `packages/adapters/llm/`). Today's `packages/adapters/ai.ts` is non-streaming and blocks PR 9.                                                       | Mechanical     | P1 completeness               | autoplan eng #4, ceo #11             |
| AD-5  | Replica trust model: monotonic seq + signature + TLS + append-only on replicas. Added to PR 6 spec.                                                                                                                                | Mechanical     | P1 completeness               | autoplan eng #5                      |
| AD-6  | Drift detection algorithm = sequence-watermark + periodic content-hash of recent window. Reconciliation max-frequency clamp = 1/min (prevents push-storm cascade).                                                                 | Mechanical     | P5 explicit-over-clever       | autoplan eng #6, eng #18             |
| AD-7  | MCP push: bearer token + signed payload + per-subscriber rate limit + circuit breaker + dead-subscriber GC + idempotency key.                                                                                                      | Mechanical     | P1 completeness               | autoplan eng #7                      |
| AD-8  | Streaming spine: end-to-end `AbortController`, per-stream token budget, complete-plan-only persistence, three named timeouts (first-token 3s = fallback trigger; inter-token 5s = abort; total 60s = abort).                       | Mechanical     | P1 completeness               | autoplan eng #8                      |
| AD-9  | Materialization replay: per-worker local snapshot cache + 0–30s start jitter to avoid thundering herd.                                                                                                                             | Mechanical     | P3 pragmatic                  | autoplan eng #9                      |
| AD-10 | Handler idempotency contract: `(event, readTableTx, ctx)` signature + `last_event_id_applied` watermark column + `validate-artifacts.ts` rule. Mutation testing in PR 5.                                                           | Mechanical     | P1 completeness               | autoplan eng #10                     |
| AD-11 | Snapshot scope = per `(tenant, projection)` in S3 (not in-table); policy = N=10000 events or T=1h; GC keeps last 3; pre-flight `snapshot.lsn >= restart_lsn` check refuses boot if gap detected.                                   | Mechanical     | P1 completeness               | autoplan eng #11, eng #13            |
| AD-12 | Budget violation rate limit: one event per `(function_id, violation_type)` per 60s; suppressed-counter; violation event itself exempt (no infinite loop).                                                                          | Mechanical     | P3 pragmatic                  | autoplan eng #12                     |
| AD-13 | Handler purity rule: handlers may import only from `@gaia/{domain,db,events/schema,tenancy}`; adapter imports fail CI.                                                                                                             | Mechanical     | P5 explicit-over-clever       | autoplan eng #13                     |
| AD-14 | Schema evolution: handler `version: N` declaration; `projection_v1`/`projection_v2` table namespace; pointer flip when v2 catches v1 LSN; old read tables retained one snapshot cycle then GC'd.                                   | Mechanical     | P1 completeness               | autoplan eng #14                     |
| AD-15 | Replication role separation: `gaia_replicator` (REPLICATION privilege) vs `gaia_app` (no REPLICATION). Separate connection strings (`DATABASE_URL`, `REPLICATION_URL`).                                                            | Mechanical     | P1 completeness, security     | autoplan eng #15                     |
| AD-16 | PR 10 acceptance criteria: 10K events visible in read table <5s p99; mid-stream-kill recovery with zero loss/duplication; cold-bootstrap of 100k events <30s.                                                                      | Mechanical     | P1 completeness               | autoplan eng #16                     |
| AD-17 | PR 4 backpressure primitive: bounded in-memory queue (1024 events); halt WAL ack when full (Postgres-native backpressure).                                                                                                         | Mechanical     | P5 explicit-over-clever       | autoplan eng #17                     |
| AD-18 | PR 6 subscription cancellation: explicit unsubscribe on shutdown + watermark resume on re-subscribe.                                                                                                                               | Mechanical     | P1 completeness               | autoplan eng #19                     |
| AD-19 | WAL retention configuration: README documents Neon settings; `harden-check.ts` startup assertion (`max_replication_slots >= N`) refuses boot if violated.                                                                          | Mechanical     | P5 explicit-over-clever       | autoplan eng #20                     |
| AD-20 | Per-handler error policy: `'skip-after-N-retries' \| 'block'`; default = block (safer); skip emits `materialization.handler.skip` event surfaced in timeline.                                                                      | Mechanical     | P5 explicit-over-clever       | autoplan eng #21                     |
| AD-21 | Sequencing reorder: PR 8 (MCP push) lands before PR 6 (replicas/subscription) so subscription is push-driven from the start. Polling-fallback is not v1.0.                                                                         | Mechanical     | P5 explicit-over-clever       | autoplan ceo #12                     |
| AD-22 | Constrain budgets package to vendor-adapter + timeline emit, not from-scratch budget engine. ~50–150 lines.                                                                                                                        | Mechanical     | P4 DRY, P5 explicit           | autoplan ceo #6                      |
| AD-23 | Risk 15 added: founder churn before runtime layer matters. Mitigation: timeline budget surface (PR 11) renders visibly on first invocation.                                                                                        | Mechanical     | P1 completeness               | autoplan ceo #9                      |
| AD-24 | PR 13 audit definition: `validate-artifacts.ts` + grep for sync cross-instance calls + unbudgeted Functions + live-events-table reads + non-streaming conversation surfaces; output to `.gaia/audit/0005-runtime-audit-{date}.md`. | Mechanical     | P1 completeness               | autoplan ceo #7 (was: vague "audit") |
