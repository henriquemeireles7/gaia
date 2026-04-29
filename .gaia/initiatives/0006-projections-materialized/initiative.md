---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Triple-rendering every projection (admin UI + MCP capability descriptor + pricing descriptor) over a single Drizzle schema, with each projection paired to a materialization worker consuming the event stream, lets the operational back office render at memory speed AND advertise to agents AND meter for billing — from one definition. The conceptual model the developer writes is preserved; the runtime model under it is committed.
falsifier: After Wave 1 ships, ≥1 admin page renders against a live query rather than a materialized read table, OR ≥1 projection lacks an MCP descriptor, OR ≥1 projection lacks a pricing descriptor. Window: through Wave 4 ship-date.
measurement:
  {
    metric: 'p99 admin-page render latency under 1k concurrent users + count of projections missing MCP/pricing descriptors',
    source: 'k6 load test against admin app + grep audit of projections/ folder',
    baseline: 'N/A (pre-Wave-1)',
    threshold: 'p99 < 100ms under 1k concurrent + 0 missing descriptors',
    window_days: 60,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 1
status: not-started
---

# Initiative 0006 — Wave 1: Reactive Triple-Rendered Projections, Materialized

The operational back office, projected at runtime from the Drizzle schema, triple-rendered for humans, agents, and the meter. Each projection ships with two artifacts: the conceptual function (input is schema/events, outputs are admin UI + MCP descriptor + pricing descriptor) and a generated materialization worker (an iii Function in `packages/materialization/workers/` from 0005) that consumes the event stream and maintains the projection's read state.

## 1. Context / Research

The schema-as-multiple-things idea — admin AND agent capability AND priced SKU, simultaneously — is the v4 thesis. v5 adds the runtime characterization: every projection also declares a materialization handler that consumes the event stream and maintains the projection's read state incrementally. Reads never hit the events table; they hit memory.

Today's state (post-0005): `packages/materialization/workers/` exists with the worker scaffold, replication-stream consumer, snapshot infrastructure. A no-op projection smoke test proves the pipeline. But there are no real projections — no admin pages render, no MCP capabilities advertise CRUD operations, no priced events fire on user-list reads. Wave 1 is what populates those surfaces.

Why now: every later wave's projections come for free with the same performance characteristics IF Wave 1 establishes the projection-and-materialization thesis on the highest-visibility surface. The admin is what humans see. The MCP descriptors are what agents and other instances see. The pricing descriptors are what the meter sees. The materialization workers are what makes all three render at memory speed. They are the same projection.

The category-defining version: the admin renders Linear-fast because every read hits a materialized projection maintained incrementally by the runtime. The founder writes one projection definition; the system spawns a worker that maintains the read state continuously; reads hit memory. Retool can't do this because their projections aren't materialized. Sanity can't do this because their content layer doesn't have an event substrate. The materialization commitment is what makes the architecture operationally fast.

## 2. Strategy

**Problem**: 0005 ships the materialization runtime, but a runtime with no projections is a tree falling in an empty forest. Wave 1 is the wave that proves the model — admin pages render at memory speed, agents see typed CRUD capabilities, the meter watches every read and write.

**Approach** (chosen): four projection families ship in 0006, each with their materialization handler:

- `crud/` — schema → admin pages + MCP entity capabilities + pricing
- `forms/` — schema → typed forms + MCP write capabilities + pricing
- `client/` — schema → typed Eden Treaty client (no materialization needed; built at compile time)
- `audit/` — event log → audit views + MCP queries + pricing

The conversational command palette inside the admin uses 0004's streaming conversation package (with 0005's streaming spine). "Show me users who churned last month" produces a query result rendered from the materialized projection at memory speed (tens of milliseconds), a saved view persisted as a derived projection, and an audit event. "Add a 'priority' field to support tickets" walks the founder through a confirmed migration that: applies the schema change, registers the new projection version with iii's discovery, spawns the new materialization worker, replays historical events through the worker to build initial state, advertises through MCP and the admin once materialization completes.

**Cap table** (what 0006 ships v1.0):

| Surface            | Ships v1.0                                                                                    | Capped                                                |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/admin/`      | Admin app rendering against materialized projections; conversational command palette built-in | Custom admin layouts (defer to v1.1)                  |
| CRUD projections   | `packages/projections/crud/` + materialize.ts; admin pages + MCP descriptors + pricing        | Bulk-edit operations beyond row-level CRUD            |
| Form projections   | `packages/projections/forms/` + materialize.ts; typed forms + MCP write descriptors + pricing | Multi-step forms with conditional branches            |
| Client projections | `packages/projections/client/` — Eden Treaty client surfaces (no materialization)             | —                                                     |
| Audit projections  | `packages/projections/audit/` + materialize.ts; audit views + MCP query descriptors + pricing | Cross-tenant audit (pure single-tenant in v1.0)       |
| Schema migrations  | Conversational migration flow with streaming progress indicator during materialization replay | Migration rollback via UI (CLI fallback only in v1.0) |

**Preserved**: triple-rendering principle from v4 — every projection produces human, MCP, and pricing outputs.

## 3. Folder Structure

```
santiago/
├── apps/
│   └── admin/                        # NEW — visual operating surface, every read at memory speed
│
└── packages/
    └── projections/                  # NEW — runtime views from schema/events (triple-rendered)
        ├── crud/                     # NEW — schema → admin pages + MCP capabilities + pricing
        │   └── materialize.ts        # event-to-state mutation handler (per projection)
        ├── forms/                    # NEW — schema → typed forms + MCP write capabilities + pricing
        │   └── materialize.ts
        ├── client/                   # NEW — schema → typed Eden Treaty client (no materialize.ts)
        └── audit/                    # NEW — event log → audit views + MCP queries + pricing
            └── materialize.ts
```

The minimal addition reflects how much Wave 0 already shipped. The MCP server with push exists (0005). The streaming conversation package exists (0005). The metering package exists (0004). The materialization runtime exists (0005). This wave adds projections that _populate_ those surfaces, with each projection declaring its own materialization handler.

## 4. Implementation

**Order of operations**:

1. `apps/admin/` skeleton — host shell with the conversational command palette wired to `packages/conversation/stream/`. No projections yet; renders an empty state.
2. `packages/projections/crud/` + materialize.ts — first projection. CRUD on the simplest entity (e.g. users). Admin page renders the entity table from materialized state. MCP descriptors advertise list/get/create/update/delete capabilities. Pricing descriptors emit per read/write.
3. `packages/projections/forms/` + materialize.ts — typed forms surface. Form state caches and validation rules maintained from current schema. MCP write capabilities advertise.
4. `packages/projections/client/` — Eden Treaty client surfaces (compile-time, no materialization). Generated from current schema.
5. `packages/projections/audit/` + materialize.ts — audit views over the event log. MCP query descriptors. Audit-specific event filtering and indexing.
6. Conversational migration flow — "Add a 'priority' field to support tickets" walks through schema change, projection version registration, new materialization worker spawn, historical event replay (with streaming progress indicator), v1 deprecation window.
7. Smoke test: admin renders against k6 load (1k concurrent users), p99 < 100ms.

**Risks**:

1. **Materialization replay for high-event-count projections takes minutes, blocking schema migrations.** Mitigation: streaming progress indicator surfaces the wait; v1 projection keeps materializing in parallel during deprecation; founder is told "processed X of Y events" and can decide to wait or revert.
2. **MCP descriptors grow stale relative to schema.** Mitigation: the projection function is the single source of truth — the descriptor is generated from it, not maintained separately.
3. **Pricing descriptors collide with capability bundles (Wave 4).** Mitigation: pricing descriptors v1.0 emit per-projection events; capability-bundle pricing in Wave 4 reads those same events but groups them differently. No retrofit needed.
4. **The conversational command palette feels separate from the admin instead of part of it.** Mitigation: streaming conversation package is the same one chat uses; the palette is a specialized lens on chat, not a new surface.

**Out of scope**:

- Custom admin layouts (v1.1).
- Cross-tenant audit views (deferred — single-tenant v1.0).
- Multi-step forms with conditional branches (v1.1).
- Capability-bundle metering (Wave 4 layers on top of per-projection pricing).

## 5. PR Breakdown

| PR  | Title                                                      | Files (high-level)                                                                      | Status  |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| 1   | `apps/admin/` skeleton with conversational command palette | shell, command-palette wired to `packages/conversation/stream/`, empty-state            | pending |
| 2   | `packages/projections/crud/` + materialize.ts              | CRUD projection on first entity, admin page, MCP descriptors, pricing                   | pending |
| 3   | `packages/projections/forms/` + materialize.ts             | typed-forms surface, MCP write descriptors, pricing                                     | pending |
| 4   | `packages/projections/client/`                             | Eden Treaty client surfaces, compile-time generation                                    | pending |
| 5   | `packages/projections/audit/` + materialize.ts             | audit views over event log, MCP query descriptors, pricing                              | pending |
| 6   | Conversational migration flow                              | schema-change command, projection version registration, replay progress UI              | pending |
| 7   | Saved view persistence as derived projection               | `Show me users who churned last month` → saved view → derived projection                | pending |
| 8   | k6 load test + p99 < 100ms verification                    | load script, perf budget assertion in CI                                                | pending |
| 9   | Wave 1 audit                                               | every projection has triple-rendered outputs + materialize.ts; 0 live-query admin pages | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                                    | Source                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| F-1 | Wave 1 = Initiative 0006. Cannot start until both 0004 and 0005 ship.                                                                       | Founder 2026-04-29                      |
| F-2 | Four projection families ship: crud, forms, client, audit. Three with materialize.ts; client is compile-time.                               | Founder 2026-04-29 (v5 vision §Wave 1)  |
| F-3 | Triple-rendering is non-negotiable: every projection emits admin UI + MCP descriptor + pricing descriptor.                                  | Founder 2026-04-29 (v5 vision §Wave 1)  |
| F-4 | Schema migrations stream their replay progress visibly. Founders see "processed X of Y events" — they don't need to know "materialization." | Founder 2026-04-29 (v5 vision §Wave 1)  |
| F-5 | Cross-tenant audit out of scope v1.0. Single-tenant only.                                                                                   | Founder 2026-04-29                      |
| F-6 | Conversational command palette is a specialized lens on `packages/conversation/stream/`, not a separate surface.                            | Founder 2026-04-29 (v5 vision §Wave 1)  |
| F-7 | p99 admin render latency budget: <100ms under 1k concurrent users. Hard CI gate.                                                            | Founder 2026-04-29 (v5 vision §10x cut) |
