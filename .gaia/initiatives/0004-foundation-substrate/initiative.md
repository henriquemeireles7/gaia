---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Committing six architectural invariants in Wave 0 — events as append-only stream, hexagonal layering, tenancy from day one, agent-native runtime (iii.dev + MCP + streaming conversation), metering as a projection, and telemetry contribution — before paying customers arrive eliminates the categories of architectural debt that are most expensive to retrofit under load.
falsifier: After Wave 0 ships, ≥1 of the six invariants gets retroactively bypassed (a non-tenant-scoped query, a domain-package importing an adapter, an event mutated post-write, a non-MCP capability surface, a non-projected bill, or telemetry posted synchronously without backpressure). Window: through Wave 4 ship-date.
measurement:
  {
    metric: 'count of invariant violations detected by validate-artifacts.ts + grep audits at end of Wave 4',
    source: '.gaia/rules.ts enforcement + manual audit',
    baseline: 'N/A (pre-Wave-0)',
    threshold: '0 violations',
    window_days: 180,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 0a
status: not-started
---

# Initiative 0004 — Foundation A: Substrate Invariants

The first half of Wave 0. Establishes the architectural primitives every later wave attaches to. The runtime-discipline half (materialization, replicas, iii Function budgets, streaming spine, push notifications) lands in Initiative 0005 — these two ship together as Wave 0 but are split into two initiatives because the substrate must exist before the runtime layer can wrap it.

## 1. Context / Research

Today's state: the repo is a methodology-and-harness skeleton (Initiatives 0001–0003 ship the workflow loop, the bootstrap CLI, and launch hardening). There is no runtime substrate yet — no events table, no MCP server, no conversation streaming, no metering. The v5 vision document (archived as `_archive/2026-04-29-vision-v5-source.md`) commits to seven Wave 0 invariants. This initiative carries the six that descend from v4 (preserved unchanged in v5) and v5's runtime-discipline additions are isolated to 0005.

The strategic premise: agents read first, humans second. Every architectural decision flows from that inversion. Today's templates are AI-assisted; Gaia is agent-native end to end — the chat surface and the timeline surface are primary, the admin is rendered against materialized state, and the MCP endpoint advertises every capability live.

Why now: paying customers are not yet here. Once they arrive, the calcification begins — the four foundational v5 moves (event partition strategy, projection materialization model, cross-instance replication, async function discipline) become months-long migrations rather than design choices. Wave 0 is the only window where these decisions cost a discipline rather than a rewrite.

Named demand evidence: solo founders shipping production SaaS in the agent era — the Lovable-graduate ICP from Initiative 0002 — need an opinionated, agent-native substrate where the first conversation with the system happens in the first 90 seconds after `bun create gaia my-app`.

## 2. Strategy

**Problem**: every later wave's experience surface, economic surface, and network surface attaches to Wave 0. If events are not append-only, audit and replay break. If tenancy is not query-time, multi-tenant deployment is a rewrite. If MCP is not advertised from line one, agents discover nothing. If metering is bolted on later, billing-as-architecture becomes billing-as-product-feature. If telemetry has no backpressure, contribution becomes a denial-of-service vector.

**Approach** (chosen): commit all six substrate invariants in one initiative, with the runtime layer (0005) following immediately. Each invariant ships as one or more packages with strict discipline — domain code never imports adapters, events never mutate post-write, every table carries `tenant_id`, every capability advertises through MCP, every priced operation emits a `capability.invoked` event, every telemetry post goes through an iii Function with backoff.

**Cap table** (what 0004 ships v1.0):

| Surface              | Ships v1.0                                                                                                                                            | Capped                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Locked stack         | Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon Postgres (logical replication enabled), Better Auth, Polar, Resend, Railway              | (no swaps allowed v1.0)                                                 |
| Event log            | `packages/events/` — typed events table, partitioned by `tenant_id` + week-bucketed, logical replication enabled                                      | Reading from raw events table directly (defers to 0005 projections)     |
| Hexagonal layering   | `packages/domain/` (pure, no IO) + `packages/adapters/` boundary discipline                                                                           | —                                                                       |
| Tenancy              | `packages/tenancy/` — query-time invariant, `default` for single-tenant deploys                                                                       | Cross-tenant orchestration (defers to Wave 4 `gaia-cloud/`)             |
| Agent-native runtime | `packages/runtime/` (iii.dev wrapper), `packages/mcp/server` + `registry` + `discovery`, `packages/conversation/parser` + `planner` + `confirmation`  | Push notifications + streaming spine (defer to 0005)                    |
| Metering             | `packages/metering/` — pricing, meter as iii Function, invoice projection                                                                             | —                                                                       |
| Telemetry            | `packages/telemetry/contribute/` (iii Function, batching, backoff) + `consume/` for registry-mode                                                     | Cross-instance replicas (defer to 0005)                                 |
| Apps                 | `apps/chat/` v0.1, `apps/timeline/` v0.1                                                                                                              | Admin app (defers to 0006), composer/marketing/labor/docs (later waves) |
| Onboarding           | `bun create gaia my-app` → working SaaS in ≤90 seconds with auth, payments, MCP endpoint, chat surface, billing meter, telemetry opt-in, deployed URL | Self-healing deploy (Initiative 0002 territory)                         |

**Preserved**: every v4 invariant carries forward unchanged. v5's _additions_ on top of these primitives (materialization handlers, replicas, push, streaming spine, budgets) live in 0005.

## 3. Folder Structure

```
santiago/
├── apps/
│   ├── chat/                         # NEW — conversational interface (parser/planner/confirmation; streaming spine in 0005)
│   └── timeline/                     # NEW — unified observability feed (against materialized views from 0005)
│
├── packages/
│   ├── runtime/                      # NEW — iii.dev integration, execution substrate
│   │   ├── functions/                # all async/scheduled concerns as Functions
│   │   ├── triggers/                 # HTTP, queue, cron, event triggers
│   │   └── workers/                  # worker configurations and lifecycle
│   │
│   ├── events/                       # NEW — append-only stream, partitioned, replicated
│   │   ├── schema/                   # typed event definitions (append-only discipline)
│   │   └── emit/                     # tenant-scoped, partitioned writes
│   │
│   ├── domain/                       # NEW — pure domain logic, no IO
│   ├── tenancy/                      # NEW — tenant-scoping invariants
│   │
│   ├── mcp/                          # NEW — agent + network capability surface
│   │   ├── server/                   # streaming MCP endpoint (token streaming in 0005)
│   │   ├── registry/                 # runtime capability registry (sourced from iii)
│   │   └── discovery/                # capability advertisement
│   │
│   ├── conversation/                 # NEW — natural language layer (streaming spine in 0005)
│   │   ├── parser/                   # intent extraction
│   │   ├── planner/                  # action sequencing
│   │   └── confirmation/             # progressive confirmation rendering
│   │
│   ├── metering/                     # NEW — priced events as windowed aggregations
│   │   ├── pricing/                  # SKU definitions tied to capability bundles
│   │   ├── meter/                    # iii Function aggregating priced events
│   │   └── invoice/                  # invoice projection
│   │
│   ├── telemetry/                    # NEW — backpressured network contribution
│   │   ├── contribute/               # iii Function with explicit batching + backoff
│   │   └── consume/                  # registry-side ingestion
│   │
│   └── adapters/
│       └── llm/                      # NEW — streaming-aware LLM provider wrapper
│
├── .gaia/
│   └── reference/
│       └── architecture/             # NEW — six primitives, four surfaces (runtime thesis lands in 0005)
│
└── .claude/skills/
    └── d-converse/                   # NEW — harness skill for conversation flow
```

## 4. Implementation

**Order of operations** (so nothing breaks mid-build):

1. Lock the stack — Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon (logical replication ON), Better Auth, Polar, Resend, Railway. Write the lockfile commit and freeze.
2. `packages/runtime/` — iii.dev wrapper. Functions, triggers, workers. Establish the package shape that 0005's `budgets/` extends.
3. `packages/events/` — schema (append-only typed events), emit (partitioned by `tenant_id` + week). Logical replication enabled at the Postgres layer; the consumer infrastructure lands in 0005.
4. `packages/domain/` and `packages/tenancy/` — pure domain primitives, tenant-scoping helpers. Establish the import-direction lint rule (`domain/` may not import from `adapters/`).
5. `packages/mcp/{server,registry,discovery}/` — MCP endpoint advertising the iii Function registry. Polling-based subscription in 0004; push notifications in 0005.
6. `packages/conversation/{parser,planner,confirmation}/` — streaming-aware in shape but plumbed against non-streaming LLM responses for v0.1; the streaming spine in 0005 swaps in.
7. `packages/metering/{pricing,meter,invoice}/` — `meter/` is an iii Function over events; reads against the materialized aggregation land in 0005.
8. `packages/telemetry/{contribute,consume}/` — iii Function with explicit batching, exponential backoff. The shared registry runs the same code in `consume/` mode (Gaia-on-Gaia).
9. `apps/chat/` and `apps/timeline/` v0.1 — both render against current state. Memory-speed reads land in 0005 once materialization is online.
10. `packages/adapters/llm/` — streaming-aware wrapper. Non-streaming providers explicitly unsupported.
11. `.gaia/reference/architecture/` — the six primitives + four surfaces, canonical for humans and agents.
12. `.claude/skills/d-converse/` — the harness skill operating the conversation surface during development.
13. Onboarding script: `bun create gaia my-app` provisions the lot in ≤90 seconds. Deploy to Railway. First conversation possible immediately.

**Risks**:

1. **Postgres logical replication misconfigured at provider level.** Mitigation: verify on Neon's free tier with a smoke test before committing to the architecture; if blocked, escalate to Neon support before falling back.
2. **iii.dev integration immature for v0.1 ergonomics.** Mitigation: keep `packages/runtime/` thin enough that the wrapper insulates the codebase from iii API churn; pin to a single iii version.
3. **Tenancy invariant slipping into "we'll add the column later".** Mitigation: `validate-artifacts.ts` rule rejects tables without `tenant_id`; CI fails on violation.
4. **Telemetry contribution feels invasive on first run.** Mitigation: opt-in dialog during `bun create gaia` onboarding; default opt-in but reversible from chat with one sentence.
5. **MCP surface lands without push and feels like 2019 polling.** Mitigation: scope reset — push notifications are 0005, not 0004. The 0004 MCP surface is acceptable to ship as a polling baseline because no external subscribers exist yet.

**Out of scope**:

- Materialization workers (Initiative 0005).
- Replicas package (Initiative 0005).
- Streaming spine in `packages/conversation/stream/` (Initiative 0005).
- Push notifications in `packages/mcp/push/` (Initiative 0005).
- iii Function budget declarations (Initiative 0005).
- Snapshot infrastructure in `packages/events/snapshot/` (Initiative 0005).
- Logical replication consumer infrastructure in `packages/events/stream/` (Initiative 0005).
- Projections (Initiative 0006, Wave 1).
- Admin app (Initiative 0006, Wave 1 hosts it).

## 5. PR Breakdown

| PR  | Title                                                              | Files (high-level)                                                                             | Status  |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------- |
| 1   | Lock the stack                                                     | `package.json`, `bun.lock`, `tsconfig.base.json`, `drizzle.config.ts`, Neon provisioning notes | pending |
| 2   | `packages/runtime/` — iii.dev wrapper (functions/triggers/workers) | `packages/runtime/{functions,triggers,workers}/`                                               | pending |
| 3   | `packages/events/` — append-only schema + emit                     | `packages/events/{schema,emit}/`, Postgres logical replication enabled                         | pending |
| 4   | `packages/domain/` + `packages/tenancy/` + import-direction rule   | `packages/{domain,tenancy}/`, `validate-artifacts.ts` rule                                     | pending |
| 5   | `packages/mcp/{server,registry,discovery}/`                        | MCP endpoint advertising iii registry (polling-based, no push)                                 | pending |
| 6   | `packages/conversation/{parser,planner,confirmation}/`             | streaming-aware shape, non-streaming v0.1 plumbing                                             | pending |
| 7   | `packages/adapters/llm/` — streaming-aware wrapper                 | wrapper interface, OpenAI/Anthropic adapters                                                   | pending |
| 8   | `packages/metering/{pricing,meter,invoice}/`                       | pricing SKUs, `meter/` as iii Function, invoice projection                                     | pending |
| 9   | `packages/telemetry/{contribute,consume}/`                         | iii Function with batching + backoff; registry-mode `consume/`                                 | pending |
| 10  | `apps/chat/` v0.1                                                  | streaming-shape conversational interface (no streaming spine yet)                              | pending |
| 11  | `apps/timeline/` v0.1                                              | unified observability feed (against current state, not yet materialized)                       | pending |
| 12  | `.gaia/reference/architecture/`                                    | six primitives + four surfaces canonical reference                                             | pending |
| 13  | `.claude/skills/d-converse/`                                       | harness skill for conversation flow                                                            | pending |
| 14  | `bun create gaia` onboarding script + Railway deploy               | scaffolder + Railway provisioning + smoke test                                                 | pending |
| 15  | End-of-wave invariant audit                                        | grep + `validate-artifacts.ts` audit; 0 violations across the six invariants                   | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                                                   | Source                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1 | Wave 0 splits into Initiative 0004 (substrate, six v4 invariants) and Initiative 0005 (runtime, v5 additions). Both ship before Wave 1 (0006).             | Founder 2026-04-29 (post-v5-vision)    |
| F-2 | Six v4 invariants ship in 0004 unchanged from v4: events, hexagonal, tenancy, agent-native runtime, metering, telemetry contribution.                      | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-3 | Locked stack frozen v1.0: Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon, Better Auth, Polar, Resend, Railway. No swaps allowed v1.0.        | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-4 | Logical replication enabled on Neon Postgres from day one. Consumer infrastructure ships in 0005 — but the _capability_ is on at the DB layer immediately. | Founder 2026-04-29 (v5 calcification)  |
| F-5 | `bun create gaia my-app` target: ≤90 seconds to a deployed URL with auth, payments, MCP, chat, billing meter, telemetry opt-in.                            | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-6 | Telemetry contribution opt-in by default, reversible from chat. Cost in basis points of compute, not percent.                                              | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-7 | Hexagonal lint rule enforced in CI: `packages/domain/` may not import from `packages/adapters/`.                                                           | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-8 | Tenancy invariant enforced via `validate-artifacts.ts`: tables without `tenant_id` fail `bun run check`.                                                   | Founder 2026-04-29 (v5 vision §Wave 0) |
