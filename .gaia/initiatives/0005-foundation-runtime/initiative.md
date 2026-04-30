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

# Initiative 0005 — Foundation B: Runtime Discipline

The second half of Wave 0 — the v5-specific commitments. Where 0004 establishes the substrate (events, hexagonal, tenancy, MCP, conversation, metering, telemetry), 0005 wraps that substrate in the runtime that prevents the four decisions that calcify the moment paying customers exist. These two initiatives ship together; Wave 1 (Initiative 0006) cannot start until both are in.

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

1. **Postgres logical replication consumer lag under burst load.** Mitigation: budget declarations on materialization workers; backpressure when lag exceeds threshold; timeline event fires; manual remediation v1.0.
2. **Replica reconciliation drift detection has false positives causing thrash.** Mitigation: reconciliation runs at conservative cadence (six hours default); operator can tune per-replica; drift events are logged before correction.
3. **Streaming spine increases tail latency for malformed LLM responses.** Mitigation: timeout budgets per stream segment; fall back to non-streaming response on timeout; emit budget event.
4. **iii Function budget declarations diverge from actual runtime.** Mitigation: budget violations tracked over time; the budget itself is auditable in `packages/runtime/budgets/`; reviewed quarterly.
5. **No real projection exists v1.0 to prove the materialization pipeline.** Mitigation: the no-op projection smoke test (PR 10) is mandatory; Wave 1 lands real projections immediately after.

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

Mirrors 0004 §7.15. Names the points where 0005 intersects the existing scaffold + 0004 substrate, so d-code's PR-by-PR plan does not have to rediscover them.

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
| R-10 | Inngest is already removed (0004 PR 2). Do NOT reference `packages/workflows/` or `inngest` in any 0005 code or doc. | All |

**Existing-files-touched trace:**

- `packages/runtime/src/define-function.ts` — PR 1 adds `budget?: Budget` field to the wrapper signature
- `packages/db/schema/index.ts` — PRs 1, 3, 4, 6 add re-exports for the new entity files
- `apps/web/src/routes/chat.tsx` — PR 9 swaps in streaming-path imports
- `apps/web/src/routes/timeline.tsx` — PR 11 adds budget-violation rendering
- `apps/web/src/routes/healthz.ts` — PR 11 adds materialization + replica probes
- `apps/api/server/app.ts` — PR 8 mounts `/mcp/subscribe` route inside the existing mcpPlugin chain
- `scripts/validate-artifacts.ts` — PR 1 adds budget-required rule; PR 13 invokes the full sweep
