---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Selling capabilities — hireable as employees through conversation, executed in iii-Function sandboxes with explicit budgets, composable across instances via local replicas of remote behavior, and metered through a windowed iii Function over the event stream — turns architecture into pricing AND keeps cross-instance invocation fast (tens of milliseconds) even at network scale. Hiring an AI tax-compliance employee from another instance feels like hiring a local one.
falsifier: After Wave 4 ships, ≥1 cross-instance capability invocation in the steady state takes >100ms p99, OR ≥1 capability bundle bypasses sandbox isolation, OR labor app cost-per-employee data is computed off the materialized metering Function. Window: through Wave 5 ship-date.
measurement:
  {
    metric: 'p99 cross-instance capability invocation latency in steady state + sandbox-bypass count + metering pipeline source',
    source: 'capability invocation traces + sandbox audit + metering source audit',
    baseline: 'N/A (pre-Wave-4)',
    threshold: 'p99 cross-instance invocation <100ms steady state + 0 sandbox bypasses + 100% labor metering off windowed Function',
    window_days: 90,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 4
status: not-started
---

# Initiative 0009 — Wave 4: Capabilities Runtime (with Replicas, the Economic Engine)

We sell capabilities, hireable as employees through conversation. Capability bundles are simultaneously the architectural primitive, the conversational unit, and the SKU. In v5, cross-instance capability invocation resolves against local materialized replicas of remote behavior, not synchronous network calls. Capability execution is an iii Function family with explicit resource limits. Metering computation is a windowed iii Function over the event stream. The economic engine of Gaia.

## 1. Context / Research

The previous three waves produced everything the capabilities need to operate effectively — and all of them at memory speed. Projections give them surfaces to act on, materialized (Wave 1, Initiative 0006). Contracts give them grounded knowledge and network discovery, materialized (Wave 2, Initiative 0007). Channels give them outputs, async with backpressure (Wave 3, Initiative 0008). The streaming conversation primitive (0005) makes hiring feel like hiring. The metering primitive (0004) makes pricing inseparable from architecture. The replicas primitive (0005) makes cross-instance invocation fast.

Today's state (post-0008): the founder has a rendering admin, queryable contracts, working publishing, and a typed agent surface. But there are no employees. There's nothing to _hire_. There's no economic surface beyond per-projection pricing. Wave 4 is where the business model lands.

The category-defining version: capability invocation is fast even across the network. When an AI employee invokes a tax-compliance capability sourced from another instance, the invocation resolves against a local replica of the remote behavior in tens of milliseconds. The remote instance is consulted only when behavior drifts. Customer interactions complete at memory speed. The labor app shows live cost per employee, computed via the windowed metering Function. The founder sees economic, performance, and behavioral data in one timeline at memory speed.

Cross-instance composition is what makes Gaia a network rather than a template. A founder publishes a tax-compliance bundle; another founder hires an employee that uses it; the second founder pays per invocation; revenue routes back to the publisher automatically through `gaia-cloud/packages/revenue-share/`. None of it blocks on synchronous network calls.

## 2. Strategy

**Problem**: The traditional SaaS model sells features. Gaia sells capabilities — as employees, hired through conversation. This requires (a) a capability framework with primitives and bundles, (b) a sandbox per principal so bundles can't consume the whole runtime, (c) personas to give employees voice, (d) cross-instance composition that doesn't depend on network luck, (e) bundled invoicing across instances, (f) a real-time labor surface showing cost and presence, (g) a hosted platform repo (`gaia-cloud/`) that does provisioning and graceful exit. None of these existed before Wave 0; all of them depend on every prior wave's primitives.

**Approach** (chosen): the capabilities framework lands as primitives + bundles + scoping + cross-instance composition. The runtime sandbox extends 0004's runtime with per-principal iii Function isolation. Personas configure voice. Operational packages (billing UI, support help-desk) ship alongside. The labor app is a real-time surface with live cost per employee. `gaia-cloud/` ships as a separate codebase — the managed platform.

**Cap table** (what 0009 ships v1.0):

| Surface                              | Ships v1.0                                                                                                                                             | Capped                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `packages/capabilities/primitives/`  | Individual typed capabilities                                                                                                                          | —                                          |
| `packages/capabilities/bundles/`     | Predefined compositions                                                                                                                                | Founder-authored bundles (defer to v1.1)   |
| `packages/capabilities/scoping/`     | Per-principal scope resolution + agent credentials                                                                                                     | Multi-principal sharing (defer)            |
| `packages/capabilities/composition/` | Cross-instance bundle sourcing via replicas; depends on `packages/replicas/`                                                                           | —                                          |
| `packages/personas/`                 | Voice and style configuration                                                                                                                          | Auto-tuning personas from feedback (defer) |
| `packages/runtime/sandbox/`          | iii Function isolation per principal, resource limits, timeout, observability trace                                                                    | —                                          |
| `packages/billing/`                  | Subscription state + payment flows + user-facing billing UI (computation lives in `packages/metering/` from 0004)                                      | Multi-currency invoicing (defer)           |
| `packages/support/`                  | Help desk, ticket lifecycle, inbox                                                                                                                     | SLA enforcement (defer)                    |
| Metrics projection                   | `packages/projections/metrics/` + materialize.ts; MRR, churn, LTV (triple-rendered)                                                                    | Cohort analysis beyond MRR/churn/LTV       |
| Adapters                             | `packages/adapters/payments/` (Polar, Stripe/Lemon swap path), `packages/adapters/email/` (Resend transactional)                                       | —                                          |
| `apps/labor/`                        | Real-time labor app — presence, queue, escalations, live cost per employee from windowed metering Function                                             | —                                          |
| `w-capability` skill                 | Provisions capability bundles, hires/fires conversationally                                                                                            | —                                          |
| `gaia-cloud/`                        | NEW separate repo — control-api, dashboard, billing aggregation, orchestrator, eject tooling, tenancy, provisioning, routing, migration, revenue-share | —                                          |

## 3. Folder Structure

Disposition: **EXTEND** = additive change to an existing module; **NEW** = wholly new; **EDIT** = modify a file in the existing scaffold.

### Main repo (`gaia/`)

```
gaia/
├── packages/
│   ├── capabilities/                 # NEW package — capability primitives + bundles + composition
│   │   └── src/
│   │       ├── primitives/           # individual typed capabilities
│   │       ├── bundles/              # predefined compositions
│   │       ├── scoping/              # per-principal scope resolution + agent credentials
│   │       └── composition/          # cross-instance bundle sourcing via replicas (depends on packages/replicas/ from 0005)
│   │
│   ├── personas/                     # NEW package — voice and style configuration
│   │
│   ├── runtime/                      # EXTEND (created in 0004) — extended in 0005 with budgets/, here with sandbox/
│   │   └── src/
│   │       └── sandbox/              # NEW subdir — iii Function isolation per principal, resource limits, timeout, observability trace. Composes with the budget primitive from 0005.
│   │
│   ├── billing-ui/                   # NEW package — RENAMED from initial draft `packages/billing/` to avoid concept-collision with existing apps/api/server/billing.ts (which is the route-handler half). This package owns subscription-state UI + payment flow components consumed by apps/web. Computation stays in packages/metering/ (0004).
│   ├── support/                      # NEW package — help desk, ticket lifecycle, inbox
│   │
│   ├── projections/                  # EXTEND (created in 0006)
│   │   └── metrics/                  # NEW subdir — MRR/churn/LTV projection; materialize.ts implements the 0005 handler contract
│   │
│   ├── adapters/                     # EDIT existing flat-file package — both payments.ts and email.ts ALREADY EXIST today (Polar + Resend respectively). 0009 does NOT recreate them; PR 6 EDITS them to add Stripe/Lemon swap-path scaffolding in payments.ts and any transactional-template helpers needed by billing-ui in email.ts.
│   │   ├── payments.ts               # EDIT — existing Polar adapter; add Stripe/Lemon swap-path interface (no new file)
│   │   └── email.ts                  # EDIT — existing Resend adapter; add transactional-template helpers (no new file)
│   │
│   └── db/                           # EDIT — extend packages/db/schema/ per 0004 §7.15 R-3
│       └── schema/
│           ├── capability-invocations.ts # NEW — per-invocation audit row (capability, bundle, principal, success, latency, cost, occurred_at, tenant_id)
│           ├── persona.ts                # NEW — persona configuration per tenant
│           ├── support-tickets.ts        # NEW
│           ├── replica-fingerprints.ts   # NEW — behavior fingerprints for replica drift detection (R-3 falsifier)
│           └── employees.ts              # NEW — labor-app surface state: hired bundles, role, status, queue
│
├── apps/
│   ├── api/                          # EDIT (PRs 4, 7, 8, 11) — Elysia server: capability invocation route, sandbox status route, billing-ui-backing endpoints, support-ticket endpoints, employee/labor endpoints
│   ├── web/                          # EDIT (PRs 7, 11) — billing-ui surfaces in /billing (existing route), labor surfaces as a new route /labor (rather than separate apps/labor app — see §7 reconciliation)
│   │   └── src/routes/
│   │       └── labor.tsx             # NEW — labor surface as a route in apps/web (R-1 from 0008 §7 carries forward)
│   ├── marketing/                    # KEEP (created in 0008)
│   └── labor/                        # NOT created — labor is a route in apps/web per §7 R-2 below; "apps/labor/" listed in §2 cap-table is the conceptual surface, the actual deploy is the apps/web route
│
└── .claude/skills/
    └── w-capability/                 # NEW — provisions capability bundles, hires/fires conversationally
```

### Separate repo (`gaia-cloud/`) — managed platform

```
gaia-cloud/                           # NEW SEPARATE REPO — created in PR 13
├── apps/
│   ├── control-api/                  # tenant control plane (its own Elysia server, NOT a clone of gaia/apps/api)
│   ├── dashboard/                    # gaia.cloud customer dashboard (its own SolidStart app)
│   ├── billing-agg/                  # RENAMED from `billing/` to disambiguate from gaia/apps/api/server/billing.ts and gaia/packages/billing-ui/. Bundled-bill aggregation across customer instances.
│   ├── orchestrator/                 # provisioning + deploy automation
│   └── eject/                        # graceful-exit tooling backend
│
└── packages/
    ├── tenancy/                      # NEW IN gaia-cloud/ — note: the main repo's gaia/packages/tenancy/ (from 0004) is per-instance tenant scoping; gaia-cloud's tenancy/ is CROSS-INSTANCE orchestration. Different concerns; same name acceptable because the repos are separate.
    ├── provisioning/                 # resource provisioning across providers
    ├── routing/                      # tenant request routing at edge
    ├── migration/                    # ejection logic — produces standalone gaia/ codebases for ejecting customers
    └── revenue-share/                # cross-instance bundle revenue distribution
```

### Cross-repo dependency map

```
gaia-cloud/apps/orchestrator/  ─── consumes ──▶  gaia/ (as template; see ejection migration)
gaia-cloud/apps/billing-agg/   ─── reads ────▶  gaia/packages/metering/  (per-instance windowed Function output, replicated via gaia-cloud/packages/replicas equivalent or a direct sync)
gaia-cloud/packages/migration/ ─── produces ─▶  standalone gaia/ tarballs for eject
gaia/apps/api                  ─── reports ──▶  gaia-cloud/apps/control-api  (heartbeat + telemetry; only when running on gaia.cloud, not for self-hosted)
```

PR 13 ships `gaia-cloud/` skeleton (apps + empty packages); PR 14 fills in the 5 platform packages. No PR in this initiative modifies `gaia/` after PR 12.

## 4. Implementation

**Order of operations** (santiago/ first, gaia-cloud/ second — the platform repo can't ship until the capability framework it operates on is real):

1. `packages/capabilities/primitives/` — individual typed capabilities. Establishes the capability shape.
2. `packages/capabilities/bundles/` — predefined compositions. Bundles are SKUs.
3. `packages/capabilities/scoping/` — per-principal scope resolution. Agent credentials live here.
4. `packages/runtime/sandbox/` — extends 0004's `packages/runtime/` with per-principal iii Function isolation. Each capability invocation runs as a Function with its own CPU budget, memory limit, timeout, observability trace.
5. `packages/personas/` — voice and style config.
6. `packages/adapters/{payments,email}/` — vendor wrappers.
7. `packages/billing/` — subscription state + payment flows + user-facing UI. Billing computation stays in `packages/metering/` (0004); this package is the UI layer.
8. `packages/support/` — help desk, ticket lifecycle, inbox.
9. `packages/projections/metrics/` + materialize.ts — fifth projection family. MRR/churn/LTV materialized from the event stream.
10. `packages/capabilities/composition/` — depends on `packages/replicas/` (0005). Cross-instance bundles maintain local replicas of remote behavior surfaces. Most invocations resolve locally; cross-instance writes are explicit, async, visible.
11. `apps/labor/` — real-time labor app. Live cost per employee from windowed metering Function. Filtered timeline + presence feed + economic data.
12. `.claude/skills/w-capability/` — conversational hiring/firing skill.
13. `gaia-cloud/` (separate repo) — control-api, dashboard, billing aggregation, orchestrator, eject. `revenue-share/` distributes cross-instance bundle revenue at platform level.
14. End-of-wave audit: cross-instance invocation p99 <100ms steady state; 0 sandbox bypasses; 100% labor metering off windowed Function.

**Risks**:

1. **Sandbox isolation fails for high-throughput bundles.** Mitigation: hard CPU/memory/timeout limits per invocation; trip the breaker before exhaustion; emit a budget event the timeline surfaces.
2. **Replica drift detection misses semantic changes (signature stable, behavior changes).** Mitigation: replicas track behavior fingerprints in addition to signatures; reconciliation surfaces anomalies; fallback to remote on suspected drift.
3. **Cross-instance bundle revenue share has tax implications.** Mitigation: `gaia-cloud/packages/revenue-share/` documents the publisher-payable model; legal review before paid bundles ship.
4. **The labor app feels like dashboards instead of presence.** Mitigation: presence-first UI (who's working, who's queued, who's escalating); cost is a sidebar, not the centerpiece.
5. **Cross-instance bundle source becomes a supply-chain risk.** Mitigation: bundles ship with signed manifests; replicas verify signatures before invocation; the founder sees publisher provenance in the hire dialog.

**Out of scope**:

- Founder-authored capability bundles (v1.1).
- Multi-currency invoicing (v1.1).
- SLA enforcement in support package (v1.1).
- Auto-tuning personas from feedback (v1.1).
- Cohort analysis beyond MRR/churn/LTV (v1.1).
- Multi-principal scope sharing (defer).

## 5. PR Breakdown

| PR  | Title                                                                         | Files (high-level)                                                             | Status  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| 1   | `packages/capabilities/primitives/`                                           | typed capability shape, registry hookup                                        | pending |
| 2   | `packages/capabilities/bundles/`                                              | predefined compositions, SKU mapping                                           | pending |
| 3   | `packages/capabilities/scoping/`                                              | per-principal scope, agent credentials                                         | pending |
| 4   | `packages/runtime/sandbox/`                                                   | iii Function isolation, resource limits, timeout                               | pending |
| 5   | `packages/personas/`                                                          | voice and style configuration                                                  | pending |
| 6   | `packages/adapters/payments/` + `packages/adapters/email/`                    | Polar wrapper + Resend transactional wrapper                                   | pending |
| 7   | `packages/billing/` (UI layer)                                                | subscription state, payment flows, billing UI                                  | pending |
| 8   | `packages/support/`                                                           | help desk, ticket lifecycle, inbox                                             | pending |
| 9   | `packages/projections/metrics/` + materialize.ts                              | MRR/churn/LTV projection                                                       | pending |
| 10  | `packages/capabilities/composition/` (cross-instance via replicas)            | local replica of remote behavior, drift detection, async cross-instance writes | pending |
| 11  | `apps/labor/` — real-time labor app                                           | presence, queue, escalations, live cost per employee                           | pending |
| 12  | `.claude/skills/w-capability/`                                                | conversational hire/fire skill                                                 | pending |
| 13  | `gaia-cloud/` skeleton (separate repo)                                        | control-api, dashboard, billing-agg, orchestrator, eject                       | pending |
| 14  | `gaia-cloud/packages/{tenancy,provisioning,routing,migration,revenue-share}/` | platform packages                                                              | pending |
| 15  | Wave 4 audit                                                                  | cross-instance p99 <100ms + 0 sandbox bypasses + windowed-Function metering    | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                                              | Source                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1 | Wave 4 = Initiative 0009. Depends on `packages/replicas/` (0005), `packages/contracts/network/` (0007), `packages/metering/` (0004).                  | Founder 2026-04-29                     |
| F-2 | Capabilities are SKUs. Bundles ARE the pricing unit. Architecture and pricing are the same shape.                                                     | Founder 2026-04-29 (v5 vision §Wave 4) |
| F-3 | Cross-instance invocation resolves against local replicas. Remote consulted only on drift detection.                                                  | Founder 2026-04-29 (v5 vision §Wave 4) |
| F-4 | Sandbox isolation is per-principal. Each capability invocation = its own iii Function with budget.                                                    | Founder 2026-04-29 (v5 vision §Wave 4) |
| F-5 | `gaia-cloud/` is a SEPARATE REPO from `santiago/`. The platform isn't part of the template — it's the managed business that operates on the template. | Founder 2026-04-29 (v5 vision §Wave 4) |
| F-6 | Billing computation stays in `packages/metering/` (0004). `packages/billing/` is UI + state + payment flows only.                                     | Founder 2026-04-29 (v5 vision §Wave 4) |
| F-7 | Bundle manifests are signed; replicas verify before invocation. Founder sees publisher provenance in the hire dialog.                                 | Founder 2026-04-29 (supply-chain risk) |
| F-8 | Founder-authored bundles deferred to v1.1. v1.0 ships predefined bundles only.                                                                        | Founder 2026-04-29                     |
| F-9 | Labor app is presence-first. Cost is a sidebar, not the centerpiece.                                                                                  | Founder 2026-04-29                     |

## 7. Existing-scaffold reconciliation (added 2026-04-29)

Mirrors 0004 §7.15. Names the existing-repo collisions corrected in §3.

| #    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PR(s)           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| R-1  | `packages/adapters/payments.ts` and `packages/adapters/email.ts` ALREADY EXIST today (Polar + Resend, flat files). PR 6 does NOT create them — it EDITS them to add Stripe/Lemon swap-path scaffolding (payments) and transactional-template helpers (email). The original §3 listed them as new directories; that was wrong.                                                                                                                                           | 6               |
| R-2  | The original §2 cap table named `apps/labor/` as a separate SolidStart app. Per the 0004 §7.15 R-4 / 0008 §7 R-1 pattern (chat, timeline, composer all became routes in `apps/web/`), labor lands as `apps/web/src/routes/labor.tsx` UNLESS a hard requirement for separate deploy/realtime infrastructure surfaces during PR 11 design. Default: route in apps/web. Justification for separate app would need PR 11 to make the case; otherwise stick with the route.  | 11              |
| R-3  | `packages/billing/` was the original §3 name. RENAMED to `packages/billing-ui/` to avoid concept-collision with the existing `apps/api/server/billing.ts` (which today owns Polar billing routes + processPolarEvent). Computation lives in `packages/metering/` (0004); `apps/api/server/billing.ts` is the API route layer; `packages/billing-ui/` is the UI components consumed by `apps/web/src/routes/billing.tsx`. Three distinct concerns, three distinct paths. | 7               |
| R-4  | `packages/runtime/sandbox/` is a SUBDIR of the existing `packages/runtime/src/` (created in 0004 PR 2, extended in 0005 PR 1 with `budgets/`). It composes with the budget primitive — a sandboxed iii Function declares both a budget AND a sandbox scope.                                                                                                                                                                                                             | 4               |
| R-5  | `packages/projections/metrics/` is a SUBDIR of `packages/projections/` (created in 0006). Its materialize.ts implements the 0005 handler contract.                                                                                                                                                                                                                                                                                                                      | 9               |
| R-6  | `packages/capabilities/composition/` (PR 10) consumes `packages/replicas/subscription/` from 0005 PR 6. The behavior-fingerprint check (R-3 falsifier) reads from `packages/db/schema/replica-fingerprints.ts` — that table is NEW in this PR.                                                                                                                                                                                                                          | 10              |
| R-7  | All new tables go to `packages/db/schema/` per 0004 §7.15 R-3. The existing `subscriptions` table (Polar billing) is a peer of, not a replacement for, the new `capability-invocations` and `employees` tables.                                                                                                                                                                                                                                                         | 1, 5, 8, 10, 11 |
| R-8  | `gaia-cloud/` is a SEPARATE REPO. PRs 13 and 14 are the only ones that touch it. PR 13 creates the skeleton; PR 14 fills the 5 platform packages. The cross-repo dependency map in §3 documents how gaia/ and gaia-cloud/ communicate (heartbeat, billing aggregation, migration tarballs).                                                                                                                                                                             | 13, 14          |
| R-9  | `gaia-cloud/packages/tenancy/` is named the same as `gaia/packages/tenancy/` (0004) but addresses a different concern (cross-instance vs. per-instance). Acceptable because the repos are separate; do NOT consolidate into a shared package.                                                                                                                                                                                                                           | 14              |
| R-10 | `gaia-cloud/apps/billing-agg/` is RENAMED from the original §3 `billing/` to disambiguate from `gaia/apps/api/server/billing.ts` (route handler) and `gaia/packages/billing-ui/` (UI components). Three names, three concerns, no collisions.                                                                                                                                                                                                                           | 13              |
| R-11 | iii Functions in this initiative MUST declare `budget` per 0005 R-8 (validate-artifacts.ts rule). The sandbox primitive (PR 4) extends the rule: budgeted + sandboxed Functions emit two kinds of timeline events on violation (budget exceeded, sandbox violation).                                                                                                                                                                                                    | 4               |

**Existing-files-touched trace (gaia/ only):**

- `packages/adapters/payments.ts` — PR 6 EDIT (add swap-path scaffolding; do not rewrite Polar code)
- `packages/adapters/email.ts` — PR 6 EDIT (add transactional-template helpers)
- `packages/adapters/CLAUDE.md` — PR 6 (no Files-table change; just update the description for payments + email)
- `packages/runtime/src/define-function.ts` — PR 4 (add `sandbox?: SandboxScope` field to wrapper signature)
- `apps/api/server/app.ts` — PRs 4, 7, 8, 11 (mount capability-invocation route, billing-ui-backing endpoints, support endpoints, labor endpoints inside the existing Elysia plugin chain)
- `apps/api/server/billing.ts` — PR 7 (the existing route file is referenced by billing-ui; no rewrite, just additional read-shape endpoints if needed)
- `apps/web/src/routes/billing.tsx` — PR 7 (existing route consumes billing-ui components)
- `apps/web/src/routes/labor.tsx` — PR 11 (NEW route)
- `apps/web/src/lib/api.ts` — PRs 7, 11 (extend Eden Treaty client)
- `packages/db/schema/index.ts` — PRs 1, 5, 8, 10, 11 (re-export new entities)
- `.gaia/rules/checks/validate-artifacts.ts` — PR 4 (extend with sandbox-required rule for capabilities); PR 15 (audit invokes the full sweep)
