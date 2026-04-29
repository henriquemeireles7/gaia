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
| `d-capability` skill                 | Provisions capability bundles, hires/fires conversationally                                                                                            | —                                          |
| `gaia-cloud/`                        | NEW separate repo — control-api, dashboard, billing aggregation, orchestrator, eject tooling, tenancy, provisioning, routing, migration, revenue-share | —                                          |

## 3. Folder Structure

```
santiago/
├── packages/
│   ├── capabilities/                 # NEW — capability primitives + bundles + composition
│   │   ├── primitives/               # individual typed capabilities
│   │   ├── bundles/                  # predefined compositions
│   │   ├── scoping/                  # per-principal scope resolution + agent credentials
│   │   └── composition/              # cross-instance bundle sourcing via replicas
│   │       └── (depends on packages/replicas/ from 0005)
│   │
│   ├── personas/                     # NEW — voice and style configuration
│   │
│   ├── runtime/
│   │   └── sandbox/                  # NEW — iii Function isolation, resource limits, timeout
│   │
│   ├── billing/                      # NEW — subscription state + payment flows (UI presentation)
│   ├── support/                      # NEW — help desk, ticket lifecycle, inbox
│   │
│   ├── projections/
│   │   └── metrics/                  # NEW — event log → MRR, churn, LTV (triple-rendered)
│   │       └── materialize.ts
│   │
│   └── adapters/
│       ├── payments/                 # NEW — Polar wrapper (with Stripe/Lemon swap path)
│       └── email/                    # NEW — Resend wrapper for transactional mail
│
├── apps/
│   └── labor/                        # NEW — real-time labor app — presence, queue, escalations, cost
│
└── .claude/skills/
    └── d-capability/                 # NEW — provisions capability bundles, hires/fires conversationally

gaia-cloud/                           # NEW SEPARATE REPO — the managed platform
├── apps/
│   ├── control-api/                  # tenant control plane
│   ├── dashboard/                    # gaia.cloud customer dashboard
│   ├── billing/                      # bundled bill aggregation
│   ├── orchestrator/                 # provisioning + deploy automation
│   └── eject/                        # graceful-exit tooling backend
│
└── packages/
    ├── tenancy/                      # cross-tenant orchestration
    ├── provisioning/                 # resource provisioning across providers
    ├── routing/                      # tenant request routing at edge
    ├── migration/                    # ejection logic — produces standalone codebases
    └── revenue-share/                # cross-instance bundle revenue distribution
```

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
12. `.claude/skills/d-capability/` — conversational hiring/firing skill.
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
| 12  | `.claude/skills/d-capability/`                                                | conversational hire/fire skill                                                 | pending |
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
