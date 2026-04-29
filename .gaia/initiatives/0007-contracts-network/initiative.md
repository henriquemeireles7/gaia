---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Unifying documentation, schema discovery, and cross-instance discovery behind one typed contract surface — queried via hybrid retrieval (BM25 lexical + embeddings semantic + schema-hash cache) and backed by local materialized indices of the shared registry — produces memory-speed answers to both "how does support routing work in *my* code" and "what are the most-used support-routing patterns across the dental-practice Gaia network."
falsifier: After Wave 2 ships, ≥1 docs-app page or contract query waits on a synchronous network call to the shared registry rather than reading from a local materialized index, OR contract-query first-token latency p99 exceeds 200ms. Window: through Wave 4 ship-date.
measurement:
  {
    metric: 'p99 first-token latency on contract queries (local + cross-instance) + count of synchronous shared-registry calls',
    source: 'contracts query trace logs + grep audit',
    baseline: 'N/A (pre-Wave-2)',
    threshold: 'p99 < 200ms first-token + 0 synchronous shared-registry calls in user-facing paths',
    window_days: 60,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 2
status: not-started
---

# Initiative 0007 — Wave 2: Network-Extended Contract Surface, with Hybrid Retrieval

The contract surface — schema, types, tests, decisions — queryable through one typed interface, backed by a hybrid retrieval layer (BM25 + embeddings + cache) and a local materialized index of the shared registry. Documentation and discovery become the same surface, both rendering at memory speed.

## 1. Context / Research

The v4 thesis: contracts are a typed view over local schema, types, tests, decisions. v5 adds two characterizations: (1) the query layer uses hybrid retrieval — BM25 for lexical match, embeddings for semantic match, weighted ensemble — with results cached by schema hash; (2) the cross-instance discovery layer queries a _local materialized index_ of the shared registry, refreshed periodically and on push notification, never blocking on synchronous network calls.

Today's state (post-0006): admin renders at memory speed, MCP advertises every CRUD projection with push notifications, the streaming conversation package operates the command palette. But docs are missing. Cross-instance discovery is missing — the founder cannot ask "what are dental-practice instances doing for new patient onboarding" because there's no local materialized index to query.

Why now: every later wave needs a typed contract surface to ground in, and the network thesis needs a discovery surface that humans, agents, and other instances all read from at memory speed. Composition (Wave 4's cross-instance capability sourcing), syndication (Wave 3's content network), and operational subscription (Wave 5's cross-instance subscribers) all depend on this surface existing as a fast, replicated, materialized layer.

The category-defining version: when the founder asks "how does support routing work" in chat, the streaming response begins in <200ms because the contract query hits a local cache keyed on schema hash. When they ask "what are the most-used support-routing patterns in B2B SaaS Gaia instances," the response begins immediately because the cross-instance discovery hits a local materialized index, not a synchronous network call. Local docs and network discovery flow through one mechanism, both fast.

## 2. Strategy

**Problem**: Without a typed contract surface, documentation drifts from code, agents have nothing reliable to ground against, and cross-instance discovery is a poll loop. With a synchronous shared-registry layer, network latency cascades into every founder-facing query.

**Approach** (chosen): the contracts package becomes a typed view over local schema (BM25 + embeddings) AND a materialized replica of the shared registry (refreshed via push when subscribed, periodically when not). The docs app renders executable examples grounded in the user's actual schema. Inline contextual help in admin pulls from the same surface. Decisions are authored via dialog and indexed into the contract layer.

**Cap table** (what 0007 ships v1.0):

| Surface                          | Ships v1.0                                                                                                 | Capped                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/docs/`                     | Public docs surface, executable examples grounded in user's schema, triple-rendered                        | Multi-version docs (defer to v1.1)                        |
| `packages/contracts/query/`      | Hybrid retrieval — BM25 lexical, embeddings semantic, weighted ensemble, schema-hash cache invalidation    | Per-tenant ranking (universal v1.0)                       |
| `packages/contracts/network/`    | Cross-instance discovery via local materialized index (depends on `packages/replicas/` from 0005)          | Cross-instance write paths (Wave 4)                       |
| `packages/contracts/embeddings/` | Semantic similarity layer; consumed only by hybrid retrieval                                               | Custom embedding models (single OpenAI/Cohere model v1.0) |
| Docs projection                  | `packages/projections/docs/` + materialize.ts; contracts → docs pages + MCP discovery + pricing            | —                                                         |
| Changelog projection             | `packages/projections/changelog/` + materialize.ts; PR diff + contract delta → changelog (triple-rendered) | —                                                         |
| Search adapter                   | `packages/adapters/search/` — Postgres FTS wrapper, used by BM25 layer                                     | External search engines (defer)                           |
| Inline admin help                | Contextual help in admin pages pulls from the contract surface                                             | —                                                         |
| Decision authoring               | Dialog-driven decision capture, indexed into contracts                                                     | Decision review workflows (manual v1.0)                   |
| `d-contracts` skill              | Validates contract surface consistency, surfaces drift                                                     | —                                                         |

## 3. Folder Structure

```
santiago/
├── apps/
│   └── docs/                         # NEW — docs site, executable examples, triple-rendered
│
├── packages/
│   ├── contracts/                    # NEW — typed view over local schema + network discovery
│   │   ├── query/                    # hybrid retrieval (BM25 + embeddings + cache)
│   │   ├── network/                  # cross-instance discovery via local materialized index
│   │   │   └── (depends on packages/replicas/ from 0005)
│   │   └── embeddings/               # semantic vectors for similarity search
│   │
│   ├── projections/
│   │   ├── docs/                     # NEW — contracts → docs pages + MCP discovery + pricing
│   │   │   └── materialize.ts
│   │   └── changelog/                # NEW — PR diff + contract delta → changelog (triple-rendered)
│   │       └── materialize.ts
│   │
│   └── adapters/
│       └── search/                   # NEW — Postgres FTS wrapper (used by BM25 layer)
│
├── content/
│   ├── docs/                         # NEW — hand-authored docs supplements (overrides)
│   ├── changelog/                    # NEW — projected changelog entries
│   └── decisions-public/             # NEW — public decision records, indexed by contracts
│
└── .claude/skills/
    └── d-contracts/                  # NEW — validates contract consistency, surfaces drift
```

## 4. Implementation

**Order of operations**:

1. `packages/adapters/search/` — Postgres FTS wrapper. Required by BM25.
2. `packages/contracts/query/` — hybrid retrieval algorithm: BM25 over the lexical surface (entities, types, test descriptions, decision titles), embeddings over the semantic surface, weighted ensemble combines results. Schema-hash-keyed cache invalidates per-entity when the schema changes.
3. `packages/contracts/embeddings/` — semantic similarity layer. Consumed by hybrid retrieval only.
4. `packages/contracts/network/` — wires `packages/replicas/` (from 0005) to the shared registry. Maintains a local materialized index of the relevant slice — founder's vertical, capabilities they've subscribed to, instances they're tracking. Refreshes via push when subscribed; periodic refresh (hourly default) for casual discovery.
5. `packages/projections/docs/` + materialize.ts — second projection family. Docs render at memory speed.
6. `packages/projections/changelog/` + materialize.ts — third projection family. Changelog updates within seconds of a PR merge.
7. `apps/docs/` — public docs surface, triple-rendered. Renders against materialized projections.
8. Inline contextual help in admin — pulls from the contract surface; appears alongside fields, list views, etc.
9. Decision authoring dialog — `packages/conversation/stream/` operates a flow that captures decisions, formats them, indexes them into the contract layer.
10. `content/{docs,changelog,decisions-public}/` — hand-authored content surfaces.
11. `.claude/skills/d-contracts/` — validates contract surface consistency, surfaces drift.
12. End-of-wave audit: contract query p99 first-token <200ms; 0 synchronous shared-registry calls in user-facing paths.

**Risks**:

1. **Embedding generation latency on first query.** Mitigation: pre-compute embeddings on schema change (event-driven); cache by schema hash.
2. **Hybrid retrieval ensemble weights drift between domains.** Mitigation: per-domain weight tuning is out of scope v1.0; universal weights are documented and adjustable via env var.
3. **Local materialized index of shared registry grows large.** Mitigation: subscribe only to the founder's vertical + tracked instances + subscribed capabilities; explicit slice, not the whole registry.
4. **Decision authoring dialog feels heavyweight for trivial decisions.** Mitigation: lightweight default — title + 1 sentence + tags. Heavyweight pathways (premise + falsifier + measurement) are opt-in.

**Out of scope**:

- Multi-version docs (v1.1).
- Custom embedding models (single OpenAI/Cohere v1.0).
- Per-tenant retrieval ranking (universal v1.0).
- Cross-instance write paths through contracts (Wave 4 capability composition handles this).
- Decision review workflows (manual v1.0).

## 5. PR Breakdown

| PR  | Title                                                    | Files (high-level)                                          | Status  |
| --- | -------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| 1   | `packages/adapters/search/` — Postgres FTS wrapper       | adapter, BM25-shaped query interface                        | pending |
| 2   | `packages/contracts/query/` — hybrid retrieval           | BM25 + embeddings + ensemble + schema-hash cache            | pending |
| 3   | `packages/contracts/embeddings/` — semantic vectors      | embedding generation, vector storage                        | pending |
| 4   | `packages/contracts/network/` — cross-instance discovery | wires replicas to shared registry; local materialized index | pending |
| 5   | `packages/projections/docs/` + materialize.ts            | second projection family                                    | pending |
| 6   | `packages/projections/changelog/` + materialize.ts       | third projection family — PR diff → changelog               | pending |
| 7   | `apps/docs/` — public docs site                          | triple-rendered docs surface                                | pending |
| 8   | Inline contextual help in admin                          | help components pull from contract surface                  | pending |
| 9   | Decision authoring dialog                                | conversation flow, indexing into contracts                  | pending |
| 10  | `content/{docs,changelog,decisions-public}/`             | hand-authored content surfaces                              | pending |
| 11  | `.claude/skills/d-contracts/`                            | drift validation skill                                      | pending |
| 12  | Wave 2 audit                                             | p99 first-token <200ms + 0 sync shared-registry calls       | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                                 | Source                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| F-1 | Wave 2 = Initiative 0007. Depends on `packages/replicas/` from 0005.                                                     | Founder 2026-04-29                     |
| F-2 | Hybrid retrieval = BM25 + embeddings + weighted ensemble + schema-hash cache. Universal weights v1.0.                    | Founder 2026-04-29 (v5 vision §Wave 2) |
| F-3 | Cross-instance discovery NEVER blocks on a synchronous shared-registry call. Always reads from local materialized index. | Founder 2026-04-29 (v5 vision §Wave 2) |
| F-4 | Refresh cadence: push when subscribed; hourly default for casual discovery. Tunable per-subscription.                    | Founder 2026-04-29 (v5 vision §Wave 2) |
| F-5 | Decisions are authored via dialog, indexed into contracts. Lightweight default; opt-in heavyweight.                      | Founder 2026-04-29 (v5 vision §Wave 2) |
| F-6 | Inline contextual help in admin pulls from the contract surface — single source for help text.                           | Founder 2026-04-29 (v5 vision §Wave 2) |
