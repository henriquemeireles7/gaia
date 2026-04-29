---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Implementing autonomous operations as event subscribers — iii Functions consuming local event streams (or local materialized replicas of remote streams) and invoking capability bundles — lets the founder describe outcomes ("every Monday, send churn-risk users from the last week"; "every Tuesday, fetch new patient acquisition patterns from the dental-practice network") and have the autonomous machinery materialize without ever seeing the words "subscriber," "trigger," "playbook," or "replica."
falsifier: After Wave 5 ships, ≥1 subscriber blocks the founder's chat session waiting on its execution, OR ≥1 cross-instance subscriber consumes from a synchronous remote poll rather than a local materialized replica, OR playbook authoring requires a developer rather than a founder. Window: through 90 days post-launch.
measurement:
  {
    metric: 'subscriber-creation latency (founder describes outcome → subscriber exists) + count of synchronous cross-instance polls + non-conversational playbook authoring count',
    source: 'subscriber creation traces + replica audit + playbook commit history',
    baseline: 'N/A (pre-Wave-5)',
    threshold: 'subscriber creation <60s end-to-end + 0 synchronous polls + 100% playbooks authored conversationally',
    window_days: 90,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 5
status: not-started
---

# Initiative 0010 — Wave 5: Subscribers, with Cross-Instance Streaming

Autonomous operations as event subscribers invoking capability bundles. The founder describes outcomes; subscribers exist. In v5, cross-instance subscribers consume from local materialized event streams (replicas of remote event slices), not synchronous polls. Subscribers run as iii Functions with budgets. The architectural payoff of the seven Wave 0 invariants is loudest here — subscribers are tiny because everything they need already exists, materialized and replicated.

## 1. Context / Research

Subscribers without capabilities (Wave 4, Initiative 0009) are decorative. Conversational authorship requires Wave 0's primitives (0004 + 0005). Cross-instance subscription requires the replicas mechanism (0005) and the contract surface (0007) for discovery. Wave 5 is the wave where the architecture pays off — every subscriber is small because everything it needs is already in place.

Today's state (post-0009): the operational back office renders at memory speed; capabilities are sold as employees; the labor app shows live cost; cross-instance invocation resolves against local replicas. But there's no autonomy — no subscriber that fires every Monday morning, no cross-instance subscriber that watches a vertical's patterns, no playbook that codifies operational knowledge.

The category-defining version: the founder describes outcomes and the system creates autonomous machinery — including cross-instance subscriptions that connect the founder's operations to the network's operational rhythms, all running at memory speed because cross-instance state is replicated locally. They never see "subscriber," "trigger," "playbook," or "replica." They say "every Monday morning, send me churn-risk users from the last week" and a subscriber exists. They say "every Tuesday, show me how dental-practice instances are handling new patient onboarding" and a cross-instance subscriber exists, billed per event consumed, executing against the local replica in milliseconds.

Wave 5 closes the v5 architecture: the founder operates a self-sustaining, network-aware, autonomous system. Every architectural invariant from Wave 0 has paid off.

## 2. Strategy

**Problem**: Without subscribers, the system is reactive — the founder asks, the system answers. Without autonomy, the operational rhythms (weekly churn reviews, monthly forecasting, real-time escalations) require the founder's ongoing attention. Without cross-instance subscribers, the network is a discovery surface but not an operational connection.

**Approach** (chosen): three subscriber families — time-based (rhythms), domain-event (triggers), cross-instance (replicas). Each subscriber is an iii Function with a budget. Escalation conventions emit signals that humans can pick up. Playbooks are versioned content per tenant. All authored conversationally through streaming chat.

**Cap table** (what 0010 ships v1.0):

| Surface                                | Ships v1.0                                                                                                                          | Capped                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/subscribers/time/`           | Subscribers to time-based events (rhythms) firing on iii.dev's cron triggers                                                        | Sub-second cron (defer; minute-resolution v1.0) |
| `packages/subscribers/domain/`         | Subscribers to domain events (triggers)                                                                                             | —                                               |
| `packages/subscribers/cross-instance/` | Subscribers consuming from local materialized replicas of remote event streams; depends on `packages/replicas/`                     | Multi-source aggregation (defer)                |
| `packages/subscribers/escalations/`    | Convention for human-handoff emission                                                                                               | Escalation routing rules engine (manual v1.0)   |
| Adapters                               | `packages/adapters/analytics/` (PostHog), `packages/adapters/logging/`, `packages/adapters/tracing/`                                | Custom analytics destinations (defer)           |
| `content/playbooks/`                   | `sales/`, `support/`, `growth/`, `product/` — versioned, per-tenant overridable; successful playbooks contribute back via telemetry | —                                               |
| `d-autonomous` skill                   | Authors subscribers conversationally; sub-skills for lifecycle-triggers, content-freshness, deps-update, perf-audit, security-audit | —                                               |

## 3. Folder Structure

```
santiago/
├── packages/
│   ├── subscribers/                  # NEW — event subscribers — autonomous operations
│   │   ├── time/                     # subscribers to time-based events (rhythms)
│   │   ├── domain/                   # subscribers to domain events (triggers)
│   │   ├── cross-instance/           # subscribers consuming from local replicas
│   │   │   └── (depends on packages/replicas/ from 0005)
│   │   └── escalations/              # convention for human-handoff emission
│   │
│   └── adapters/
│       ├── analytics/                # NEW — PostHog (signal source beyond iii's observability)
│       ├── logging/                  # NEW — external logging not covered by iii
│       └── tracing/                  # NEW — external tracing not covered by iii
│
├── content/
│   └── playbooks/                    # NEW — action sequences, versioned, per-tenant overridable
│       ├── sales/
│       ├── support/
│       ├── growth/
│       └── product/
│
└── .claude/skills/
    └── d-autonomous/                 # NEW — authors subscribers conversationally
        ├── lifecycle-triggers/
        ├── content-freshness/
        ├── deps-update/
        ├── perf-audit/
        └── security-audit/
```

## 4. Implementation

**Order of operations**:

1. `packages/subscribers/time/` — time-based subscribers firing on iii.dev cron triggers. First subscriber family establishes the iii-Function-with-budget shape for all subscribers.
2. `packages/subscribers/domain/` — domain-event subscribers consuming from the local event stream.
3. `packages/subscribers/cross-instance/` — depends on `packages/replicas/` (0005). Consumes from local replicas of remote event streams.
4. `packages/subscribers/escalations/` — convention for emitting human-handoff signals. Timeline surfaces these.
5. `packages/adapters/{analytics,logging,tracing}/` — external signal sources beyond iii.dev's observability.
6. `content/playbooks/{sales,support,growth,product}/` — versioned action sequences, per-tenant overridable. Successful playbooks contribute back via telemetry (0004) for the network registry.
7. `.claude/skills/d-autonomous/` — authors subscribers conversationally. Sub-skills:
   - `lifecycle-triggers/` — common patterns (welcome series, anniversary, renewal)
   - `content-freshness/` — content decay detection and recomposition
   - `deps-update/` — dependency hygiene as autonomous operation
   - `perf-audit/` — performance regression detection (subscriber on budget violations)
   - `security-audit/` — security-event subscribers
8. End-of-wave audit: subscriber creation latency <60s end-to-end; 0 synchronous cross-instance polls; 100% playbooks authored conversationally.

**Risks**:

1. **Cross-instance subscribers consume the founder's metering budget unexpectedly.** Mitigation: per-subscription budget cap with founder-visible cost preview at creation; alert in timeline before threshold hit.
2. **Playbook contribution back to telemetry leaks tenant-specific data.** Mitigation: contribution pipeline strips tenant context; only invocation patterns + outcomes shared, never inputs/outputs.
3. **Subscriber storm from cascading domain events.** Mitigation: budgets on each subscriber; circuit breaker if Function exceeds budget; timeline event surfaces the storm and the breaker trip.
4. **Escalation conventions diverge across founders' codebases.** Mitigation: convention is a typed event (`escalation.requested`) with required metadata; the convention is enforced via `validate-artifacts.ts`.
5. **Founder describes a complex outcome ("every Tuesday cross-reference these three sources and trigger this") and the conversational authoring fails.** Mitigation: `d-autonomous` decomposes complex outcomes into multiple subscribers; the chat shows the decomposition before creation; founder approves.

**Out of scope**:

- Sub-second cron resolution (v1.1).
- Multi-source aggregation in cross-instance subscribers (v1.1).
- Escalation routing rules engine (manual routing v1.0).
- Custom analytics destinations beyond PostHog (defer to demand).
- Founder-authored sub-skills under `d-autonomous/` (v1.0 ships the five core sub-skills; founders extend later).

## 5. PR Breakdown

| PR  | Title                                               | Files (high-level)                                                                               | Status  |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| 1   | `packages/subscribers/time/`                        | iii.dev cron triggers, budget declarations, lifecycle                                            | pending |
| 2   | `packages/subscribers/domain/`                      | event-stream subscription, idempotency, ack discipline                                           | pending |
| 3   | `packages/subscribers/cross-instance/`              | wires replicas to subscriber model, per-subscription budget                                      | pending |
| 4   | `packages/subscribers/escalations/`                 | typed `escalation.requested` event, timeline surface                                             | pending |
| 5   | `packages/adapters/{analytics,logging,tracing}/`    | PostHog wrapper, logging adapter, tracing adapter                                                | pending |
| 6   | `content/playbooks/{sales,support,growth,product}/` | versioned action sequences with per-tenant override                                              | pending |
| 7   | `.claude/skills/d-autonomous/` shell                | top-level conversational subscriber authoring skill                                              | pending |
| 8   | `d-autonomous/lifecycle-triggers/`                  | welcome/anniversary/renewal patterns                                                             | pending |
| 9   | `d-autonomous/content-freshness/`                   | content decay detection                                                                          | pending |
| 10  | `d-autonomous/deps-update/`                         | dependency hygiene as autonomous operation                                                       | pending |
| 11  | `d-autonomous/perf-audit/`                          | perf-regression subscriber on budget violations                                                  | pending |
| 12  | `d-autonomous/security-audit/`                      | security-event subscribers                                                                       | pending |
| 13  | Playbook contribution pipeline                      | telemetry-back contribution stripping tenant context                                             | pending |
| 14  | Wave 5 audit (full v5 architecture proven)          | subscriber creation <60s + 0 sync polls + 100% conversational + all 4 calcification moves intact | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                                 | Source                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1 | Wave 5 = Initiative 0010. Depends on `packages/replicas/` (0005), `packages/capabilities/` (0009), `packages/contracts/network/` (0007). | Founder 2026-04-29                     |
| F-2 | Three subscriber families: time, domain, cross-instance. Plus escalations convention.                                                    | Founder 2026-04-29 (v5 vision §Wave 5) |
| F-3 | Subscribers are iii Functions with budgets. Same shape as every other async concern.                                                     | Founder 2026-04-29 (v5 vision §Wave 5) |
| F-4 | Cross-instance subscribers consume from local replicas. Never synchronous polls.                                                         | Founder 2026-04-29 (v5 vision §Wave 5) |
| F-5 | Playbooks contribute back via telemetry (0004) — patterns only, no tenant context.                                                       | Founder 2026-04-29 (v5 vision §Wave 5) |
| F-6 | Founder describes outcomes; the system never surfaces the words "subscriber," "trigger," "playbook," or "replica."                       | Founder 2026-04-29 (v5 vision §Wave 5) |
| F-7 | Per-subscription budget cap with founder-visible cost preview at creation.                                                               | Founder 2026-04-29 (cost-runaway risk) |
| F-8 | Wave 5 audit closes v5: all four calcification moves intact, the seven Wave 0 invariants paid off.                                       | Founder 2026-04-29                     |
