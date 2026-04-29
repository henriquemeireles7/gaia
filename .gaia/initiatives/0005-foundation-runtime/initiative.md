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

Today's state (post-0004): the substrate exists. Events append, MCP advertises, conversation parses and plans, metering meters, telemetry posts. But every read still hits live state or live queries; every cross-instance composition (when it lands in Wave 4) would block on synchronous network calls; every async concern is implicit; every conversation surface waits for complete responses. v4 ships at this level. v5 adds the runtime layer.

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

```
santiago/
├── packages/
│   ├── runtime/
│   │   └── budgets/                  # NEW — per-Function latency, memory, concurrency budgets
│   │
│   ├── events/
│   │   ├── stream/                   # NEW — logical replication consumer infrastructure
│   │   └── snapshot/                 # NEW — periodic snapshots for fast replay
│   │
│   ├── materialization/              # NEW — projection state maintenance
│   │   ├── workers/                  # iii Functions consuming event stream
│   │   ├── handlers/                 # event-to-state mutation handlers (per-projection bind from Wave 1+)
│   │   └── invalidation/             # cache invalidation on schema changes
│   │
│   ├── replicas/                     # NEW — local materialized replicas of remote state
│   │   ├── subscription/             # subscribing to remote event streams
│   │   ├── reconciliation/           # detecting and applying remote drift
│   │   └── invalidation/             # local invalidation on remote change
│   │
│   ├── mcp/
│   │   └── push/                     # NEW — push notifications on registry change
│   │
│   └── conversation/
│       └── stream/                   # NEW — end-to-end streaming spine
│
└── .gaia/
    └── reference/
        └── architecture/
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
| 9   | `packages/conversation/stream/` — end-to-end streaming spine         | streaming primitives, parser/planner/confirmation refactor                       | pending |
| 10  | No-op projection smoke test                                          | minimal projection proves emit → replication → worker → read table end-to-end    | pending |
| 11  | `apps/timeline/` budget-violation surface                            | timeline events for budget violations, founder-readable copy                     | pending |
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
