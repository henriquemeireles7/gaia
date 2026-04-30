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

<!-- /autoplan restore point: ~/.gstack/projects/henriquemeireles7-gaia/0004-substrate-harden-autoplan-restore-20260429-024838.md -->

# Initiative 0004 — Foundation A: Substrate Invariants

The first half of Wave 0. Establishes the architectural primitives every later wave attaches to. The runtime-discipline half (materialization, replicas, iii Function budgets, streaming spine, push notifications) lands in Initiative 0005 — these two ship together as Wave 0 but are split into two initiatives because the substrate must exist before the runtime layer can wrap it.

## 1. Context / Research

Today's state: the repo is the v1 SaaS template scaffold — `apps/{api,web}` plus `packages/{adapters,auth,config,core,db,errors,security,ui,workflows}` already ship working Better Auth, Polar billing + webhooks, Resend email, Inngest workflows (one function: `sendWelcome`), OpenTelemetry observability, ProviderError + AppError, route-guard + security-headers primitives, and a SolidStart frontend with the standard SaaS routes (index, login, signup, dashboard, billing, forgot-password). The methodology layer (Initiatives 0001–0003: workflow loop, bootstrap CLI, launch hardening) sits alongside it. What is missing is the substrate the v5 vision pins: events as truth, `tenant_id` as enforced invariant, MCP as capability surface, conversation as first-class UI, metering as a projection over events, telemetry as a backpressured iii Function. The v5 vision document (archived as `_archive/2026-04-29-vision-v5-source.md`) commits to seven Wave 0 invariants; this initiative carries the six that descend from v4 (preserved unchanged in v5) and v5's runtime-discipline additions are isolated to 0005. **0004 layers on top of the existing scaffold rather than replacing it**, and migrates Inngest → iii.dev as one of its first moves (PR 2). See §7.15 for the full reconciliation between the existing scaffold and the substrate this initiative adds.

The strategic premise: agents read first, humans second. Every architectural decision flows from that inversion. Today's templates are AI-assisted; Gaia is agent-native end to end — the chat surface and the timeline surface are primary, the admin is rendered against materialized state, and the MCP endpoint advertises every capability live.

Why now: paying customers are not yet here. Once they arrive, the calcification begins — the four foundational v5 moves (event partition strategy, projection materialization model, cross-instance replication, async function discipline) become months-long migrations rather than design choices. Wave 0 is the only window where these decisions cost a discipline rather than a rewrite.

Named demand evidence: solo founders shipping production SaaS in the agent era — the Lovable-graduate ICP from Initiative 0002 — need an opinionated, agent-native substrate where the first conversation with the system happens in the first 90 seconds after `bun create gaia-app my-app`.

## 2. Strategy

**Problem**: every later wave's experience surface, economic surface, and network surface attaches to Wave 0. If events are not append-only, audit and replay break. If tenancy is not query-time, multi-tenant deployment is a rewrite. If MCP is not advertised from line one, agents discover nothing. If metering is bolted on later, billing-as-architecture becomes billing-as-product-feature. If telemetry has no backpressure, contribution becomes a denial-of-service vector.

**Approach** (chosen): commit all six substrate invariants in one initiative, with the runtime layer (0005) following immediately. Each invariant ships as one or more packages with strict discipline — domain code never imports adapters, events never mutate post-write, every table carries `tenant_id`, every capability advertises through MCP, every priced operation emits a `capability.invoked` event, every telemetry post goes through an iii Function with backoff.

**Cap table** (what 0004 ships v1.0):

| Surface              | Ships v1.0                                                                                                                                                                 | Capped                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Locked stack         | Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon Postgres (logical replication enabled), Better Auth, Polar, Resend, Railway                                   | (no swaps allowed v1.0)                                                                                                                                                              |
| Event log            | `packages/events/` — typed events table, partitioned by `tenant_id` + week-bucketed, logical replication enabled                                                           | Reading from raw events table directly (defers to 0005 projections)                                                                                                                  |
| Hexagonal layering   | `packages/domain/` (pure, no IO) + `packages/adapters/` boundary discipline                                                                                                | —                                                                                                                                                                                    |
| Tenancy              | `packages/tenancy/` — query-time invariant, `default` for single-tenant deploys                                                                                            | Cross-tenant orchestration (defers to Wave 4 `gaia-cloud/`)                                                                                                                          |
| Agent-native runtime | `packages/runtime/` (iii.dev wrapper), `packages/mcp/server` + `registry` + `discovery`, `packages/conversation/parser` + `planner` + `confirmation`                       | Push notifications + streaming spine (defer to 0005)                                                                                                                                 |
| Metering             | `packages/metering/` — pricing, meter as iii Function, invoice projection                                                                                                  | —                                                                                                                                                                                    |
| Telemetry            | `packages/telemetry/contribute/` (iii Function, batching, backoff) + `consume/` for registry-mode                                                                          | Cross-instance replicas (defer to 0005)                                                                                                                                              |
| Apps                 | `apps/web/src/routes/chat.tsx` + `apps/web/src/routes/timeline.tsx` v0.1 (added to existing SolidStart app, not separate apps); MCP plugin mounted at `/mcp` in `apps/api` | Admin app (defers to 0006), composer/marketing/labor/docs (later waves); separate `apps/chat/` + `apps/timeline/` SolidStart instances (consolidated into apps/web routes per §7.15) |
| Onboarding           | `bun create gaia-app my-app` → working SaaS in ≤90 seconds with auth, payments, MCP endpoint, chat surface, billing meter, telemetry opt-in, deployed URL                  | Self-healing deploy (Initiative 0002 territory)                                                                                                                                      |

**Preserved**: every v4 invariant carries forward unchanged. v5's _additions_ on top of these primitives (materialization handlers, replicas, push, streaming spine, budgets) live in 0005.

## 3. Folder Structure

The repo today already has `apps/{api,web}` and `packages/{adapters,auth,config,core,db,errors,security,ui,workflows}`. 0004 extends, refactors, and (in one case) retires existing modules; it does not greenfield. Disposition column: **KEEP** = no source change, **EXTEND** = additive change, **REFACTOR** = file restructure with same external contract, **RETIRE** = deleted in this initiative, **NEW** = does not exist today.

```
gaia/  (working copy: san-diego)
├── apps/
│   ├── api/                          # KEEP + EXTEND (PR 2, 5, 8) — Elysia server. PR 2 swaps /api/inngest for iii.dev workers. PR 5 mounts MCP plugin at /mcp. PR 8 emits capability.invoked from billing routes.
│   │   ├── server/app.ts             # EDIT in PR 2, 5, 8
│   │   ├── server/billing.ts         # EDIT in PR 8 (emit capability.invoked; reuse existing Polar webhook idempotency)
│   │   └── scripts/{migrate,seed}.ts # KEEP (db migration runner stays the same)
│   └── web/                          # KEEP + EXTEND (PR 10, 11) — SolidStart frontend.
│       └── src/
│           ├── routes/
│           │   ├── index.tsx, login.tsx, signup.tsx, dashboard.tsx,
│           │   ├── billing.tsx, forgot-password.tsx          # KEEP
│           │   ├── chat.tsx                                  # NEW (PR 10)
│           │   ├── timeline.tsx                              # NEW (PR 11)
│           │   └── healthz.ts                                # NEW (PR 11) — combined DB + MCP + iii.dev probe
│           └── components/
│               ├── (existing card/button/modal/...)          # KEEP
│               ├── chat/                                     # NEW (PR 10) — chat.tsx, system-banner.tsx
│               └── timeline/                                 # NEW (PR 11) — feed.tsx, error-event.tsx
│
├── packages/
│   ├── adapters/                     # KEEP + REFACTOR (PR 6) — vendor adapters. ai.ts → llm/ subdir refactor.
│   │   ├── ai.ts                     # RETIRED in PR 6 (replaced by llm/)
│   │   ├── payments.ts, email.ts,    # KEEP
│   │   ├── analytics.ts, storage.ts, # KEEP
│   │   ├── markdown.ts, errors.ts    # KEEP
│   │   └── llm/                      # NEW (PR 6) — streaming AsyncIterable<LLMChunk> contract
│   │       ├── types.ts              # LLMChunk + LLM stream contract
│   │       ├── stream.ts             # complete() wrapper (exhausts stream for non-streaming callers)
│   │       ├── select.ts             # provider selection from env
│   │       ├── anthropic.ts          # streaming Anthropic adapter (replaces ai.ts logic)
│   │       └── openai.ts             # streaming OpenAI adapter (NEW provider; OpenAI not in repo today)
│   │
│   ├── auth/                         # KEEP — Better Auth wrapper. PR 4 wires tenant_members lookup.
│   ├── config/                       # KEEP — env loading. PR 1 adds IIIDEV_*, AXIOM_TOKEN already present.
│   ├── core/                         # KEEP — logger, observability. Used by packages/runtime/.
│   ├── db/                           # KEEP + EXTEND (every PR with a table) — Drizzle schema + client.
│   │   ├── schema.ts                 # SPLIT in PR 4 → schema/<entity>.ts files (already specified in packages/db/CLAUDE.md)
│   │   ├── schema/                   # NEW directory in PR 4
│   │   │   ├── index.ts              # re-exports all entities
│   │   │   ├── _shared.ts            # shared timestamp/tenant column helpers
│   │   │   ├── users.ts, sessions.ts, accounts.ts, verifications.ts # SPLIT from existing schema.ts (Better Auth tables)
│   │   │   ├── subscriptions.ts, webhook-events.ts, api-keys.ts     # SPLIT + EXTEND with tenant_id (PR 4)
│   │   │   ├── tenant-members.ts     # NEW (PR 4)
│   │   │   ├── events.ts             # NEW (PR 3) — append-only event log table
│   │   │   ├── meter-snapshot.ts     # NEW (PR 8)
│   │   │   ├── polar-webhook-dedup.ts # NEW (PR 8) — note: existing `webhook_events` already provides idempotency for Polar; this table is only added if PR 8 needs polar-specific dedup beyond the generic table
│   │   │   └── function-failures.ts  # NEW (PR 2) — runtime DLQ
│   │   ├── client.ts                 # KEEP
│   │   └── migrations/               # KEEP — single migration directory; new tables land here via drizzle-kit generate
│   │
│   ├── errors/                       # KEEP — AppError + typed error codes
│   ├── security/                     # KEEP — route guards, headers, audit log. PR 5 reuses for MCP server.
│   ├── ui/                           # KEEP — design tokens consumed by apps/web
│   ├── workflows/                    # RETIRE in PR 2 — Inngest client + sendWelcome migrate to packages/runtime/
│   │
│   ├── runtime/                      # NEW (PR 2) — iii.dev wrapper, replaces packages/workflows/
│   │   └── src/
│   │       ├── define-function.ts    # defineFunction({name, trigger, budget?, handler}) wrapper signature
│   │       ├── context.ts            # AsyncLocalStorage Ctx: {tenantId, requestId, emit, logger}
│   │       ├── circuit-breaker.ts    # iii outage handling — chat surface degradation banner
│   │       ├── dlq.ts                # function_failures table accessor; emits function.failed events
│   │       ├── triggers/             # http.ts, queue.ts, cron.ts, event.ts
│   │       ├── workers/lifecycle.ts  # boot/register/shutdown
│   │       └── functions/            # migrated welcome-email function lives here
│   │
│   ├── events/                       # NEW (PR 3) — append-only stream emit helpers (schema in packages/db/schema/events.ts)
│   │   └── src/
│   │       ├── schema/               # TypeScript event types (Drizzle row → typed event registry)
│   │       │   ├── types.ts          # base event type + helpers
│   │       │   ├── registry.ts       # TypeBox catalogue of event types (capability.invoked, error.*, etc.)
│   │       │   ├── capability-invoked.ts
│   │       │   └── error.ts
│   │       └── emit/
│   │           ├── emit.ts           # emit({type, version, aggregateId?, payload})
│   │           ├── context.ts        # EmitContext token (allowlisted callers only)
│   │           └── concurrency.ts    # optimistic concurrency on aggregate_version
│   │
│   ├── domain/                       # NEW (PR 4) — pure domain primitives (TenantId, EventId, etc.)
│   │   └── src/{index.ts, primitives.ts}
│   │
│   ├── tenancy/                      # NEW (PR 4) — tenancy invariants
│   │   └── src/
│   │       ├── types.ts              # TenantId branded type
│   │       ├── run.ts                # tenancy.run(tenantId, fn) wraps in tx + SET LOCAL app.tenant_id
│   │       ├── members.ts            # tenant_members accessor (Better Auth user → tenant resolution)
│   │       └── allowlist.ts          # Better Auth tables exempt from tenant_id requirement
│   │   # RLS policies live in packages/db/migrations/ (generated SQL)
│   │
│   ├── mcp/                          # NEW (PR 5) — agent + network capability surface
│   │   ├── server/                   # Elysia plugin mounted at /mcp by apps/api/server/app.ts
│   │   │   └── src/{plugin.ts, auth.ts, rate-limit.ts, invoke.ts}
│   │   ├── registry/                 # runtime capability registry (reads iii Function defs)
│   │   │   └── src/{registry.ts, poll.ts}
│   │   └── discovery/                # MCP capabilities/list response formatter
│   │       └── src/advertise.ts
│   │
│   ├── conversation/                 # NEW (PR 7) — natural language layer
│   │   ├── parser/src/{parser.ts, timeout.ts}
│   │   ├── planner/src/planner.ts
│   │   └── confirmation/src/confirmation.ts
│   │
│   ├── metering/                     # NEW (PR 8)
│   │   ├── pricing/src/{skus.ts, rates.ts}            # pure pricing types (domain layer)
│   │   ├── meter/src/{meter.ts, snapshot.ts}          # iii Function aggregating capability.invoked → billing.aggregated
│   │   └── invoice/                                   # invoice projection types
│   │       └── src/{invoice.ts, polar/{webhook.ts, idempotency.ts}}
│   │
│   ├── telemetry/                    # NEW (PR 9) — backpressured network contribution
│   │   ├── contribute/src/{schema.ts, hash.ts, queue.ts, backoff.ts, contribute.ts}
│   │   └── consume/src/consume.ts
│   │
│   └── create-gaia-app/                  # NEW (PR 14) — `bun create gaia-app my-app` scaffolder
│       ├── src/{cli.ts, online.ts, check-name.ts, validate-keys.ts, scaffold.ts, railway.ts, telemetry-prompt.ts, timing.ts}
│       └── template/                 # snapshot of the repo state at PR 13 merge
│
├── scripts/                          # EXISTING — bun run check pipeline
│   ├── validate-artifacts.ts         # EXTEND in PR 4 (and 3, 5, 8) — already exists for initiative frontmatter; PR 4 generalizes with rule modules for tenant_id, hexagonal layering, append-only, capability.invoked emit allowlist
│   ├── lib/{layer-table.ts, postgres-introspect.ts, ts-import-graph.ts} # NEW (PR 4)
│   ├── audit-wave-0-checkpoint-1.ts  # NEW (PR 15a)
│   ├── audit-wave-0-checkpoint-2.ts  # NEW (PR 15b)
│   ├── audit-wave-0.ts               # NEW (PR 15)
│   ├── test-onboarding.ts            # NEW (PR 14) — timed E2E from `bun create gaia` to /healthz
│   └── smoke/                        # NEW (PR 0)
│       ├── neon-logical-replication.ts
│       ├── iii-wrap-shapes.ts
│       └── better-auth-tenant.ts
│
├── .github/workflows/
│   ├── ci.yml                        # KEEP + EXTEND (PR 1, 14, 15) — lint+typecheck+test+harden+validate-artifacts
│   ├── smoke.yml                     # NEW (PR 0)
│   ├── audit-checkpoint-1.yml        # NEW (PR 15a)
│   └── audit-checkpoint-2.yml        # NEW (PR 15b)
│
├── .gaia/
│   └── reference/
│       └── architecture/             # NEW (PR 12) — six primitives, four surfaces (runtime thesis lands in 0005)
│           └── {CLAUDE.md, six-primitives.md, four-surfaces.md, hexagonal.md}
│
└── .claude/skills/
    └── w-converse/                   # NEW (PR 13) — harness skill for conversation flow
        └── {SKILL.md, reference.md}
```

## 4. Implementation

**Order of operations** (so nothing breaks mid-build). PR numbers map to §5 / §5b. Existing scaffold remains running throughout.

0. **PR 0 — Smoke test.** Verify Neon supports logical replication, iii.dev v0.1 ergonomics wrap cleanly, Better Auth integrates with `tenant_members` join. Gates PR 1.
1. **PR 1 — Lock the stack.** Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon (logical replication ON), Better Auth, Polar, Resend, Railway are already pinned in root `package.json`; PR 1 adds **iii.dev** (currently absent) and reaffirms remaining pins. Add `IIIDEV_*` env vars to `packages/config/env.ts`.
2. **PR 2 — `packages/runtime/` + retire `packages/workflows/`.** iii.dev wrapper (`defineFunction`, AsyncLocalStorage `Ctx`, circuit breaker, DLQ). Migrate the existing `sendWelcome` Inngest function as the proof of swap. Delete `packages/workflows/`; remove `inngest` dependency from root `package.json`; rewire `apps/api/server/app.ts` (drop `/api/inngest` route, register iii.dev workers).
3. **PR 3 — `packages/events/` + events table.** Add `packages/db/schema/events.ts` (append-only, partitioned by `tenant_id` + weekly), generate migration with `events_writer` role + BEFORE-UPDATE/DELETE trigger + `wal_level=logical` + `CREATE PUBLICATION events_pub`. Package owns emit helpers (`emit.ts`, `EmitContext`, optimistic concurrency on `aggregate_version`).
4. **PR 4 — `packages/domain/` + `packages/tenancy/` + RLS + `validate-artifacts.ts` extension.** Split existing `packages/db/schema.ts` into per-entity files under `packages/db/schema/` (the layout `packages/db/CLAUDE.md` already prescribes). Add `tenant_members` table. Backfill `tenant_id` on existing application tables (`subscriptions`, `webhook_events`, `api_keys`); RLS policies on the same. Better Auth tables (`users`, `sessions`, `accounts`, `verifications`) on the permanent allowlist. Extend the existing `.gaia/rules/checks/validate-artifacts.ts` with rule modules for hexagonal layering, `tenant_id` presence, append-only `events` writes, capability.invoked emit allowlist.
5. **PR 5 — `packages/mcp/{server,registry,discovery}/`.** MCP server is an Elysia plugin mounted at `/mcp` in `apps/api/server/app.ts`, alongside the existing `/auth/*`, `/webhooks/polar`, `/health/*` routes. Reuses Better Auth bearer + `applySecurityHeaders` + `protectedRoute` patterns.
6. **PR 6 — `packages/adapters/llm/` (refactor of `packages/adapters/ai.ts`).** Streaming-aware `AsyncIterable<LLMChunk>` contract. Existing non-streaming `complete()` becomes a wrapper that exhausts the stream. Anthropic adapter reuses today's `ai.ts` logic; OpenAI adapter is genuinely new (only Anthropic SDK is in repo today). Update `packages/adapters/CLAUDE.md` exports table.
7. **PR 7 — `packages/conversation/{parser,planner,confirmation}/`.** Streaming-shape, plumbed against non-streaming LLM responses for v0.1; streaming spine in 0005 swaps in. Consumes `packages/adapters/llm`.
8. **PR 8 — `packages/metering/{pricing,meter,invoice}/` + meter snapshot anchor.** `meter` is an iii Function over events; `pricing` types pure (domain layer); `invoice` projection types pure. Integrates with **existing** Polar webhook handler in `apps/api/server/billing.ts` — signature verification + idempotency-via-`webhook_events`-table already exist; PR 8 reuses them and adds the `capability.invoked` emit on billing actions. Adds `meter_snapshot(tenant_id, last_seq, aggregate)` resume anchor.
9. **PR 9 — `packages/telemetry/{contribute,consume}/`.** iii Function with bounded queue + exponential backoff. Payload schema snapshot test. Consume mode for Gaia-on-Gaia registry deploys.
10. **PR 10 — Chat surface (routes in `apps/web`).** `apps/web/src/routes/chat.tsx` + `apps/web/src/components/chat/{chat.tsx,system-banner.tsx}`. **Not** a separate `apps/chat/` SolidStart instance.
11. **PR 11 — Timeline surface (routes in `apps/web`) + healthz.** `apps/web/src/routes/timeline.tsx` + `apps/web/src/routes/healthz.ts` (combined DB + MCP + iii.dev probe; Railway healthcheck pins here). Errors render as `error.*` events in the feed; no Sentry beyond what's already wired.
12. **PR 12 — `.gaia/reference/architecture/`.** Six primitives + four surfaces canonical reference.
13. **PR 13 — `.claude/skills/w-converse/`.** Harness skill operating the conversation surface during development.
14. **PR 14 — `packages/create-gaia-app/` + Railway deploy.** Snapshot the repo at PR 13 merge as the template; CLI provisions Railway + validates Polar/Resend keys + telemetry opt-in default. Target: ≤90s `bun create gaia-app my-app` → deployed `/healthz` 200.
15. **PRs 15a / 15b / 15 — Audit checkpoints.** Mid-wave (after PR 4 + PR 9) and end-of-wave invariant audits.

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

| PR  | Title                                                                         | Files (high-level)                                                                                                                                                                                                                                                                                                    | Status  |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | Dependency smoke test (gates PR 1)                                            | Neon logical replication smoke test, iii.dev v0.1 wrap-3-shapes (function/queue/cron), Better Auth + tenant lint                                                                                                                                                                                                      | pending |
| 1   | Lock the stack                                                                | `package.json`, `bun.lock`, `tsconfig.base.json`, `drizzle.config.ts`, Neon provisioning notes                                                                                                                                                                                                                        | pending |
| 2   | `packages/runtime/` (iii.dev wrapper) + retire `packages/workflows/`          | `packages/runtime/src/{define-function,context,circuit-breaker,dlq,triggers/*,workers/*}.ts`, edit `apps/api/server/app.ts` (drop `/api/inngest`, register iii.dev), delete `packages/workflows/`, remove `inngest` from root deps                                                                                    | pending |
| 3   | `packages/events/` — emit helpers + append-only schema in `packages/db/`      | `packages/events/src/{schema,emit}/`, `packages/db/schema/events.ts`, migration in `packages/db/migrations/` (partition + `events_writer` role + UPDATE/DELETE trigger + `CREATE PUBLICATION events_pub`)                                                                                                             | pending |
| 4   | `packages/domain/` + `packages/tenancy/` + RLS + `validate-artifacts.ts`      | `packages/{domain,tenancy}/`, split `packages/db/schema.ts` → `packages/db/schema/<entity>.ts`, add `tenant_members`, backfill `tenant_id` on `subscriptions`/`webhook_events`/`api_keys`, RLS policies, extend existing `.gaia/rules/checks/validate-artifacts.ts` with hexagonal/tenant_id/append-only rule modules | pending |
| 5   | `packages/mcp/{server,registry,discovery}/`                                   | Elysia plugin mounted at `/mcp` in `apps/api/server/app.ts`, Better Auth bearer reused, per-tenant rate limit (uses `packages/metering/pricing/rates`), 5s poll w/ exp backoff                                                                                                                                        | pending |
| 6   | `packages/adapters/llm/` — refactor of `packages/adapters/ai.ts` to streaming | Delete `packages/adapters/ai.ts`; create `packages/adapters/llm/{types,stream,select,anthropic,openai}.ts` with `AsyncIterable<LLMChunk>` contract; `complete()` becomes wrapper-over-stream; add OpenAI dep                                                                                                          | pending |
| 7   | `packages/conversation/{parser,planner,confirmation}/`                        | streaming-aware shape, non-streaming v0.1 plumbing, 30s timeout + retry copy                                                                                                                                                                                                                                          | pending |
| 8   | `packages/metering/{pricing,meter,invoice}/` + meter snapshot anchor          | pricing SKUs, `meter/` as iii Function, invoice projection, `meter_snapshot` table in `packages/db/schema/`, edit `apps/api/server/billing.ts` to emit `capability.invoked` (reuses existing Polar webhook signature verification + `webhook_events` idempotency)                                                     | pending |
| 9   | `packages/telemetry/{contribute,consume}/`                                    | iii Function with batching + bounded queue + max retries; registry-mode `consume/`; payload schema snapshot test                                                                                                                                                                                                      | pending |
| 10  | Chat surface — routes in `apps/web/`                                          | `apps/web/src/routes/chat.tsx` + `apps/web/src/components/chat/{chat.tsx,system-banner.tsx}` (NOT a separate SolidStart app per §7.15)                                                                                                                                                                                | pending |
| 11  | Timeline surface — routes in `apps/web/` + combined `/healthz`                | `apps/web/src/routes/{timeline.tsx,healthz.ts}` + `apps/web/src/components/timeline/{feed.tsx,error-event.tsx}` (NOT a separate SolidStart app per §7.15)                                                                                                                                                             | pending |
| 12  | `.gaia/reference/architecture/`                                               | six primitives + four surfaces canonical reference                                                                                                                                                                                                                                                                    | pending |
| 13  | `.claude/skills/w-converse/`                                                  | harness skill for conversation flow                                                                                                                                                                                                                                                                                   | pending |
| 14  | `bun create gaia` onboarding script + Railway deploy                          | scaffolder + Railway provisioning + smoke test, name-conflict/offline/invalid-key handling, telemetry opt-in default                                                                                                                                                                                                  | pending |
| 15a | Mid-wave audit checkpoint (PR 4 merge)                                        | grep + `validate-artifacts.ts`: layering + tenancy + Better Auth allowlist                                                                                                                                                                                                                                            | pending |
| 15b | Mid-wave audit checkpoint (PR 9 merge)                                        | grep + `validate-artifacts.ts`: emit allowlist + telemetry payload + capability.invoked source restriction                                                                                                                                                                                                            | pending |
| 15  | End-of-wave invariant audit                                                   | full sweep across six invariants; statically-auditable invariants must be 0 violations                                                                                                                                                                                                                                | pending |

## 5b. PR-by-PR file map

The summary in §5 is the index; this section is the implementation map. Every file is sourced from §3 folder structure or §7 hardening spec — no scope additions. Each PR lists files, what they do, and why they exist.

### PR 0 — Dependency smoke test

**Why:** PR 1 freezes the stack. If Neon free-tier doesn't support logical replication, or iii.dev v0.1 doesn't wrap cleanly, or Better Auth tenant ergonomics are wrong, every later PR cascades into a stack-swap. PR 0 catches all three before lock-in.

```
scripts/smoke/
├── neon-logical-replication.ts   # Connect to Neon test DB; CREATE PUBLICATION; verify replication lag <1s. Resolves premise P2.
├── iii-wrap-shapes.ts             # Declare 3 reference iii.dev primitives (function, queue, cron); assert defineFunction wraps each. Resolves P1.
├── better-auth-tenant.ts          # Spin up Better Auth; verify tenant_members join-table integrates without forking. Resolves F11.
└── README.md                      # Documents the gate; lists fallback paths if any check fails (Neon paid tier vs Railway-hosted Postgres).
.github/workflows/smoke.yml        # CI job blocking merge of PR 1 on PR 0 green.
package.json (root)                # Adds `bun smoke:deps` script aliasing the three checks.
```

### PR 1 — Lock the stack

**Why:** F-3 freezes the stack v1.0; the lockfile is the contract. Each pinned version becomes part of the v5 commitment.

```
package.json                       # Workspaces (apps/*, packages/*); pinned deps: bun, elysia, solid-start, @elysia/eden, typebox, drizzle-orm, better-auth, @polar-sh/sdk, resend, @anthropic-ai/sdk, openai, iii.dev. Pinned exactly; no semver ranges.
bun.lock                           # Committed lockfile; reproducible installs.
tsconfig.base.json                 # Strict mode; project references; path aliases @/packages/*, @/apps/*.
tsconfig.json (per workspace)      # Extends base; emits to dist/.
drizzle.config.ts                  # dialect=postgresql; schema=packages/*/drizzle/; out=migrations/.
turbo.json                         # Pipeline defs: build, check, test. (Or `bun workspaces` config if no Turbo.)
.env.example                       # All required env vars: DATABASE_URL, BETTER_AUTH_SECRET, POLAR_*, RESEND_API_KEY, IIIDEV_*, OPENAI_API_KEY|ANTHROPIC_API_KEY, AXIOM_TOKEN. With one-line description each.
.github/workflows/ci.yml           # bun install → bun run check (lint + typecheck + test + validate-artifacts). Blocks merge on any failure.
docs/neon-provisioning.md          # Step-by-step: pick plan that supports logical replication; ALTER SYSTEM SET wal_level = logical; CREATE PUBLICATION events_pub.
README.md                          # Quickstart placeholder (real content lands in PR 14).
.gitignore                         # node_modules, dist, .env, .turbo.
```

### PR 2 — packages/runtime/ + retire packages/workflows/

**Why:** F-2 / step 2 — every other PR's async work runs through `runtime/`. The wrapper insulates from iii.dev API churn and is where requestId, tenant context, circuit breaker, and DLQ live (per §7.7, §7.8). The repo today already runs Inngest via `packages/workflows/` (one function: `sendWelcome`); this PR is a clean swap, not a parallel install — see §7.15 reconciliation.

```
packages/runtime/
├── package.json                   # Pinned iii.dev version (single version per F-3); deps on @gaia/db, @gaia/core, @gaia/adapters/email
├── CLAUDE.md                      # Layer = adapter; defineFunction is the only public API; iii imports below this line only.
├── src/
│   ├── define-function.ts         # The wrapper signature: defineFunction({name, trigger, budget?, handler}). Cap surface area to insulate from iii churn (F31).
│   ├── context.ts                 # AsyncLocalStorage-backed Ctx: {tenantId, requestId, emit, logger}. Every Function pulls from here (F21).
│   ├── circuit-breaker.ts         # Open/half-open/close transitions on iii outage; signals chat to render degradation banner (F25).
│   ├── dlq.ts                     # function_failures table accessor; emit `function.failed` events for past-budget failures (F24).
│   ├── triggers/
│   │   ├── http.ts                # HTTP trigger type
│   │   ├── queue.ts               # Queue trigger type
│   │   ├── cron.ts                # Cron trigger type
│   │   └── event.ts               # Event-stream trigger (binds in 0005 to logical replication consumer)
│   ├── workers/
│   │   └── lifecycle.ts           # Worker boot/register/shutdown; integrates with iii's worker primitive
│   ├── functions/
│   │   ├── send-welcome.ts        # MIGRATED from packages/workflows/index.ts — same idempotent step.run shape, now expressed as defineFunction({trigger:event, name:'user/created'}). Demonstrates the swap.
│   │   └── send-welcome.test.ts
│   ├── define-function.test.ts    # Wrapper contract; every option respected
│   ├── context.test.ts            # AsyncLocalStorage isolation across concurrent invocations
│   ├── circuit-breaker.test.ts    # State transitions; emits banner trigger
│   └── dlq.test.ts                # Failure → table → event

packages/db/schema/function-failures.ts  # NEW — function_failures(id, function_name, error_class, retry_count, last_attempt_at, payload jsonb)
packages/db/migrations/000N_function_failures.sql  # generated by drizzle-kit

apps/api/server/app.ts             # EDIT — remove `import { functions, inngest } from '@gaia/workflows'`, `inngestServe` import, `/api/inngest` route. Add iii.dev worker registration boot call.

packages/workflows/                # DELETE — package retired. Remove `@gaia/workflows` from root package.json workspaces consumption + `inngest` dependency.

package.json (root)                # Remove `inngest` dep + `@gaia/workflows` workspace dep. Add iii.dev dep (PR 1 already pinned it; this PR consumes it).
```

### PR 3 — packages/events/ (append-only schema + emit)

**Why:** F-2 invariant #1 — events are the truth. §7.2 commits the partition strategy, append-only triple defense, schema versioning, and concurrency model. Logical replication on at the DB layer (consumer infra defers to 0005, F-4). Per §7.15 the Drizzle table definition lives in `packages/db/schema/`, not in a per-package `drizzle/` directory; the package owns TypeScript event types and emit helpers.

```
packages/events/
├── package.json                   # Layer = mixed (schema=domain, emit=adapter); deps on @gaia/db, @gaia/tenancy
├── CLAUDE.md                      # schema/ is domain (no IO); emit/ is adapter and allowlisted.
├── src/
│   ├── schema/
│   │   ├── types.ts               # Base event row TS type matching packages/db/schema/events.ts: {id uuid, seq bigint, tenant_id, type text, version smallint, aggregate_id?, aggregate_version?, payload jsonb, occurred_at timestamptz}
│   │   ├── registry.ts            # TypeBox event catalogue; every event type registered here. New types only (append-only at code level too).
│   │   ├── capability-invoked.ts  # The billing event schema; cost field, capability name, args summary
│   │   └── error.ts               # error.* event family schema (used by §7.7 error surfacing)
│   ├── emit/
│   │   ├── emit.ts                # emit({type, version, aggregateId?, aggregateVersion?, payload}); pulls tenant_id from app.tenant_id (RLS); writes via events_writer role
│   │   ├── context.ts             # EmitContext token; only callers from runtime/functions/ + tenancy/ may construct (allowlist enforced by validate-artifacts.ts, F15)
│   │   ├── concurrency.ts         # Optimistic concurrency: writer passes expected aggregate_version; INSERT ... WHERE NOT EXISTS pattern; mismatch raises ConcurrencyError (F8)
│   │   ├── append-only.test.ts    # UPDATE/DELETE on events table → permission denied + trigger fires
│   │   ├── concurrency.test.ts    # Two writers same aggregate, version mismatch, second fails
│   │   └── emit.test.ts           # Tenant context derived from app.tenant_id; allowlist enforced
│   └── index.ts                   # Barrel; exports schema types + emit() (no internal helpers)

packages/db/schema/events.ts       # NEW — Drizzle table definition; consumed by packages/events/src/schema/types.ts via createSelectSchema (per packages/db/CLAUDE.md pattern #4)
packages/db/migrations/000N_events_partition.sql       # CREATE TABLE events PARTITION BY LIST(tenant_id) → subpartition BY RANGE(occurred_at) weekly; seq bigint generated always as identity (F5). Hand-edited after drizzle-kit generate (partitioning is not in drizzle's generator).
packages/db/migrations/000N_events_writer_role.sql     # CREATE ROLE events_writer; GRANT INSERT, SELECT only (F6 layer 1)
packages/db/migrations/000N_events_append_only_trigger.sql # CREATE TRIGGER … BEFORE UPDATE OR DELETE … RAISE EXCEPTION (F6 layer 2)
packages/db/migrations/000N_logical_replication.sql    # ALTER SYSTEM SET wal_level=logical; CREATE PUBLICATION events_pub FOR TABLE events (F-4 capability ON; consumer in 0005)
```

### PR 4 — packages/domain/ + packages/tenancy/ + RLS + validate-artifacts.ts extension

**Why:** F-7 hexagonal lint + F-8 tenant_id rule. §7.3 commits RLS as primary tenancy mechanism (founder F-9). This PR is also the spine of the audit toolchain — `.gaia/rules/checks/validate-artifacts.ts` already exists today (initiative-frontmatter only); PR 4 generalizes it with rule modules and PRs 3, 5, 8 extend it. **Per §7.15 PR 4 also splits the existing monolithic `packages/db/schema.ts` into per-entity files**, which `packages/db/CLAUDE.md` already prescribes — and backfills `tenant_id` on existing application tables.

```
packages/domain/
├── package.json                   # Layer = domain; only allowed deps: typebox, branded-type helpers
├── CLAUDE.md                      # Pure domain rule; no IO; no Drizzle; no fetch
└── src/
    ├── index.ts                   # Barrel
    └── primitives.ts              # Branded primitives shared across all domain packages (TenantId, EventId, AggregateId, RequestId)

packages/tenancy/
├── package.json                   # Layer = domain; deps on @gaia/domain, @gaia/db, @gaia/auth (for Better Auth user → tenant resolution)
├── CLAUDE.md                      # Tenancy invariant; allowlist for Better Auth tables; RLS is primary
├── src/
│   ├── types.ts                   # TenantId branded type; default-tenant constant
│   ├── run.ts                     # tenancy.run(tenantId, fn): wraps in Postgres tx, SET LOCAL app.tenant_id = ..., calls fn, commits/rolls back
│   ├── members.ts                 # tenant_members join table accessor (Better Auth user → tenant resolution, F11)
│   ├── allowlist.ts               # Better Auth tables exempt from tenant_id requirement; consumed by validate-artifacts.ts
│   ├── rls.test.ts                # Session-as-A cannot SELECT or INSERT against B's rows; missing app.tenant_id fails
│   └── run.test.ts                # tenancy.run sets the GUC; rollback clears it

packages/db/schema/                # NEW directory — split from existing packages/db/schema.ts (the single-file monolith today)
├── index.ts                       # re-exports all entities (per packages/db/CLAUDE.md pattern #1)
├── _shared.ts                     # timestamps + tenantId column helpers
├── users.ts                       # SPLIT — Better Auth users table (allowlisted, no tenant_id)
├── sessions.ts                    # SPLIT — Better Auth sessions (allowlisted)
├── accounts.ts                    # SPLIT — Better Auth accounts (allowlisted)
├── verifications.ts               # SPLIT — Better Auth verifications (allowlisted)
├── subscriptions.ts               # SPLIT + EXTEND — adds tenant_id column
├── webhook-events.ts              # SPLIT + EXTEND — adds tenant_id column
├── api-keys.ts                    # SPLIT + EXTEND — adds tenant_id column
└── tenant-members.ts              # NEW — tenant_members(user_id, tenant_id, role); composite PK

packages/db/schema.ts              # DELETED after split (re-exports from schema/index.ts during transition window not needed; one merge PR)

packages/db/migrations/000N_split_and_tenant_id_backfill.sql
                                   # ADD COLUMN tenant_id ON subscriptions/webhook_events/api_keys with DEFAULT 'default' for existing rows; CREATE TABLE tenant_members; create application_tenant_id_guc.

packages/db/migrations/000N_rls_policies.sql
                                   # ALTER TABLE … ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON {subscriptions, webhook_events, api_keys, events, tenant_members} USING (tenant_id = current_setting('app.tenant_id')::text)

scripts/
├── validate-artifacts.ts          # EXTEND — currently checks initiative frontmatter only. PR 4 adds rule modules:
│                                  #   (a) hexagonal layering against §7.1 layer table
│                                  #   (b) tenant_id present on every non-allowlisted table (postgres introspection at CI time)
│                                  #   (c) Better Auth allowlist consumed from packages/tenancy/src/allowlist.ts
│                                  #   (d) imports respect layer table
├── validate-artifacts.test.ts     # EXTEND — add positive + negative cases for each new rule
└── lib/                           # NEW
    ├── layer-table.ts             # The §7.1 layer classification; single source of truth
    ├── postgres-introspect.ts     # Read pg_catalog for table list + columns
    └── ts-import-graph.ts         # AST-walk imports across packages

# bun run check pipeline already invokes .gaia/rules/checks/validate-artifacts.ts — no change to package.json scripts
```

### PR 5 — packages/mcp/{server,registry,discovery}/

**Why:** F-2 invariant #4 — MCP advertises every iii Function. §7.4 commits the auth model, rate limit, tenant propagation, and poll cadence. Registry ships empty at PR 5; populated by PRs 8 and 9 as iii Functions land (per AD-24). Per §7.15 the MCP server is an Elysia plugin **mounted inside the existing `apps/api/server/app.ts`** rather than a standalone server — it reuses Better Auth bearer + `applySecurityHeaders` + `protectedRoute` patterns that already exist there.

```
packages/mcp/
├── server/
│   ├── package.json               # Layer = adapter; deps on @gaia/runtime, @gaia/tenancy, @gaia/security, @gaia/auth, @gaia/mcp-registry, elysia
│   ├── CLAUDE.md                  # MCP server is the network boundary; auth + rate-limit + tenant propagation are mandatory; ships as Elysia plugin (.use)-able by apps/api
│   ├── src/
│   │   ├── plugin.ts              # Elysia plugin export — `mcpPlugin = new Elysia({prefix:'/mcp', name:'mcp'}).use(protectedRoute).post('/...', ...)`. apps/api consumes this via .use(mcpPlugin)
│   │   ├── auth.ts                # Validates Better Auth bearer token via @gaia/auth.api.getSession; resolves token → tenantId via @gaia/tenancy/members (F12)
│   │   ├── rate-limit.ts          # Per-tenant token bucket; default 60 req/min; reads SKU multiplier from @gaia/metering/pricing (F13)
│   │   ├── invoke.ts              # The capability invoker: tenancy.run(tenantId, () => registry.invoke(name, args)) (F14)
│   │   ├── auth.test.ts           # Missing/invalid token → 401; valid → tenant context set
│   │   ├── rate-limit.test.ts     # Bucket refill; tenant isolation
│   │   ├── invoke.test.ts         # Token-as-A invokes capability; emitted event has tenant_id=A; RLS prevents touching B
│   │   └── e2e.test.ts            # Eden Treaty against the apps/api app instance with mcpPlugin mounted; full flow: bearer → invoke → event → audit
├── registry/
│   ├── package.json               # Layer = adapter; deps on @gaia/runtime
│   ├── src/
│   │   ├── registry.ts            # Reads iii Function definitions; produces MCP capability list
│   │   ├── poll.ts                # Default 5s poll; exponential backoff to 60s on registry-unchanged (F27, AD-18)
│   │   └── poll.test.ts           # Cadence and backoff observable
└── discovery/
    ├── package.json               # Layer = adapter
    └── src/
        ├── advertise.ts           # Formats registry → MCP capabilities/list response per spec
        └── advertise.test.ts      # Snapshot test against MCP spec

apps/api/server/app.ts             # EDIT — `.use(mcpPlugin)` after billingRoutes; one new import. No standalone server. /mcp routes inherit applySecurityHeaders + AppError handling already wired at app level.
```

### PR 6 — packages/adapters/llm/ (refactor of packages/adapters/ai.ts to streaming)

**Why:** F-11 swap — adapter ships before conversation, since conversation imports it. §7.9 commits `AsyncIterable<LLMChunk>` as the contract. Non-streaming providers explicitly unsupported (vision §195). Per §7.15 this PR **refactors** the existing `packages/adapters/ai.ts` (a non-streaming `complete()` over `@anthropic-ai/sdk`) into the new streaming structure; it does not start from a blank slate. The OpenTelemetry span instrumentation already in `ai.ts` (model/tokens/latency/cost/tool_use_count/error_class) is preserved in the new streaming adapters.

```
packages/adapters/ai.ts            # DELETE — superseded by packages/adapters/llm/

packages/adapters/llm/
├── package.json                   # Layer = adapter; deps on @anthropic-ai/sdk (already pinned), openai (NEW dep), @gaia/config, @opentelemetry/api
├── CLAUDE.md                      # Vendor adapter rules; streaming-only; no LLM logic leaks beyond this package
├── src/
│   ├── types.ts                   # LLMChunk = {delta: string, role?: 'assistant', toolCall?: ...}; LLM = {stream(input): AsyncIterable<LLMChunk>}
│   ├── stream.ts                  # complete(prompt, options) — convenience wrapper that exhausts AsyncIterable<LLMChunk> into a single string. Preserves the existing complete() contract for callers in apps/api/server/* that don't yet stream.
│   ├── select.ts                  # Provider selection from env (OPENAI_API_KEY → openai; ANTHROPIC_API_KEY → anthropic; both → config-driven)
│   ├── anthropic.ts               # Anthropic streaming client; reuses the OTel span tags (tokens.in/out/cache, latency_ms, cost_usd, tool_use_count, error_class) currently in adapters/ai.ts
│   ├── openai.ts                  # OpenAI streaming client; maps to LLMChunk (new — only Anthropic was in repo today)
│   ├── contract.test.ts           # Both adapters return AsyncIterable<LLMChunk>; non-streaming throws at instantiation
│   ├── openai.test.ts             # Streaming response chunked correctly
│   ├── anthropic.test.ts          # Same; ports existing adapters/ai.test.ts cases
│   └── stream.test.ts             # complete() wrapper exhausts stream, matches current ai.complete() output

packages/adapters/CLAUDE.md        # EDIT — Files table: replace `ai.ts` row with `llm/{stream, select, anthropic, openai, types}.ts` row. Imports section: `import { stream, complete } from '@gaia/adapters/llm'` replaces `import { complete } from '@gaia/adapters/ai'`.

# Callers to update (grep `@gaia/adapters/ai`):
# - any service/feature using complete() — switch import to '@gaia/adapters/llm'
# - rules.ts ai-trace-tags reference (no path change; still under packages/adapters/)

package.json (root)                # Add `openai` to deps (pinned per PR 1 spec)
```

### PR 7 — packages/conversation/{parser,planner,confirmation}/

**Why:** F-2 invariant #4 — agent-native runtime needs a conversation surface. v0.1 plumbed against non-streaming responses (§4 step 6); 0005 adds the streaming spine. F26 timeout handling is here (AD-17).

```
packages/conversation/
├── parser/
│   ├── package.json               # Layer = application; deps on adapters/llm, runtime, tenancy
│   ├── src/
│   │   ├── parser.ts              # Intent extraction; consumes adapters/llm; streaming-aware shape (consumes AsyncIterable)
│   │   ├── timeout.ts             # 30s wrapper; on miss emits conversation.timeout event + returns retry message (F26, AD-17)
│   │   ├── parser.test.ts         # Intent extraction smoke
│   │   └── timeout.test.ts        # Timeout fires; event emitted; retry copy returned
├── planner/
│   ├── package.json               # Layer = application
│   ├── src/
│   │   ├── planner.ts             # Action sequencing; takes parsed intent → ordered list of capability invocations
│   │   └── planner.test.ts        # Plan determinism for fixed input
└── confirmation/
    ├── package.json               # Layer = application
    ├── src/
    │   ├── confirmation.ts        # Progressive confirmation rendering for destructive operations; emits confirmation events
    │   └── confirmation.test.ts   # Destructive action requires confirm; non-destructive does not
```

### PR 8 — packages/metering/{pricing,meter,invoice}/ + meter snapshot anchor

**Why:** F-2 invariant #5 — metering as projection. §7.5 commits forge-prevention, Polar webhook hygiene, idempotency. F-12 founder decision adds the meter snapshot anchor so cold starts don't replay from t=0 (resolves R4 / 6-month regret risk). Per §7.15 the Polar webhook handler **already exists** in `apps/api/server/billing.ts` (`/webhooks/polar` route in `apps/api/server/app.ts` calls `verifyWebhook` from `@gaia/adapters/payments` and `processPolarEvent` from `./billing`); the `webhook_events` table already provides idempotency. PR 8 reuses both — `packages/metering/invoice/polar/` houses the projection logic; the route stays where it is, and `processPolarEvent` is rewired to invoke `metering/invoice/polar/processor.ts`.

```
packages/metering/
├── pricing/
│   ├── package.json               # Layer = domain; deps on @gaia/domain only
│   ├── CLAUDE.md                  # Pure pricing types; no IO; no runtime imports
│   ├── src/
│   │   ├── skus.ts                # SKU enum + pricing tiers + capability bundle mappings
│   │   ├── rates.ts               # Per-SKU rate-limit multiplier (consumed by mcp/server/rate-limit.ts)
│   │   └── skus.test.ts           # Snapshot test of SKU table (regression-detect inadvertent pricing change)
├── meter/
│   ├── package.json               # Layer = adapter; deps on @gaia/runtime, @gaia/events, @gaia/metering-pricing, @gaia/db
│   ├── CLAUDE.md                  # meter is an iii Function; consumes capability.invoked; emits to billing.* family (never own emissions, F4)
│   ├── src/
│   │   ├── meter.ts               # defineFunction({trigger:event, handler}); aggregates capability.invoked → billing.aggregated
│   │   ├── snapshot.ts            # Read/write meter_snapshot(tenant_id, last_seq, aggregate); resume from last_seq on cold start (F-12)
│   │   ├── meter.test.ts          # Replays a fixed event sequence → expected aggregate
│   │   ├── snapshot.test.ts       # Cold start with snapshot resumes; without snapshot starts at seq 0
│   │   └── concurrency.test.ts    # Two meter instances racing on same tenant → snapshot serialization wins
├── invoice/
│   ├── package.json               # Layer = domain (pure types) + adapter (polar/ subdir wraps existing webhook flow)
│   ├── CLAUDE.md                  # invoice projection is types only in the root; webhook processor is in polar/ subdir
│   ├── src/
│   │   ├── invoice.ts             # Invoice projection types; (live data flow lands with 0005 materialization, AD-23)
│   │   ├── polar/
│   │   │   ├── processor.ts       # The new home for Polar event handling. apps/api/server/billing.ts:processPolarEvent delegates here.
│   │   │   ├── processor.test.ts  # Each event type → expected projection mutation; idempotency via existing webhook_events table
│   │   │   └── README.md          # Note: signature verification + idempotency live OUTSIDE this package — in apps/api/server/app.ts:/webhooks/polar (verifyWebhook from @gaia/adapters/payments) and packages/db/schema/webhook-events.ts. We do not duplicate them.

apps/api/server/billing.ts         # EDIT — `processPolarEvent` delegates to `import { processPolarEvent as projectionProcess } from '@gaia/metering/invoice/polar/processor'`. Existing billing routes that today create checkouts/customers also emit `capability.invoked` via @gaia/events.emit() so the meter Function can aggregate them.

packages/db/schema/meter-snapshot.ts # NEW — meter_snapshot(tenant_id pk, last_seq bigint, aggregate jsonb, updated_at timestamptz) (F-12)
packages/db/migrations/000N_meter_snapshot.sql

# polar_webhook_dedup table NOT added — existing webhook_events table (provider='polar', externalEventId unique) already covers it. Consolidates per §7.15 reconciliation.
```

Lint extension (added by this PR to validate-artifacts.ts): `metering/pricing/` and `metering/invoice/` (excluding `polar/` subdir) may not import `runtime/` or any adapter (F3 surgical fix).

### PR 9 — packages/telemetry/{contribute,consume}/

**Why:** F-2 invariant #6 — telemetry as iii Function with backpressure. §7.6 commits the payload schema, opt-in default everywhere (founder F-13), backpressure ceiling.

```
packages/telemetry/
├── contribute/
│   ├── package.json               # Layer = adapter; deps on runtime, events
│   ├── CLAUDE.md                  # Anonymization spec is law; payload snapshot test is the gate
│   ├── src/
│   │   ├── schema.ts              # Inline payload spec: {capability, argNames[], success, latencyBucket, errorClass?, tenantHash}; (F18)
│   │   ├── hash.ts                # HMAC tenant hash; per-instance salt sourced from env
│   │   ├── queue.ts               # Bounded ring buffer (default 10k); drop-oldest on overflow (F20, AD-11)
│   │   ├── backoff.ts             # Exponential 1s→32s; max 5 retries; failures past max emit telemetry.dropped event
│   │   ├── contribute.ts          # defineFunction shipping batched payloads to registry endpoint
│   │   ├── schema.test.ts         # Snapshot test fails if payload shape changes (F18 regression detection)
│   │   ├── hash.test.ts           # HMAC determinism + non-reversibility
│   │   ├── queue.test.ts          # Overflow drops oldest; cap respected
│   │   └── backoff.test.ts        # Flood with 100k events → queue ≤10k, drops counted, backoff observed
└── consume/
    ├── package.json               # Layer = adapter; deps on runtime, events
    ├── src/
    │   ├── consume.ts             # Registry-side ingestion (Gaia-on-Gaia: the registry runs the same code in consume mode)
    │   └── consume.test.ts        # Round-trip: contribute payload → consume → events table
```

### PR 10 — Chat surface (routes in apps/web)

**Why:** F-2 invariant #4 — agent-native chat surface. v0.1 renders against current state; memory-speed reads land in 0005 (per cap table, §3 line 60). System banner triggered by runtime circuit breaker (F25, AD-16). Per §7.15 this is **routes added to the existing `apps/web/` SolidStart app**, not a separate app — one deploy, one auth context, one design system. The healthz endpoint lands in PR 11 (combined with timeline) so chat doesn't ship a duplicate.

```
apps/web/src/routes/chat.tsx       # NEW — SolidStart route at /chat. Renders <Chat /> inside the existing layout (already provides Better Auth session derive). Calls packages/conversation through Eden Treaty.
apps/web/src/components/chat/
├── chat.tsx                       # Conversation UI; consumes @gaia/conversation; SolidJS signals for streaming-shape state
├── system-banner.tsx              # Degradation banner — listens to runtime circuit breaker (via Eden Treaty subscription); renders "system is reconnecting" on iii outage
└── chat.test.ts                   # Component-level test of UI states (idle, streaming, banner-visible)

apps/web/src/lib/api.ts            # EDIT — extend the existing Eden Treaty client with conversation routes (parser/planner/confirmation endpoints exposed by apps/api after PR 7).
```

### PR 11 — Timeline surface (routes in apps/web) + combined /healthz

**Why:** F-2 invariant #4 — observability surface. v0.1 renders events against current state; materialization is 0005. Errors as `error.*` events (F22, AD-13) — no Sentry beyond what's already wired. Per §7.15 this is **routes added to the existing `apps/web/` SolidStart app**, not a separate app, and the healthz endpoint here is the **single combined probe** for both chat and timeline (DB + MCP + iii.dev runtime).

```
apps/web/src/routes/timeline.tsx   # NEW — renders events filtered by tenant_id (RLS does the filtering server-side; tenancy.run wraps the query); surfaces error.* alongside operational events. Polls or uses MCP subscribe for updates (push notifications defer to 0005).
apps/web/src/routes/healthz.ts     # NEW — GET /healthz; SolidStart server function. Checks: (1) DB reachable via @gaia/db client; (2) MCP plugin bound (probe @gaia/mcp/registry length); (3) iii.dev runtime registered (probe runtime/workers/lifecycle status). 200 only when all three healthy; 503 otherwise. Railway healthcheck pins to /healthz on apps/web.
apps/web/src/components/timeline/
├── feed.tsx                       # Event feed component; subscribes to events via Eden Treaty
├── error-event.tsx                # Renders error.* — shows error_class + occurred_at, no message (per anonymization)
└── feed.test.ts

apps/web/src/routes/healthz.test.ts # 200 only when all three healthy; 503 otherwise; missing iii.dev runtime → 503

# Note: apps/api already exposes /health and /health/ready at the API layer (today's app.ts). apps/web's /healthz is the **deploy-unit** healthcheck that aggregates DB + MCP + runtime — Railway pins to this.
```

### PR 12 — .gaia/reference/architecture/

**Why:** F-2 invariant — every principle is discoverable. Canonical reference for humans + agents. Runtime thesis (the 7th invariant) explicitly defers to 0005 (PR 12 of that initiative).

```
.gaia/reference/architecture/
├── CLAUDE.md                      # Index; routes to the six primitive docs
├── six-primitives.md              # Schema is state, events are history, capabilities are agency, projections are derived views, hexagonal layering, tenancy
├── four-surfaces.md               # Chat, timeline, admin (deferred to 0006), MCP — and their performance characterization
└── hexagonal.md                   # The rule: domain/* may not import adapters/*; layer table from §7.1
```

(Runtime thesis ships at `.gaia/reference/architecture/runtime-thesis.md` in 0005.)

### PR 13 — .claude/skills/w-converse/

**Why:** F-2 — harness skill operating the conversation surface during dev. Mirrors the d-\* skill pattern from `.gaia/CLAUDE.md`.

```
.claude/skills/w-converse/
├── SKILL.md                       # Frontmatter (name, description, triggers); phases (read → plan → execute → confirm)
└── reference.md                   # Conversation flow principles; how to invoke parser/planner/confirmation; progressive confirmation rules
```

### PR 14 — bun create gaia-app onboarding script + Railway deploy

**Why:** F-5 — the 90-second-onboarding promise is the hypothesis test. §7.8 commits failure-mode handling. Telemetry opt-in default everywhere per founder F-13. Per §7.15 the **template is this monorepo at PR 13 merge state** — `packages/create-gaia-app/template/` is generated by a snapshot script, not authored by hand.

```
packages/create-gaia-app/             # The bun create gaia-app my-app entry point (per F-5)
├── package.json                   # bin: { "create-gaia-app": "./dist/cli.js" }; published as @gaia/create
├── src/
│   ├── cli.ts                     # Main CLI; Commander/yargs entry; orchestrates the steps below
│   ├── online.ts                  # Connectivity check; offline → fail fast with "you need internet for the deploy" (F28)
│   ├── check-name.ts              # Railway name conflict check; suggests 3 alternatives if taken (F28)
│   ├── validate-keys.ts           # Test calls to Polar + Resend with provided keys; fails before Railway provisioning if invalid (F28)
│   ├── scaffold.ts                # Copies template into target dir (template lives at packages/create-gaia-app/template/)
│   ├── railway.ts                 # Provisions Railway services; rollback on validation failure (F28); pins healthcheck to /healthz
│   ├── telemetry-prompt.ts        # Opt-in by default everywhere; one-line copy with reversal hint (F-13)
│   ├── timing.ts                  # Wall-clock measurement; logs each step's duration; total target ≤90s
│   ├── cli.test.ts                # End-to-end happy path (mocked Railway/Polar/Resend)
│   ├── check-name.test.ts         # Conflict → 3 suggestions
│   ├── validate-keys.test.ts      # Invalid key → fail before Railway
│   └── online.test.ts             # Offline → fail fast
├── template/                      # The scaffolded SaaS skeleton
│   ├── apps/                      # Mirrors the workspace (chat + timeline)
│   ├── packages/                  # Empty workspace dirs
│   ├── package.json               # Pre-pinned per PR 1
│   └── README.md                  # First-run instructions
└── scripts/test-onboarding.ts     # E2E: bun create gaia-app → deploy → /healthz 200, total ≤90s (timed test, F-5 verification)
```

### PR 15a — Mid-wave audit checkpoint (after PR 4 merges)

**Why:** F-IX-5 — three checkpoints, not one. After PR 4 lands the layering + tenancy invariants, audit immediately so mid-window drift is caught.

```
scripts/
├── audit-wave-0-checkpoint-1.ts   # Runs validate-artifacts.ts subset: hexagonal layering, tenant_id presence, Better Auth allowlist
└── audit-wave-0-checkpoint-1.test.ts # Test: introduce a violation, audit fails

.github/workflows/audit-checkpoint-1.yml # CI gate; blocks PR 5+ on this passing
```

### PR 15b — Mid-wave audit checkpoint (after PR 9 merges)

**Why:** Same logic; after PR 9 lands telemetry, the emit-allowlist and capability.invoked-source-restriction invariants are now testable.

```
scripts/
├── audit-wave-0-checkpoint-2.ts   # validate-artifacts subset: events/emit allowlist (only runtime/functions/ + tenancy/), capability.invoked source restriction, telemetry payload snapshot
└── audit-wave-0-checkpoint-2.test.ts

.github/workflows/audit-checkpoint-2.yml # CI gate; blocks PR 10+ on this passing
```

### PR 15 — End-of-wave invariant audit

**Why:** Hypothesis verification. The falsifier (§measurement) reads "0 violations across the six invariants at end of Wave 4" — this PR runs the full sweep and writes the verdict.

```
scripts/
├── audit-wave-0.ts                # Full sweep; runs every validate-artifacts rule + manual grep audits for the runtime-auditable invariants (per §7.10 split)
└── audit-wave-0.test.ts

.gaia/initiatives/0004-foundation-substrate/audit-results.md # Output report; appended at run time; contains: rule, status, evidence (count, file paths, sample violations), final verdict
```

If audit passes, the initiative `status:` frontmatter flips to `shipped` and the hypothesis `verdict:` flips from `pending` to `confirmed`.

| ID  | Decision                                                                                                                                                   | Source                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1 | Wave 0 splits into Initiative 0004 (substrate, six v4 invariants) and Initiative 0005 (runtime, v5 additions). Both ship before Wave 1 (0006).             | Founder 2026-04-29 (post-v5-vision)    |
| F-2 | Six v4 invariants ship in 0004 unchanged from v4: events, hexagonal, tenancy, agent-native runtime, metering, telemetry contribution.                      | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-3 | Locked stack frozen v1.0: Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle, Neon, Better Auth, Polar, Resend, Railway. No swaps allowed v1.0.        | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-4 | Logical replication enabled on Neon Postgres from day one. Consumer infrastructure ships in 0005 — but the _capability_ is on at the DB layer immediately. | Founder 2026-04-29 (v5 calcification)  |
| F-5 | `bun create gaia-app my-app` target: ≤90 seconds to a deployed URL with auth, payments, MCP, chat, billing meter, telemetry opt-in.                        | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-6 | Telemetry contribution opt-in by default, reversible from chat. Cost in basis points of compute, not percent.                                              | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-7 | Hexagonal lint rule enforced in CI: `packages/domain/` may not import from `packages/adapters/`.                                                           | Founder 2026-04-29 (v5 vision §Wave 0) |
| F-8 | Tenancy invariant enforced via `validate-artifacts.ts`: tables without `tenant_id` fail `bun run check`.                                                   | Founder 2026-04-29 (v5 vision §Wave 0) |

## 7. /autoplan Hardening Report (2026-04-29)

**Scope:** harden only, no scope expansion. Reviewers: Claude CEO subagent (HOLD SCOPE) + Claude Eng subagent (independent). Codex unavailable (`[codex-unavailable]` — ChatGPT-account model gating returns 400 on every supported model). Six v4 invariants and PR breakdown remain intact; this section names the seams the original plan left silent.

### 7.1 Layer Classification (resolves F1, F2, F3, F4)

The hexagonal lint rule (F-7) is unenforceable without classifying every package. Commit:

| Package / module                                                                             | Layer           | Rule                                                        |
| -------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| `packages/domain/`                                                                           | domain          | no IO; may not import adapter/application                   |
| `packages/tenancy/`                                                                          | domain          | no IO; pure scoping invariant                               |
| `packages/errors/`                                                                           | domain          | EXISTING — pure types; AppError catalog                     |
| `packages/events/src/schema/`                                                                | domain          | typed event definitions only                                |
| `packages/metering/pricing/`                                                                 | domain          | SKU types; may NOT import `runtime/`                        |
| `packages/metering/invoice/` (root, excluding `polar/`)                                      | domain          | invoice projection types; may NOT import `runtime/`         |
| `packages/config/`                                                                           | infrastructure  | EXISTING — env loading; loaded by every layer               |
| `packages/core/`                                                                             | infrastructure  | EXISTING — logger + OpenTelemetry init; consumed by runtime |
| `packages/runtime/`                                                                          | adapter         | wraps iii.dev                                               |
| `packages/events/src/emit/`                                                                  | adapter         | partitioned writes; allowlisted callers only                |
| `packages/db/`                                                                               | adapter         | EXISTING — Drizzle schema + client                          |
| `packages/auth/`                                                                             | adapter         | EXISTING — Better Auth wrapper                              |
| `packages/security/`                                                                         | adapter         | EXISTING — route guards, security headers, audit log        |
| `packages/adapters/` (existing files: payments, email, analytics, storage, markdown, errors) | adapter         | EXISTING — vendor wrappers                                  |
| `packages/adapters/llm/`                                                                     | adapter         | streaming-aware LLM provider wrapper                        |
| `packages/mcp/{server,registry,discovery}/`                                                  | adapter         | external surface                                            |
| `packages/telemetry/{contribute,consume}/`                                                   | adapter         | iii Function with batching + backoff                        |
| `packages/metering/meter/`                                                                   | adapter         | iii Function over events                                    |
| `packages/metering/invoice/polar/`                                                           | adapter         | wraps existing Polar webhook flow in apps/api               |
| `packages/conversation/{parser,planner,confirmation}/`                                       | application     | composes domain + adapters                                  |
| `packages/ui/`                                                                               | application     | EXISTING — design tokens consumed by apps                   |
| `apps/api/`, `apps/web/`                                                                     | application     | EXISTING + EXTEND in 0004                                   |
| `packages/workflows/`                                                                        | RETIRED in PR 2 | superseded by `packages/runtime/`                           |
| `apps/chat/`, `apps/timeline/`                                                               | application     | top-level surfaces                                          |

**Lint rule** (encoded in `validate-artifacts.ts`): domain may not import adapter or application; `metering/pricing` and `metering/invoice` may not import `runtime/` or any adapter; `events/emit/` is an allowlist-import target (only `runtime/functions/` and `tenancy/` helpers).

**Metering loop** (F4): `metering/meter/` consumes only `capability.invoked` events; emits to `billing.*` family; never consumes its own emissions.

### 7.2 Event Log Spec (resolves F5–F9)

PR 3 commits the following spec, currently silent in the plan:

- **Partition strategy:** `PARTITION BY LIST(tenant_id) → subpartition BY RANGE(occurred_at)` weekly. Tenants are the dominant access vector; week is the secondary scan filter; tenant offboarding detaches one LIST partition.
- **Append-only enforcement (triple defense):**
  1. Postgres role `events_writer` with `GRANT INSERT, SELECT` only (no `UPDATE`/`DELETE`).
  2. `BEFORE UPDATE OR DELETE` trigger raising exception (defense against superuser slips and migrations).
  3. `validate-artifacts.ts` rejects `.update(events)` / `.delete(events)` Drizzle calls in source.
- **Schema versioning:** every event row carries `(type text, version smallint not null default 1, payload jsonb)`. New version → new handler in 0005's `materialization/handlers/`; old payloads remain readable.
- **Sequencing & concurrency:** `seq bigint generated always as identity` for cross-aggregate ordering; optional `aggregate_version int` for optimistic concurrency on per-aggregate writes (writer passes expected version, INSERT fails if mismatch).
- **Clock canonicality:** `clock_timestamp()` at INSERT is canonical `occurred_at`. Worker-side `processed_at` (added in 0005) is separate.

### 7.3 Tenancy Enforcement (resolves F10, F11)

PR 4 commits Postgres Row-Level Security as the primary mechanism, with app-level helpers as ergonomic sugar:

- Each query sets `SET LOCAL app.tenant_id` per transaction; RLS policies use `tenant_id = current_setting('app.tenant_id')::text`.
- `tenancy.run(tenantId, fn)` wraps the transaction.
- **Better Auth allowlist:** Better Auth tables (`users`, `sessions`, `accounts`, `verifications`) are exempt from `tenant_id` requirement; explicitly allowlisted in `validate-artifacts.ts`. Tied to tenants via a `tenant_members(user_id, tenant_id)` join table. Better Auth tables may not be queried directly outside `packages/tenancy/`.
- Bug profile drops from "wrong tenant data leaked" to "session has wrong tenant context."

### 7.4 MCP Security (resolves F12–F14, F27)

PR 5 commits:

- **Auth:** Better Auth bearer tokens scoped to a tenant. Tenants issue MCP credentials from chat. All MCP requests carry tenant context derived from the token. Missing/invalid → 401.
- **Rate limit:** per-tenant token-bucket. Default 60 req/min, configurable by SKU (already in `metering/pricing/`).
- **Tenant propagation:** MCP server resolves token → tenant → `tenancy.run(tenantId, () => capability.invoke(...))`. Test: invoke as A, assert emitted event has `tenant_id = A`, assert RLS prevents touching B.
- **Polling cadence:** default 5s, exponential backoff to 60s on registry-unchanged. Server-side rate limited.

### 7.5 Metering / Billing Security (resolves F15–F17)

PR 3 + PR 8:

- **Forged capability.invoked prevention:** `events/emit/` accepts only an `EmitContext` produced by trusted callers (`runtime/` capability invoker). Tenant code cannot write events directly. Tenant taken from `app.tenant_id` (RLS context), not caller-supplied. Lint rule: `capability.invoked` events emitted only from `packages/runtime/functions/`.
- **Polar webhook signature verification:** mandatory before any state change. Reject unsigned/invalid → 401.
- **Idempotency:** Polar's `event_id` becomes a unique key in a dedup table; double-delivery is a no-op.

### 7.6 Telemetry / Privacy (resolves F18, F20; F19 explicitly accepted)

PR 9 + PR 14:

- **Payload schema** (commit inline in `packages/telemetry/contribute/schema.ts`): capability name (yes), arg names without values, success/failure, latency bucket, error class without message, tenant hash (one-way HMAC with per-instance salt, not raw `tenant_id`). Snapshot test fails if anything new appears.
- **Opt-in default everywhere** (founder direction, F-6): default opt-in for all geographies, reversible from chat with one sentence. Founder accepts the GDPR exposure and OSS-launch reputation risk for the network-effect data velocity. `validate-artifacts.ts` checks the payload schema snapshot stays clean; the legal review of the anonymization spec is the mitigation.
- **Backpressure ceiling:** bounded queue (default 10k events), drop-oldest on overflow, max retries 5 with jittered backoff (1s → 32s), failures past max emit `telemetry.dropped` event in local timeline.

### 7.7 Observability (resolves F21–F24)

PR 2 + PR 11 + PR 14:

- **Request ID propagation:** `packages/runtime/` provides AsyncLocalStorage-backed `requestId` that every iii Function, MCP request, and conversation turn pulls from. Logs go to Axiom (per `.gaia/CLAUDE.md`).
- **Error surfacing:** errors are events of type `error.*`; `apps/timeline/` already renders events. No Sentry needed.
- **Railway healthz:** `apps/chat/` and `apps/timeline/` expose `/healthz` checking DB reachable, MCP bound, iii.dev runtime registered. Railway healthcheck pins to this path.
- **Dead-letter:** `runtime/functions/` declares a `function_failures` table with retry budget. Failures past budget land here as `function.failed` events; surface in timeline.

### 7.8 Edge Cases (resolves F25–F29)

PR 2 + PR 6 + PR 14 + §4 step 3:

- **iii.dev unavailable:** `runtime/` exposes a circuit breaker. Chat surface degrades to "system is reconnecting" banner; timeline shows the outage event.
- **LLM timeout in parser:** 30s timeout per parser call (declared in `runtime/budgets/` once 0005 lands; hardcoded in 0004). Past timeout: reply "I'm having trouble understanding — can you rephrase?" + emit `conversation.timeout`.
- **Onboarding failure modes:** name conflict against Railway → suggest 3 alternatives; offline → fail fast; invalid Polar/Resend keys → validate via test API call before provisioning Railway, rollback Railway on validation failure.
- **Logical replication lag visibility:** explicitly deferred to 0005 — state in §4 step 3.

### 7.9 Implementation Contracts (resolves F31–F33)

- **Runtime wrapper signature** (PR 2, inline in §4 step 2): `defineFunction({ name, trigger, budget?, handler: (ctx, input) => Promise<output> })`. `ctx` carries `tenantId`, `requestId`, `emit`, `logger`. Cap the surface here to insulate from iii API churn.
- **LLM streaming contract** (PR 7): `AsyncIterable<LLMChunk>`. `ReadableStream` interop is one adapter on top.
- **`validate-artifacts.ts` ownership:** does NOT exist today. PR 4 creates it with the tenant_id rule; PR 3 extends with append-only check; PR 5 extends with capability.invoked emit-from-runtime-only check; PR 8 extends with metering/pricing-no-import-runtime check.

### 7.10 Falsifier Refinement (resolves F-IX-4)

The current falsifier ("≥1 of the six invariants gets retroactively bypassed") promises a 180-day measurement the 0004 toolchain cannot deliver for 2 of the 6 invariants. Split:

- **Statically auditable** (caught by `validate-artifacts.ts` + grep): hexagonal layering, tenancy `tenant_id` presence, MCP capability advertisement, metering as iii Function declaration. Falsifier window: end of Wave 4.
- **Runtime auditable** (require 0005's `budgets/` for live measurement): event append-only at runtime (DB-level enforcement is 0004; runtime-level confirmation defers to 0005), telemetry backpressure under load.

Audit cadence: PR 4 merge (layering + tenancy), PR 9 merge (telemetry payload + emit allowlist), end-of-wave (full sweep). Three checkpoints, not one.

### 7.11 Dependency Graph (canonical layering)

```
                          apps/ (application)
                          ├──────────────────────┐
                     apps/chat/              apps/timeline/
                          │                      │
                          ▼                      │
                  conversation/ (application)    │
                  ├── parser/                    │
                  ├── planner/                   │
                  └── confirmation/              │
                          │                      │
            ┌─────────────┼──────────────┐       │
            ▼             ▼              ▼       │
        mcp/ (adapter) adapters/llm/ metering/meter/
        ├── server/    (adapter)      (adapter)
        ├── registry/                    │
        └── discovery/                   │
            │                            │
            └────────┬──────────┬────────┘
                     ▼          ▼
                  runtime/ (adapter) ─── telemetry/ (adapter)
                     │              ├── contribute/
                     │              └── consume/
                     │                       │
                     └────────┬──────────────┘
                              ▼
                       events/emit/ (adapter, allowlist-imported)
                              │
                              ▼
                       events/schema/ (domain) ◄──── tenancy/ (domain)
                              ▲                          ▲
                              │                          │
                       domain/ (domain) ◄────  metering/{pricing,invoice}/ (domain)
```

### 7.12 Test Plan (Section 7 of the initiative — resolves F30)

| Invariant                              | Test                                                                              | Where                                           | When               |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| Append-only events (DB)                | `UPDATE events` returns permission denied + trigger raises                        | `packages/events/emit/append-only.test.ts`      | unit + CI          |
| Append-only events (code)              | AST scan for `.update(events)` / `.delete(events)`                                | `validate-artifacts.ts`                         | `bun run check`    |
| Hexagonal layering                     | dependency-graph check against 7.1 layer table                                    | `validate-artifacts.ts`                         | `bun run check`    |
| `tenant_id` on every table             | Postgres introspection, fail if non-allowlisted table lacks `tenant_id`           | `validate-artifacts.ts`                         | `bun run check`    |
| RLS isolation                          | session-as-A cannot SELECT/INSERT on B's rows                                     | `packages/tenancy/rls.test.ts`                  | integration        |
| Tenant propagation through MCP         | E2E: token-as-A invokes capability, asserts event `tenant_id = A`                 | `packages/mcp/server/e2e.test.ts`               | E2E                |
| MCP auth required                      | unauthenticated request returns 401, no Function executes                         | `packages/mcp/server/auth.test.ts`              | unit               |
| Forged `capability.invoked` rejected   | tenant code emit attempt fails lint + runtime allowlist                           | `validate-artifacts.ts` + `events/emit.test.ts` | CI + unit          |
| Polar webhook signature                | unsigned payload returns 401, no DB write                                         | `packages/metering/invoice/webhook.test.ts`     | unit               |
| Polar webhook idempotency              | replaying same `event_id` is a no-op                                              | `packages/metering/invoice/webhook.test.ts`     | unit               |
| Telemetry payload schema               | snapshot test of contribute payload                                               | `packages/telemetry/contribute/schema.test.ts`  | unit               |
| Telemetry backpressure cap             | flood with 100k events; assert queue ≤10k and drops counted                       | `packages/telemetry/contribute/backoff.test.ts` | unit               |
| LLM streaming contract                 | adapter returns `AsyncIterable<LLMChunk>`                                         | `packages/adapters/llm/contract.test.ts`        | unit               |
| MCP poll cadence                       | observe interval 5s, backoff to 60s                                               | `packages/mcp/server/poll.test.ts`              | unit               |
| 90-second onboarding                   | timed E2E from `bun create gaia` to deployed URL `/healthz` 200                   | `scripts/test-onboarding.ts`                    | nightly + pre-ship |
| Healthz                                | `/healthz` returns 200 only when DB+MCP+runtime all up                            | `apps/{chat,timeline}/healthz.test.ts`          | unit               |
| Aggregate concurrency                  | two writers, same aggregate, expected_version mismatch → second fails             | `packages/events/emit/concurrency.test.ts`      | unit               |
| Telemetry opt-in default (F-6 honored) | onboarding defaults telemetry ON in all regions; one-sentence chat reversal works | `scripts/onboarding-telemetry.test.ts`          | unit               |
| End-of-wave audit (PR 15)              | grep + validate-artifacts: 0 violations across 6 invariants                       | `scripts/audit-wave-0.ts`                       | once at PR 15      |

### 7.13 Decision Audit Trail (autoplan auto-decisions)

| ID    | Decision                                                                                      | Classification | Principle        | Rationale                                                            |
| ----- | --------------------------------------------------------------------------------------------- | -------------- | ---------------- | -------------------------------------------------------------------- |
| AD-1  | Add layer classification table to §3                                                          | Mechanical     | P5 explicit      | Lint rule unenforceable without it (F1–F3)                           |
| AD-2  | Commit partition strategy: `LIST(tenant_id) → RANGE(occurred_at) weekly`                      | Mechanical     | P1 completeness  | Required for PR 3 execution (F5)                                     |
| AD-3  | Append-only triple defense (role + trigger + lint)                                            | Mechanical     | P1 completeness  | Defense in depth; cheap to add (F6)                                  |
| AD-4  | Event schema versioning fields `(type, version, payload)` + `seq` + `aggregate_version`       | Mechanical     | P1 completeness  | Required for evolvability and concurrency (F7, F8)                   |
| AD-5  | RLS as primary tenancy mechanism                                                              | Taste→AD       | P5 explicit + P1 | Bug profile dramatically smaller; surfaced as taste decision below   |
| AD-6  | Better Auth allowlist for `tenant_id` requirement                                             | Mechanical     | P1               | Otherwise lint fails day one (F11)                                   |
| AD-7  | MCP auth via Better Auth bearer + per-tenant rate limit + tenant propagation                  | Mechanical     | P1 completeness  | Unauthenticated MCP = unauthenticated billing (F12–F14)              |
| AD-8  | `events/emit/` allowlist; `capability.invoked` only from `runtime/functions/`                 | Mechanical     | P1               | Forged events = forged bills (F15)                                   |
| AD-9  | Polar webhook signature verification + `event_id` idempotency                                 | Mechanical     | P1               | Standard webhook hygiene (F16, F17)                                  |
| AD-10 | Telemetry payload schema + snapshot test                                                      | Mechanical     | P1               | "Anonymized" is hand-waved without it (F18)                          |
| AD-11 | Backpressure ceiling: bounded queue, max retries, drop-policy                                 | Mechanical     | P1               | Unbounded retry = OOM (F20)                                          |
| AD-12 | Request-ID propagation via AsyncLocalStorage; logs to Axiom                                   | Mechanical     | P3 pragmatic     | Existing infra (Axiom is named in `.gaia/CLAUDE.md`); no new package |
| AD-13 | Errors as `error.*` events; surfaced in timeline                                              | Mechanical     | P3 + P5          | No new package; reuses event log                                     |
| AD-14 | Railway `/healthz` endpoint on `apps/chat/` + `apps/timeline/`                                | Mechanical     | P1               | Railway needs a probe target (F23)                                   |
| AD-15 | Dead-letter table `function_failures` for past-budget retries                                 | Mechanical     | P1               | Failures vanish without it (F24)                                     |
| AD-16 | Circuit breaker on `runtime/` for iii.dev outage                                              | Mechanical     | P1               | Hard-fail otherwise (F25)                                            |
| AD-17 | LLM timeout 30s + graceful retry copy                                                         | Mechanical     | P1               | Blocked user otherwise (F26)                                         |
| AD-18 | MCP polling 5s with exp backoff to 60s                                                        | Mechanical     | P5               | Cadence undefined otherwise (F27)                                    |
| AD-19 | `bun create gaia` failure handling: name conflict, offline, invalid keys                      | Mechanical     | P1               | Onboarding regression risks (F28)                                    |
| AD-20 | `validate-artifacts.ts` ownership statement: created in PR 4, extended in 3, 5, 8             | Mechanical     | P5               | Currently unstated; required for every invariant (F33)               |
| AD-21 | Falsifier split into static-auditable vs runtime-auditable                                    | Mechanical     | P5               | Hypothesis cannot otherwise be honestly tested (F-IX-4)              |
| AD-22 | Three audit checkpoints: PR 4 merge, PR 9 merge, end-of-wave (replaces PR 15 only)            | Mechanical     | P5               | Mid-window drift detection (F-IX-5)                                  |
| AD-23 | Cap-table metering line should call out "invoice projection scaffold; live data flow in 0005" | Mechanical     | P5               | Slippage prevention (F-IX-8)                                         |
| AD-24 | PR 5 explicitly notes registry ships empty, populated by PRs 8 + 9                            | Mechanical     | P5               | Order-of-operations clarity (F-IX-7)                                 |

### 7.14 Founder Decisions (autoplan gate, 2026-04-29)

| ID   | Decision                                                                                                                                             | Source                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| F-9  | Tenancy enforced via Postgres RLS as the primary mechanism; app-helpers as ergonomic sugar                                                           | Founder 2026-04-29 (autoplan gate, recommended)                                 |
| F-10 | Add PR 0 dependency smoke test gating PR 1 (Neon LR, iii.dev v0.1, Better Auth tenant)                                                               | Founder 2026-04-29 (autoplan gate, recommended)                                 |
| F-11 | Swap PR 6 ↔ PR 7: `packages/adapters/llm/` ships before `packages/conversation/`                                                                     | Founder 2026-04-29 (autoplan gate, recommended)                                 |
| F-12 | PR 8 includes `meter_snapshot(tenant_id, last_seq, aggregate)` resume anchor                                                                         | Founder 2026-04-29 (autoplan gate, recommended)                                 |
| F-13 | Telemetry opt-in default everywhere (no geo-detect). Founder accepts GDPR + OSS-launch reputation risk for network-effect data velocity. F-6 stands. | Founder 2026-04-29 (autoplan gate, founder override of reviewer recommendation) |

### 7.15 Existing-scaffold reconciliation (added 2026-04-29)

The original initiative §1 described the repo as a "methodology-and-harness skeleton" with no apps and no packages. That description is wrong: the working tree is the **v1 SaaS template scaffold itself** — `apps/{api,web}` and `packages/{adapters,auth,config,core,db,errors,security,ui,workflows}` already implement working auth, billing, email, Inngest workflows, observability, and a SolidStart frontend. This subsection commits the resolution.

**Reconciliation decisions:**

| #    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | PR(s)         | Risk                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| R-1  | Existing scaffold persists. 0004 adds the substrate **on top of**, not as a replacement for, `apps/api`, `apps/web`, and the 9 existing packages.                                                                                                                                                                                                                                                                                                                                                                            | All           | Low — additive                                                         |
| R-2  | **Inngest → iii.dev is a clean swap.** `packages/workflows/` (single function `sendWelcome`) is deleted in PR 2; the function migrates to `packages/runtime/src/functions/send-welcome.ts`; `apps/api/server/app.ts` drops `/api/inngest` and registers iii.dev workers; `inngest` dependency removed from root `package.json`. No parallel-running window.                                                                                                                                                                  | PR 2          | Medium — gated by PR 0 smoke verifying iii.dev v0.1 ergonomics         |
| R-3  | **Single Drizzle schema root.** `packages/db/CLAUDE.md` already prescribes one schema file per entity aggregated in `schema/index.ts`. Override the original initiative's per-package `drizzle/` directories: every new table (`events`, `tenant_members`, `meter_snapshot`, `function_failures`) lives in `packages/db/schema/<entity>.ts`; every migration is generated centrally to `packages/db/migrations/`. Substrate packages own TypeScript types and emit/read helpers; `packages/db/` owns SQL.                    | PR 3, 4, 8    | Low — aligns with existing convention                                  |
| R-4  | **`apps/chat` and `apps/timeline` become routes in `apps/web`**, not separate SolidStart apps. Single deploy unit; one combined `/healthz` (DB + MCP + iii.dev). The original initiative's two-app split is rejected as deploy-overhead with no architectural payoff at v0.1.                                                                                                                                                                                                                                                | PR 10, 11     | Low — easier to operate                                                |
| R-5  | **MCP server is an Elysia plugin mounted in `apps/api`**, not a standalone server. Reuses existing Better Auth bearer + `applySecurityHeaders` + `protectedRoute` patterns. One Elysia app, one auth scheme, one set of headers.                                                                                                                                                                                                                                                                                             | PR 5          | Low — composes with existing app                                       |
| R-6  | **`packages/adapters/ai.ts` → `packages/adapters/llm/` is a refactor**, not a fresh build. Existing OpenTelemetry span tags (model/tokens/latency/cost/tool_use_count/error_class) are preserved verbatim in the streaming adapters. The non-streaming `complete()` becomes a thin wrapper over the new `AsyncIterable<LLMChunk>` contract so any current caller stays working.                                                                                                                                              | PR 6          | Medium — touches a vendor adapter; existing `ai.test.ts` ports forward |
| R-7  | **Polar webhook reuses existing infrastructure.** `apps/api/server/app.ts:/webhooks/polar` already calls `verifyWebhook` (signature) and the `webhook_events` table provides idempotency. PR 8 does NOT add a new webhook route, signature handler, or dedup table — it adds `processPolarEvent` projection logic in `packages/metering/invoice/polar/processor.ts` and rewires `apps/api/server/billing.ts:processPolarEvent` to delegate. The "polar_webhook_dedup" table from the original §5b is **dropped from scope**. | PR 8          | Low — fewer moving parts                                               |
| R-8  | **`tenant_id` retrofit on existing tables.** `subscriptions`, `webhook_events`, `api_keys` ship today without `tenant_id`. PR 4 adds the column with `DEFAULT 'default'` for existing rows + RLS policies. Better Auth tables (`users`, `sessions`, `accounts`, `verifications`) go on the permanent `validate-artifacts.ts` allowlist.                                                                                                                                                                                      | PR 4          | Medium — single migration window with RLS policy review                |
| R-9  | **`packages/create-gaia-app/template/` is a snapshot of the repo at PR 13 merge**, not a hand-written template. Generated by a snapshot script run as part of PR 14. Whatever ships at PR 13 is what `bun create gaia` produces.                                                                                                                                                                                                                                                                                             | PR 14         | Low — eliminates template-drift risk                                   |
| R-10 | **`.gaia/rules/checks/validate-artifacts.ts` is extended, not replaced.** It exists today (initiative-frontmatter checks only). PR 4 adds rule modules under `.gaia/rules/checks/lib/{layer-table.ts,postgres-introspect.ts,ts-import-graph.ts}`; PRs 3, 5, 8 each contribute a rule. The single-script entrypoint stays, so `bun run check`'s long script list does not grow.                                                                                                                                               | PR 4 (+3,5,8) | Low                                                                    |

**Existing-files-touched trace** (grep aid for w-code):

- `apps/api/server/app.ts` — PR 2 (drop `/api/inngest`), PR 5 (mount mcpPlugin), PR 8 (already calls `processPolarEvent`; no edit unless billing.ts moves)
- `apps/api/server/billing.ts` — PR 8 (delegate `processPolarEvent` to metering/invoice/polar; emit `capability.invoked` on billing actions)
- `packages/db/schema.ts` — PR 4 (split into `packages/db/schema/<entity>.ts`)
- `packages/adapters/ai.ts` — PR 6 (delete; replaced by `packages/adapters/llm/`)
- `packages/adapters/CLAUDE.md` — PR 6 (update Files table)
- `packages/workflows/` — PR 2 (delete entire directory)
- `apps/web/src/lib/api.ts` — PR 10 (extend Eden Treaty client with conversation routes)
- `package.json` (root) — PR 1 (pin iii.dev), PR 2 (remove inngest, remove @gaia/workflows), PR 6 (add openai)
- `.gaia/rules/checks/validate-artifacts.ts` — PR 4 (extend with rule modules)
- `.github/workflows/ci.yml` — PR 1 (no change in shape; just confirms iii.dev install path), PR 14 (add Railway smoke), PR 15a/b (gates)

**Out-of-scope despite existing-scaffold proximity:**

- Apps/web design refresh, route restructuring, or visual changes beyond adding `/chat` and `/timeline`. The existing routes (login/signup/dashboard/billing) stay as-is.
- Migration off Sentry to events-as-error-stream — Sentry stays wired through `@sentry/node`. Errors _additionally_ emit as `error.*` events; no Sentry removal in 0004.
- Renaming `@gaia/api-server` / `@gaia/web` workspace aliases. The tricks in `package.json` workspace deps stay as-is.
- Reorganizing `packages/adapters/` flat-file structure beyond carving out `llm/`. `payments.ts`, `email.ts`, etc. stay as siblings.
