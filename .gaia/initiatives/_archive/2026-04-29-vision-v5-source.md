# Vision (v5)

Gaia is the agent-native operating system for solo founders shipping production SaaS in the agent era — a network of those SaaS instances that compound on each other — and a runtime that makes the whole thing feel faster than what it replaces.

The foundational thesis is one inversion: agents read first, humans second. Every architectural, experiential, economic, and runtime decision flows from that. Today's templates are AI-assisted; Gaia is agent-native end to end. Every principle is discoverable — humans through conversation, agents through live MCP discovery, other Gaia instances through the network. Every principle is enforceable. The codebase is itself the documentation, but the _interface_ to the codebase is conversational, streaming, and rendered at memory speed.

The product strategy is one bet, evolved across iterations and now committed at the runtime layer. v3 made it agent-native. v4 embedded it in a network. v5 commits to the runtime that prevents the four decisions that calcify before paying customers arrive: how the event log is structured, how projections materialize, how conversation streams, and how every async concern is treated. The strategic vision is the same; the runtime is now load-bearing.

## What changed in v5

This is v5. The strategic vision is unchanged. The architecture from v4 is preserved in its primitives — schema, events, capabilities, projections. The compression is preserved — six waves, no junk drawers, the network thesis intact. What changed in v5 is the _runtime layer_: how every architectural concept actually executes when paying customers arrive.

The previous reviews compressed _what_ the system is. This one compresses _how it runs_. The core insight that drove v5: four decisions calcify the moment customers exist, and v4 left all four implicit. Decided now, they cost a discipline. Decided later, they cost a rewrite under load.

Four foundational moves are committed in Wave 0:

**The event log is an append-only stream with logical replication, partitioned by tenant and time, never modified after write.** Postgres is still the substrate, but the access pattern changes. Writes append; consumers subscribe via logical replication; the events table becomes truth and everything else becomes a maintained view. This calcifies first because once there are millions of events under a wrong partition strategy, repartitioning under load is a months-long migration.

**Projections materialize incrementally via dedicated iii Function workers.** Reads hit materialized state at memory speed. The "projection function" stays the conceptual model the developer writes; the runtime model becomes incremental computation maintained by Function workers consuming the event stream. This calcifies because once projections are read-on-demand and the admin renders against live queries, retrofitting incremental materialization means rewriting every projection.

**Cross-instance composition is local replicas, not synchronous calls.** When a founder subscribes to a capability, content stream, or event from another Gaia instance, the local instance maintains a _replica_ of the relevant slice of remote state — sourced via the shared registry, kept current via change subscriptions. Local reads against cross-instance state hit local materialized tables. This calcifies because the alternative — synchronous network calls per cross-instance invocation — produces unbounded latency and cascading failures the moment the network has more than ten nodes.

**Every async concern is an explicit iii Function with budgets, backpressure, retries, and traces.** Projection materialization, telemetry contribution, conversation streaming, MCP push notifications, cross-instance event consumption, metering aggregation — all of these are iii Functions with explicit resource discipline. The architecture and the runtime are the same shape. This calcifies because once async work is scattered across packages without explicit Functions, observability breaks, backpressure breaks, retries break.

These four together are the runtime equivalent of bun-replacing-npm or oxlint-replacing-eslint at the architectural level. Each preserves what v4 says the system _is_ while making it dramatically faster and operationally simpler.

Two structural additions follow:

**`packages/materialization/`** is new — the projection state maintenance layer. Subscribes to the event log via logical replication and maintains projection read tables incrementally. Each projection from Wave 1+ has a corresponding materialization worker.

**`packages/replicas/`** is new — the cross-instance state replication layer. One mechanism, multiple consumers (capabilities composition, contracts network, channels network, subscribers cross-instance). One replica engine; four consumers depend on it.

The four primitives from prior versions stay: schema is state, events are history, capabilities are agency, projections are derived views. The triple-rendering principle from v4 stays: every projection produces human, MCP, and pricing outputs. v5 adds one runtime principle: **every read is fast, every async is explicit, every cross-instance is replicated.**

## The runtime thesis

Before describing the waves, the runtime thesis. This is what every wave-specific characterization in v5 hangs from, stated once so the rest reads cleanly.

**The event log is the database, structured as an append-only stream with explicit projection workers materializing read views in real time.** Postgres is underneath, but most reads never hit the events table. Writes append to a partitioned events table. Postgres logical replication streams changes to projection workers — iii Functions that subscribe to the event stream, maintain materialized read tables, and serve reads at memory speed. The conceptual model the developer writes (projection as function from events to view) is preserved; the runtime model under it (incremental computation maintained by Function workers) is committed.

**Cross-instance composition is a local materialized cache, not a runtime call.** When a founder subscribes to anything from another Gaia instance — a capability, a content stream, an event subscription, a contract surface — the local instance maintains a replica of the relevant slice of remote state. Replicas refresh via change subscriptions to the shared registry. Most invocations resolve against the local replica. Cross-instance writes (invoking a remote capability) are explicit, async by default, and visibly so in the conversation surface. The alternative is unbounded latency.

**Conversation is streaming end-to-end.** The conversation parser starts streaming intent extraction as the user types. The planner streams action sequences as they form. LLM calls stream from the first token. Confirmation surfaces render progressively. Cross-instance calls stream their state. The user never waits for a complete response; they watch the system think and act. First token in under 200 milliseconds is the bar.

**Every async or scheduled concern is an explicit iii Function.** Projection materialization. Replica reconciliation. Telemetry batching. Cross-instance event consumption. Metering aggregation. Conversation planning. Each one is an iii Function with an explicit budget (p50, p99 latency, max memory, max concurrency), backpressure, retries, and observability. The architecture and the runtime are the same shape. iii's live discovery surface advertises every Function as a capability; the same registry humans browse via admin, agents browse via MCP.

These four moves — committed in Wave 0 — produce the calcification fix. Every wave below describes how it changes given the runtime thesis.

## The four user-facing surfaces, with performance characterization

The experience model from v4 stays — chat, timeline, admin, MCP — with explicit performance characterization in v5.

**Chat** is the conversational interface. Powered by `packages/conversation/stream/`. Streaming end-to-end: first token in under 200 milliseconds, plan visible as it forms, confirmation rendering progressively, cross-instance dialogue streaming results as they arrive. The founder never waits for a complete response.

**Timeline** is the unified observability feed. Powered by the event log in `packages/events/` and surfaced via materialized views. Renders at memory speed. Surfaces latency budget violations: "your projection materialization is running 3x slower than budget" appears in the timeline alongside everything else. Founders see performance health without learning the architecture.

**Admin** is the visual operating surface. Powered by `packages/projections/` rendered through `packages/materialization/`. Every read hits a materialized table at memory speed. The admin renders Linear-fast. The founder asks "show me users who churned last month"; the result returns in tens of milliseconds because the projection has been continuously maintained.

**MCP** is the agent and network interface. Powered by `packages/mcp/` with push notifications via `packages/mcp/push/`. Agents and other Gaia instances subscribe to capability changes rather than polling. When the registry changes — a new projection appears, a capability's pricing updates, a deprecation begins — subscribers are notified within seconds without any polling overhead.

Most founder activity happens in chat and timeline at memory speed. Most cross-instance activity happens through MCP with push notifications. Most developer activity happens in code. The labor app, marketing app, composer app, docs app, billing meter, contribution dashboard — they exist as specialized lenses on these four, all rendered against materialized state.

## Gaia-on-Gaia as organizational principle

Throughout every wave, we operate our own businesses on Gaia. Gaia Cloud, Gaia Education, Gaia Studio, the network telemetry registry — each is a Gaia instance, dogfooding every wave including the runtime layer. The shared telemetry registry runs as a Gaia instance, ingesting contributions through the same materialization workers and replicas mechanisms that everyone else uses. Meta-dogfood is structural. Performance problems we encounter, our customers don't.

---

## Wave 0 — Foundation

The agent-native template, with seven architectural invariants from line one. Wave 0 grew once more in v5 because the runtime thesis adds the seventh invariant — and as before, every new invariant collapses scope elsewhere.

### Thesis

Wave 0 establishes seven substrates simultaneously: events as the truth of what happened (now append-only and replicated), hexagonal layering as the structural discipline, tenancy as a query-time invariant, an agent-native runtime built on iii.dev with MCP plus live capability registry plus streaming conversational harness, metering as a projection over events, telemetry contribution as a network primitive, and **runtime discipline** — every async concern is an explicit iii Function with materialization, streaming, replicas, and budget discipline. Every later wave's experience surface, economic surface, network surface, and _operational reality_ attach to these seven.

### What ships

The locked stack — Bun, Elysia, SolidStart, Eden Treaty, TypeBox, Drizzle on Neon Postgres with logical replication enabled, Better Auth, Polar, Resend, Railway. iii.dev as the runtime substrate. The Constitutional Loop, the four-peer organization, the methodology in `.gaia/`, the harness in `.claude/`, the d-\* skill family.

Beyond the existing template, seven foundational invariants:

**Event log as append-only stream.** A typed events table partitioned by tenant_id and time-bucketed weekly. Postgres logical replication enabled from day one. Strict append-only discipline: never modify existing event types, only add new ones, with version metadata. Periodic snapshots for fast replay. Reading directly from the events table is rare — most reads hit materialized projections from Wave 1+.

**Hexagonal layering.** `packages/domain/` contains pure domain logic. `packages/adapters/` contains every external service wrapper. Domain code never imports from adapters; application services orchestrate between them.

**Tenancy from day one.** Every table has `tenant_id`. Every query is scoped. Every event carries tenant context. Single-tenant deployments use `default` as the tenant. The cost is one column.

**Agent-native runtime from line one.** iii.dev's live discovery exposes every Function as a capability. `packages/mcp/` advertises the live registry with push notifications on change. `packages/conversation/stream/` accepts natural language and streams system actions, with progressive confirmation for destructive operations. The chat app and timeline app ship as the two primary human surfaces, both rendered at memory speed.

**Metering as a projection from line one.** Every capability invocation emits a `capability.invoked` event with cost metadata. `packages/metering/` projects over these events through a windowed iii Function that maintains running aggregations per tenant per pricing tier. Reading the founder's current bill hits the materialized aggregation, not the raw event stream. Bills update with sub-second freshness; the hot path of capability invocation never blocks on billing computation.

**Telemetry contribution as a Wave 0 invariant.** Every Gaia instance, by default, contributes anonymized capability invocation patterns and successful playbook executions to a shared registry that itself runs as a Gaia instance. Contribution is an explicit iii Function with batching, backpressure, and exponential backoff. Telemetry costs measurable in basis points of an instance's compute, not percent.

**Runtime discipline.** Every async concern is an explicit iii Function with budget declarations, backpressure, retries, and observability. Projection materialization workers, replica reconcilers, telemetry batchers, conversation planners, MCP push notifiers, metering aggregators — all of them. Every Function declares p50/p99 latency budgets, max memory, max concurrency. The timeline surface shows budget violations alongside everything else.

The onboarding experience tests whether this wave is right: `bun create gaia my-app` provisions a working SaaS with auth, payments, an admin app rendering at memory speed, an MCP endpoint with push notifications, a streaming chat interface, a billing meter computed via materialized aggregation, telemetry contribution opted in with backpressure, and a deployed URL — all in approximately ninety seconds. The founder talks to the system from the moment it exists. From the first invocation, they are part of the network. From the first read, the system is fast.

### The 10x cut

The category-defining version is not "we have a fast admin." It is that _every layer of the system is structurally fast because the runtime model is the architecture model_. Reads are fast because projections are materialized. Cross-instance is fast because remote state is replicated locally. Conversation is fast because everything streams. Async work is observable because every async concern is an explicit Function with budgets. There is no place where the architecture is conceptually clean but operationally slow. There is no place where "we'll fix performance later" is a deferred technical debt. The runtime calcifies in Wave 0 because it has to.

### Why this position

Wave 0 because every other wave's experience surface, economic surface, network surface, and _operational reality_ attach here. Without materialization, the admin renders slowly. Without replicas, cross-instance composition produces cascading failures. Without streaming, the conversation surface feels like a 2019 chatbot. Without iii Function discipline, async work has no observability. These cannot wait — and v5 keeps proving that the more invariants we move into Wave 0, the more later waves shrink and the more durable the foundation becomes.

### Added folder structure

```
santiago/
├── apps/
│   ├── chat/                       # streaming-first conversational interface
│   └── timeline/                   # unified observability + latency budget surfaces
│
├── packages/
│   ├── runtime/                    # iii.dev integration — execution substrate
│   │   ├── functions/              # all async/scheduled concerns as Functions
│   │   ├── triggers/               # trigger definitions (HTTP, queue, cron, event)
│   │   ├── workers/                # worker configurations and lifecycle
│   │   └── budgets/                # per-Function latency, memory, concurrency budgets
│   │
│   ├── events/                     # append-only stream, partitioned, replicated
│   │   ├── schema/                 # typed event definitions (append-only discipline)
│   │   ├── emit/                   # tenant-scoped, partitioned writes
│   │   ├── stream/                 # logical replication consumer infrastructure
│   │   └── snapshot/               # periodic snapshots for fast replay
│   │
│   ├── materialization/            # NEW — projection state maintenance
│   │   ├── workers/                # iii Functions consuming event stream
│   │   ├── handlers/               # event-to-state mutation handlers
│   │   └── invalidation/           # cache invalidation on schema changes
│   │
│   ├── replicas/                   # NEW — local materialized replicas of remote state
│   │   ├── subscription/           # subscribing to remote event streams
│   │   ├── reconciliation/         # detecting and applying remote drift
│   │   └── invalidation/           # local invalidation on remote change
│   │
│   ├── domain/                     # pure domain logic, no IO
│   ├── tenancy/                    # tenant-scoping invariants
│   │
│   ├── mcp/                        # agent + network capability surface
│   │   ├── server/                 # streaming MCP endpoint
│   │   ├── registry/               # runtime capability registry (sourced from iii)
│   │   ├── push/                   # NEW — push notifications on registry change
│   │   └── discovery/              # capability advertisement
│   │
│   ├── conversation/               # streaming-first natural language layer
│   │   ├── stream/                 # NEW — end-to-end streaming spine
│   │   ├── parser/                 # streaming intent extraction
│   │   ├── planner/                # streaming action sequencing
│   │   └── confirmation/           # progressive confirmation rendering
│   │
│   ├── metering/                   # priced events as windowed aggregations
│   │   ├── pricing/                # SKU definitions tied to capability bundles
│   │   ├── meter/                  # iii Function aggregating priced events
│   │   └── invoice/                # invoice projection
│   │
│   ├── telemetry/                  # backpressured network contribution
│   │   ├── contribute/             # iii Function with explicit batching + backoff
│   │   └── consume/                # registry-side ingestion
│   │
│   └── adapters/
│       └── llm/                    # streaming-aware LLM provider wrapper
│
├── .gaia/
│   └── reference/
│       └── architecture/           # seven primitives, four surfaces, runtime thesis
│
└── .claude/skills/
    └── d-converse/                 # harness skill for conversation flow
```

`apps/chat/` is the streaming conversational interface. The first token streams in under 200 milliseconds. Cross-instance dialogue streams state as it arrives. The founder never waits.

`apps/timeline/` renders the event log via materialized aggregations. Surfaces latency budget violations alongside operational events. Founders see performance health in the same feed they see business activity.

`packages/runtime/` wraps iii.dev with v5's runtime discipline. `functions/`, `triggers/`, `workers/` mirror iii's three primitives. `budgets/` is new — declarative budget specifications per Function (p50, p99, max memory, max concurrency). Violations emit events the timeline surfaces.

`packages/events/` is restructured from v4. `schema/` defines the typed events with strict append-only discipline. `emit/` writes to the partitioned events table. `stream/` is new — infrastructure for logical replication consumers (the workers in `packages/materialization/` are the primary consumers). `snapshot/` is new — periodic snapshots that allow fast replay without reading from the beginning of time.

`packages/materialization/` is new in v5 and structurally foundational. `workers/` houses the iii Functions that consume the event stream and maintain projection state. `handlers/` defines the event-to-state mutation logic per projection. `invalidation/` handles cache invalidation when schemas change. This package is what makes "projections are runtime functions" coexist with "reads are fast" — the conceptual model is preserved, the runtime model is committed.

`packages/replicas/` is new in v5 and the structural answer to cross-instance composition. `subscription/` handles subscribing to remote event streams via the shared registry. `reconciliation/` detects drift between local replicas and remote sources, applying corrections. `invalidation/` invalidates local replica state when remote sources change. Four downstream packages depend on this: `packages/capabilities/composition/`, `packages/contracts/network/`, `packages/channels/network/`, `packages/subscribers/cross-instance/`. One replica engine; multiple consumers.

`packages/domain/`, `packages/tenancy/` are unchanged from v4.

`packages/mcp/` gains `push/` — push notifications when the capability registry changes. Subscribers (agents, other instances) get notified rather than polling. This is what makes MCP a low-latency surface across the network.

`packages/conversation/` gains `stream/` — the end-to-end streaming spine. `parser/` streams intent extraction. `planner/` streams action sequencing. `confirmation/` renders progressively. The chat app and CLI both consume the stream.

`packages/metering/` is structurally the same as v4 but `meter/` is now explicitly an iii Function with windowing semantics. The aggregation runs continuously over the event stream; reading the bill hits the materialized aggregation.

`packages/telemetry/contribute/` is now explicitly an iii Function with batching, backpressure, exponential backoff. The registry-side `consume/` is the same code running in registry mode (the registry is itself a Gaia instance, dogfooding).

`packages/adapters/llm/` requires streaming awareness as a hard requirement. Non-streaming LLM providers are not supported. The streaming spine in `packages/conversation/stream/` depends on this.

`.gaia/reference/architecture/` formalizes the seven primitives, the four surfaces, the network thesis, the runtime thesis, the hexagonal pattern, the dogfood doctrine, and the skill/package consolidation rule. Canonical for both humans and agents.

`.claude/skills/d-converse/` carries from v4 unchanged.

---

## Wave 1 — Reactive Triple-Rendered Projections, materialized

### Thesis

The schema is the admin AND the agent capability descriptor AND the priced SKU, simultaneously. Every projection is a tri-functor producing three outputs. In v5, every projection also declares a materialization handler that consumes the event stream and maintains the projection's read state incrementally. The conceptual model the developer writes is the same as v4; the runtime model under it is committed.

### What ships

A complete operational back office, projected at runtime from the Drizzle schema, triple-rendered for humans, agents, and the meter. Each projection ships with two artifacts: the conceptual function (input is schema/events, outputs are admin UI + MCP descriptor + pricing descriptor) and a generated materialization worker (an iii Function in `packages/materialization/workers/`) that consumes the event stream and maintains the projection's read state.

The conversational command palette inside the admin uses Wave 0's streaming conversation package. "Show me users who churned last month" produces a query result rendered from the materialized projection at memory speed (tens of milliseconds), a saved view persisted as a derived projection, and an audit event. "Add a 'priority' field to support tickets" walks the founder through a confirmed migration that: applies the schema change, registers the new projection version with iii's discovery, spawns the new materialization worker, replays historical events through the worker to build initial state, and only then advertises the v2 projection through MCP and the admin. The founder sees a streaming progress indicator as the new projection materializes ("processed 12,847 of 24,103 historical events"). The v1 projection keeps materializing in parallel during the deprecation window. Live discovery, push notifications, and triple-rendering all update within seconds of the materialization completing.

### The 10x cut

The category-defining version is not "we have a fast admin." It is that _the admin renders Linear-fast because every read hits a materialized projection maintained incrementally by the runtime_. The conceptual model — projections as functions over schema and events — is preserved. The runtime model — incremental materialization via iii Function workers — is committed. The founder writes one projection definition; the system spawns a worker that maintains the read state continuously; reads hit memory at memory speed. Retool can't do this because their projections aren't materialized. Sanity can't do this because their content layer doesn't have an event substrate. The materialization commitment is what makes the architecture operationally fast.

### Why this position

First, because the technical 10x establishes the projection-and-materialization thesis on a high-visibility surface. The admin is what humans see; the MCP descriptors are what agents and other instances see; the pricing descriptors are what the meter sees; the materialization workers are what makes all three render at memory speed. They are the same projection. If this wave is right, every later wave's projections come for free with the same performance characteristics.

### Added folder structure

```
santiago/
└── packages/
    └── projections/                # runtime views from schema/events (triple-rendered)
        ├── crud/                   # schema → admin pages + MCP capabilities + pricing
        │   └── materialize.ts      # event-to-state mutation handler (per projection)
        ├── forms/                  # schema → typed forms + MCP write capabilities + pricing
        │   └── materialize.ts
        ├── client/                 # schema → typed Eden Treaty client
        ├── audit/                  # event log → audit views + MCP queries + pricing
        │   └── materialize.ts
        └── (each projection includes its materialization handler)
```

The minimal addition reflects how much Wave 0 already shipped. The admin app exists. The MCP server with push exists. The streaming conversation package exists. The metering package exists. The materialization runtime exists in `packages/materialization/`. This wave adds projections that _populate_ those surfaces, with each projection declaring its own materialization handler.

`packages/projections/crud/` produces admin pages, MCP entity capabilities, and pricing descriptors. The `materialize.ts` handler consumes events relevant to the projection and updates the read tables. When a `user.created` event arrives, the user list projection's read table gains a row. When a `user.deleted` event arrives, the row is removed. Idempotent, ordered, fast.

`packages/projections/forms/` produces typed forms, MCP write capability descriptors, and pricing for write operations. Materialization handler maintains form state caches and validation rules from current schema.

`packages/projections/client/` produces Eden Treaty client surfaces. No materialization needed — client code is consumed by code, generated at build time per current schema.

`packages/projections/audit/` produces audit views. Materialization handler maintains audit state with the event filtering and indexing that audit queries need.

The runtime model is consistent across every projection: a developer writes the conceptual function, the materialization handler defines how events update read state, the iii Function infrastructure in `packages/materialization/workers/` runs the handler against the event stream. The admin renders at memory speed because the read state is always current.

No new app — the admin app from Wave 0 hosts these projections. No new skill — the harness skills from Wave 0 already drive the conversation package that operates the command palette.

---

## Wave 2 — Network-Extended Contract Surface, with hybrid retrieval

### Thesis

The contract surface — schema, types, tests, decisions — is queryable through one typed interface. In v5, the query layer uses hybrid retrieval (BM25 for lexical match, embeddings for semantic match, weighted ensemble) with results cached by schema hash. The cross-instance discovery layer queries a _local materialized index_ of the shared registry, refreshed periodically and on push notification, never blocking on synchronous network calls.

### What ships

The contracts package as a typed view over local schema and a materialized replica of the shared registry. The docs app rendering executable examples grounded in the user's actual schema. Inline contextual help in admin. Streaming conversational doc queries. Decision authoring via dialog. MCP descriptors for the contract surface. Hybrid retrieval algorithm: BM25 + embeddings + cache. Cross-instance discovery via local materialized index, refreshed periodically (default once per hour) and via push when subscribed.

### The 10x cut

The category-defining version is not "we have docs." It is that _documentation and discovery are the same surface and both render at memory speed_. When the founder asks "how does support routing work" in chat, the streaming response begins in under 200 milliseconds because the contract query hits a local cache keyed on schema hash. When they ask "what are the most-used support-routing patterns in B2B SaaS Gaia instances," the response begins immediately because the cross-instance discovery hits a local materialized index, not a synchronous network call. Local docs and network discovery flow through one mechanism, both fast.

### Why this position

Second, because every later wave needs a typed contract surface to ground in, and the network thesis needs a discovery surface that humans, agents, and other instances all read from at memory speed. Composition (Wave 4's cross-instance capability sourcing), syndication (Wave 3's content network), and operational subscription (Wave 5's cross-instance subscribers) all depend on this surface existing as a fast, replicated, materialized layer.

### Added folder structure

```
santiago/
├── apps/
│   └── docs/                       # docs site — executable examples, triple-rendered
│
├── packages/
│   ├── contracts/                  # typed view over local schema + network discovery
│   │   ├── query/                  # hybrid retrieval (BM25 + embeddings + cache)
│   │   ├── network/                # cross-instance discovery via local materialized index
│   │   │   └── (depends on packages/replicas/)
│   │   └── embeddings/             # semantic vectors for similarity search
│   │
│   ├── projections/
│   │   ├── docs/                   # contracts → docs pages + MCP discovery + pricing
│   │   │   └── materialize.ts
│   │   └── changelog/              # PR diff + contract delta → changelog (triple)
│   │       └── materialize.ts
│   │
│   └── adapters/
│       └── search/                 # Postgres FTS wrapper (used by BM25 layer)
│
├── content/
│   ├── docs/                       # hand-authored docs supplements (overrides)
│   ├── changelog/                  # projected changelog entries
│   └── decisions-public/           # public decision records, indexed by contracts
│
└── .claude/skills/
    └── d-contracts/                # validates contract consistency, surfaces drift
```

`apps/docs/` ships as the publicly browseable docs surface, triple-rendered, rendered against materialized projections.

`packages/contracts/query/` implements the hybrid retrieval algorithm. BM25 over the lexical surface (entities, types, test descriptions, decision titles). Embeddings over the semantic surface. Weighted ensemble combines results. Schema-hash-keyed cache invalidates per-entity when the schema changes.

`packages/contracts/network/` is the network discovery layer, depending on `packages/replicas/`. It maintains a local materialized index of the shared registry — the relevant slice for the founder's vertical, capabilities they've subscribed to, instances they're tracking. Refreshes via push notification when subscribed entities change; periodic refresh (hourly default) for casual discovery.

`packages/contracts/embeddings/` adds semantic similarity. Used by the hybrid retrieval, not directly accessed elsewhere.

`packages/projections/docs/` and `packages/projections/changelog/` are the second and third projections, both with their materialization handlers. Docs render at memory speed; changelog updates within seconds of a PR merge.

`packages/adapters/search/` enters here for the FTS layer that BM25 uses.

`content/docs/`, `content/changelog/`, `content/decisions-public/` carry from v4.

`.claude/skills/d-contracts/` validates contract surface consistency.

---

## Wave 3 — Distribution Composer, streaming and async

### Thesis

Distribution is one composer surface. The founder describes what they want to publish; the system handles channel selection, formatting, scheduling, tracking — all through explicit iii Functions with backpressure. Cross-instance content arrives into a local materialized inbox; the composer reads from the inbox at memory speed.

### What ships

The composer surface as a specialized lens on the streaming chat. Channels — newsletter, social, broadcast — each ship as iii Functions with backpressure (one social post per second across the network regardless of how many items the founder publishes). Mechanics — referral, capture, gating — as audience-graph operations. Content projections that draft channel content from feature shipments. The marketing app, triple-rendered. Network syndication via local materialized inbox.

### The 10x cut

The category-defining version is not "we bundled newsletter and social." It is that _publishing is conversation, posting is async by default, and cross-instance content arrives at memory speed_. The founder describes what to publish; the request returns immediately; an iii Function handles posting with explicit backpressure; the timeline shows progress. Cross-instance content streams arrive into a local inbox; the composer reads from materialized state instantly. The founder never waits for a publish or a syndication query.

### Why this position

Third, because the previous two produced a discoverable product nobody knows about, and v5's distribution requires the contract surface for vertical feed routing, the runtime infrastructure for explicit async iii Functions, and the replicas mechanism for cross-instance content streams.

### Added folder structure

```
santiago/
├── apps/
│   ├── marketing/                  # marketing site — triple-rendered
│   └── composer/                   # specialized lens on chat for content authoring
│
├── packages/
│   ├── channels/                   # outputs that subscribe to events
│   │   ├── newsletter/             # iii Function for email broadcast with backpressure
│   │   ├── social/                 # iii Function for social posting with backpressure
│   │   ├── broadcast/              # iii Function for transactional + marketing
│   │   └── network/                # syndication via local materialized inbox
│   │       └── (depends on packages/replicas/)
│   │
│   ├── mechanics/                  # primitives that mutate the audience graph
│   │   ├── referral/
│   │   ├── capture/
│   │   └── gating/
│   │
│   ├── projections/
│   │   └── content/                # contracts + events → channel content drafts
│   │       └── materialize.ts
│   │
│   └── adapters/
│       ├── social/                 # X, LinkedIn, Bluesky, Threads
│       └── broadcast/              # Resend Audiences, Mailchimp, ConvertKit
│
├── content/
│   ├── social/                     # scheduled and published social posts
│   ├── newsletters/                # newsletter issues and templates
│   └── magnets/                    # lead magnet content
│
└── .claude/skills/
    └── d-distribute/               # composer flow, scheduling, tracking, syndication
```

`apps/composer/` is a specialized lens on the streaming chat from Wave 0.

`apps/marketing/` is triple-rendered.

`packages/channels/{newsletter,social,broadcast}/` each ship as iii Functions with explicit backpressure and retry semantics. Posting to the network is bounded; rate limits are respected; failures retry with exponential backoff. The founder publishes; the publishing happens asynchronously; the timeline shows progress.

`packages/channels/network/` is the syndication layer, depending on `packages/replicas/`. Outbound syndication is an iii Function emitting to the shared registry. Inbound syndication is a replica subscription — local materialized inbox of vertical-feed content, refreshed via push when subscribed.

`packages/mechanics/` carries from v4 unchanged.

`packages/projections/content/` is the fourth projection family with materialization handler. Drafts render at memory speed; new drafts appear in the composer within seconds of feature shipments.

`packages/adapters/social/` and `adapters/broadcast/` follow the established pattern. Channels never import vendor SDKs directly.

`content/social/`, `content/newsletters/`, `content/magnets/` carry from v4.

`.claude/skills/d-distribute/` orchestrates composer flows, scheduling, tracking, syndication.

---

## Wave 4 — Capabilities Runtime (with replicas, the economic engine)

### Thesis

We sell capabilities, hireable as employees through conversation. Capability bundles are simultaneously the architectural primitive, the conversational unit, and the SKU. In v5, cross-instance capability invocation resolves against local materialized replicas of remote behavior, not synchronous network calls. Capability execution is an iii Function family with explicit resource limits. Metering computation is a windowed iii Function over the event stream.

### What ships

The capability framework — primitives, bundles, scoping, composition. The runtime sandbox executing capability bundles in isolation per principal as iii Functions with budgets. Persona configuration. The hosted platform — `gaia-cloud/` as a separate codebase. Bundled invoicing. Graceful exit. The labor app — a real-time presence surface with live cost per employee. Operational packages (billing, support). Cross-instance capability composition via local replicas: bundles published by other instances are discoverable through the contract surface (Wave 2's network materialized index), invocable via MCP, metered through the local meter, with revenue share flowing to publishers automatically. Hiring, firing, tuning, budgeting all happen in streaming chat.

### The 10x cut

The category-defining version is not "we sell hosted Gaia." It is that _capability invocation is fast even across the network_. When an AI employee invokes a tax-compliance capability sourced from another instance, the invocation resolves against a local replica of the remote behavior in tens of milliseconds. The remote instance is consulted only when behavior drifts. Customer interactions complete at memory speed. The labor app shows live cost per employee, computed via the windowed metering Function. The founder sees economic, performance, and behavioral data in one timeline at memory speed.

### Why this position

Fourth, because the previous three produced everything the capabilities need to operate effectively — and all of them at memory speed. Projections give them surfaces to act on, materialized. Contracts give them grounded knowledge and network discovery, materialized. Channels give them outputs, async with backpressure. The streaming conversation primitive makes hiring feel like hiring. The metering primitive makes pricing inseparable from architecture. The replicas primitive makes cross-instance invocation fast.

### Added folder structure

```
santiago/
├── packages/
│   ├── capabilities/               # capability primitives + bundles + composition
│   │   ├── primitives/             # individual typed capabilities
│   │   ├── bundles/                # predefined compositions
│   │   ├── scoping/                # per-principal scope resolution + agent credentials
│   │   └── composition/            # cross-instance bundle sourcing via replicas
│   │       └── (depends on packages/replicas/)
│   │
│   ├── personas/                   # voice and style configuration
│   │
│   ├── runtime/                    # extends Wave 0's runtime with sandbox
│   │   └── sandbox/                # iii Function isolation, resource limits, timeout
│   │
│   ├── billing/                    # subscription state + payment flows (UI presentation)
│   ├── support/                    # help desk, ticket lifecycle, inbox
│   │
│   ├── projections/
│   │   └── metrics/                # event log → MRR, churn, LTV (triple-rendered)
│   │       └── materialize.ts
│   │
│   └── adapters/
│       ├── payments/               # Polar wrapper (with Stripe/Lemon swap path)
│       └── email/                  # Resend wrapper for transactional mail
│
├── apps/
│   └── labor/                      # real-time labor app — presence, queue, escalations, cost
│
└── .claude/skills/
    └── d-capability/               # provisions capability bundles, hires/fires conversationally

gaia-cloud/                         # NEW SEPARATE REPO — the managed platform
├── apps/
│   ├── control-api/                # tenant control plane
│   ├── dashboard/                  # gaia.cloud customer dashboard
│   ├── billing/                    # bundled bill aggregation
│   ├── orchestrator/               # provisioning + deploy automation
│   └── eject/                      # graceful-exit tooling backend
│
└── packages/
    ├── tenancy/                    # cross-tenant orchestration
    ├── provisioning/               # resource provisioning across providers
    ├── routing/                    # tenant request routing at edge
    ├── migration/                  # ejection logic — produces standalone codebases
    └── revenue-share/              # cross-instance bundle revenue distribution
```

`packages/capabilities/composition/` is the network thesis surface and depends on `packages/replicas/`. Cross-instance bundles maintain local replicas of remote behavior surfaces. Most invocations resolve locally; cross-instance writes are explicit, async, visibly so. Drift detection via the replica reconciliation primitive.

`packages/runtime/sandbox/` extends Wave 0's runtime with per-principal iii Function isolation. Each capability invocation runs as a Function with its own CPU budget, memory limit, timeout, observability trace. Bundles can't accidentally consume the whole runtime.

`packages/billing/` is intentionally smaller in v5. The actual billing computation lives in `packages/metering/` from Wave 0 (windowed iii Function over events). This package handles subscription state transitions, payment flows through the payments adapter, user-facing billing UI surfaces. Billing-as-architecture lives in metering; billing-as-product-feature lives here.

`packages/projections/metrics/` is the fifth projection, triple-rendered, with materialization handler. MRR, churn, LTV all materialize from the event stream; reading them in admin or chat hits memory.

`apps/labor/` shows live cost per employee, computed from the windowed metering Function. Filtered view of the timeline plus a presence feed plus economic data.

`gaia-cloud/` is the platform repo. `gaia-cloud/packages/revenue-share/` handles cross-instance bundle revenue distribution at the platform level.

`.claude/skills/d-capability/` handles the conversational hiring/firing flow.

---

## Wave 5 — Subscribers, with cross-instance streaming

### Thesis

Autonomous operations is event subscribers invoking capability bundles. The founder describes outcomes; subscribers exist. In v5, cross-instance subscribers consume from local materialized event streams (replicas of remote event slices), not synchronous polls. Subscribers run as iii Functions with budgets.

### What ships

The subscribers framework as iii Functions consuming the event stream. Time-based subscribers firing on iii.dev's cron triggers. Domain-event subscribers. Cross-instance subscribers consuming from local replicas of remote event streams. Escalation conventions. Playbooks as content, versioned and per-tenant overridable. All authored conversationally through streaming chat.

### The 10x cut

The category-defining version is not "we automate audits." It is that the founder describes outcomes and the system creates autonomous machinery — including cross-instance subscriptions that connect the founder's operations to the network's operational rhythms, all running at memory speed because cross-instance state is replicated locally. They never see "subscriber" or "trigger" or "playbook" or "replica." They say "every Monday morning, send me churn risk users from the last week" and a subscriber exists. They say "every Tuesday, show me how dental-practice instances are handling new patient onboarding" and a cross-instance subscriber exists, billed per event consumed, executing against the local replica in milliseconds.

### Why this position

Fifth, because subscribers without capabilities (Wave 4) are decorative, conversational authorship requires Wave 0's primitives, cross-instance subscription requires the replicas mechanism (Wave 0) and the contract surface (Wave 2) for discovery. The architectural payoff of the seven Wave 0 invariants is loudest here — subscribers are tiny because everything they need already exists, materialized and replicated.

### Added folder structure

```
santiago/
├── packages/
│   ├── subscribers/                # event subscribers — autonomous operations
│   │   ├── time/                   # subscribers to time-based events (rhythms)
│   │   ├── domain/                 # subscribers to domain events (triggers)
│   │   ├── cross-instance/         # subscribers consuming from local replicas
│   │   │   └── (depends on packages/replicas/)
│   │   └── escalations/            # convention for human-handoff emission
│   │
│   └── adapters/
│       ├── analytics/              # PostHog (signal source beyond iii's observability)
│       ├── logging/                # external logging not covered by iii
│       └── tracing/                # external tracing not covered by iii
│
├── content/
│   └── playbooks/                  # action sequences, versioned, per-tenant overridable
│       ├── sales/
│       ├── support/
│       ├── growth/
│       └── product/
│
└── .claude/skills/
    └── d-autonomous/               # authors subscribers conversationally
        ├── lifecycle-triggers/
        ├── content-freshness/
        ├── deps-update/
        ├── perf-audit/
        └── security-audit/
```

`packages/subscribers/cross-instance/` depends on `packages/replicas/` for remote event stream replication. Subscribers consume from local replicas at memory speed. Metering applies per event consumed.

`packages/adapters/analytics/`, `logging/`, `tracing/` enter as in v4. Smaller than they would have been because iii.dev's observability handles much of what they previously covered.

`content/playbooks/` is where operational knowledge lives. Successful playbooks contribute back through telemetry; other instances discover them through the contract surface.

`.claude/skills/d-autonomous/` authors subscribers conversationally.

---

## What dissolves and what calcifies

The four foundational moves committed in Wave 0 are what calcifies. Every other wave's value depends on these being decided once, in Wave 0, before paying customers exist.

**Event log structure calcifies first.** Once there are millions of events under a wrong partition strategy, repartitioning under load is a months-long migration. The append-only stream with logical replication, partitioned by tenant and time, with strict event-type discipline, is the v5 commitment. This decision is permanent.

**Materialization runtime calcifies second.** Once projections are read-on-demand and the admin renders against live queries, retrofitting incremental materialization means rewriting every projection. The dedicated iii Function workers consuming the event stream and maintaining read tables is the v5 commitment. Every projection from Wave 1+ ships with its materialization handler.

**Cross-instance replicas calcify third.** Once cross-instance composition is synchronous, the network-effect thesis depends on luck. The replicas package and its consumers (capabilities composition, contracts network, channels network, subscribers cross-instance) is the v5 commitment. Most cross-instance state resolves against local materialized replicas; remote calls are explicit, async, visible.

**iii Function discipline calcifies fourth.** Once async work is scattered across packages without explicit Functions, observability is broken, backpressure is broken, retries are broken. The runtime/budgets/ subdirectory and the explicit Function declaration for every async concern is the v5 commitment. The architecture and the runtime are the same shape.

What dissolved in v4 stays dissolved. Wave 6 (Vertical Configurations) and Wave 7 (Agent Principals) remain absorbed into earlier waves. The wave count stays at six. The package count grew by two (`packages/materialization/` and `packages/replicas/`) but each makes multiple later wave concerns dramatically simpler and faster.

---

## The compounding architecture, experience, network, and runtime

Read across the six waves and a pattern emerges. The architecture is organized around four primitives:

**Schema** is the source of truth for state. Lives in `packages/db/`, shaped by `packages/domain/`, scoped by `packages/tenancy/`.

**Events** are the source of truth for what happened. Live in `packages/events/` as an append-only stream on top of `packages/runtime/` (iii.dev), with logical replication consumed by `packages/materialization/` workers maintaining projection read tables.

**Capabilities** are the source of truth for what can be done by which principal. Live in `packages/capabilities/`, executed by `packages/runtime/sandbox/` as iii Functions with budgets, audited via events, priced via metering, composable across instances via `packages/replicas/`.

**Projections** are derived views over the other three. Live in `packages/projections/` and produce admin (Wave 1), docs (Wave 2), content drafts (Wave 3), metrics (Wave 4), agent formats (every wave), and bills (Wave 0's metering) — all rendered at memory speed via materialized state.

Above these four primitives, four user-facing surfaces with explicit performance characterization:

**Chat** — streaming-first conversational interface, first token under 200ms.
**Timeline** — unified observability with latency budget violations, rendered from materialized state.
**Admin** — visual operating surface, every read at memory speed via materialized projections.
**MCP** — agent and network interface with push notifications, no polling.

Across the architecture, seven Wave 0 invariants compound:

**Events as substrate.** One append-only stream, materialized into many projections.
**Hexagonal layering.** Domain pure, adapters at the edge.
**Tenancy from day one.** Multi-tenant by default, single-tenant by config.
**Agent-native runtime.** iii.dev plus MCP plus streaming conversation, from line one.
**Metering as a projection.** Capabilities are SKUs; bills are windowed aggregations.
**Telemetry contribution.** Network effects mechanical, with backpressure.
**Runtime discipline.** Every async concern is an explicit iii Function with budgets, materialization, streaming, and replicas.

The packages that exist at end-state in v5:

```
packages/
├── core/  config/  errors/  ui/         # foundational utilities (Wave 0)
├── db/                                  # schema + migrations (Wave 0)
├── domain/                              # pure domain logic, no IO (Wave 0)
├── runtime/                             # iii.dev + sandbox + budgets (Wave 0+4)
├── events/                              # append-only stream + replication (Wave 0)
├── tenancy/                             # tenant-scoping invariants (Wave 0)
├── materialization/                     # projection state maintenance (Wave 0)  — NEW IN v5
├── replicas/                            # cross-instance state replication (Wave 0) — NEW IN v5
├── mcp/                                 # agent + network surface + push (Wave 0)
├── conversation/                        # streaming-first natural language (Wave 0)
├── metering/                            # windowed iii Function over events (Wave 0)
├── telemetry/                           # backpressured network contribution (Wave 0)
├── adapters/                            # external service wrappers (Wave 0+)
├── projections/                         # triple-rendered + materialized (Wave 1+)
├── contracts/                           # discovery substrate, local + replicated (Wave 2)
├── channels/                            # async outputs subscribing to events (Wave 3)
├── mechanics/                           # primitives that mutate audience graph (Wave 3)
├── capabilities/                        # primitives + bundles + replicated composition (Wave 4)
├── personas/                            # voice/style configs (Wave 4)
├── billing/                             # subscription state + payment UI (Wave 4)
├── support/                             # help desk (Wave 4)
└── subscribers/                         # event subscribers + replicated cross-instance (Wave 5)
```

Twenty-two packages. Two new in v5 (`materialization/`, `replicas/`), each enabling memory-speed reads and bounded-latency cross-instance composition across multiple downstream packages. The compression from v4 to v5 is structural: same six waves, same conceptual model, runtime characterization committed throughout. The architecture and the runtime are the same shape; the system is now ready for the first paying customer without architectural debt around the corners that calcify hardest.

## The 10x runtime experience

The founder of a dental-practice SaaS opens chat. They type "show me users who churned last week." The first token streams back in under 200 milliseconds. The result renders progressively from a materialized projection at memory speed. The query never hit the events table directly; it hit a continuously-maintained read table.

They ask "find me Gaia instances exposing tax-compliance capabilities for European VAT." The first result streams in immediately from a local materialized index of the shared registry. More results stream in as they arrive. The query never blocked on a network call; the index is current within hours and updates via push when subscribed.

They hire a support employee whose bundle uses a tax-compliance capability from another instance. The hiring conversation explains: "this capability runs against a local replica of the remote behavior, refreshed every six hours; cost per invocation $0.003; current p99 latency 12 milliseconds." The employee starts working. Customer interactions complete in tens of milliseconds because the local replica handles them; the remote instance is consulted only when the replica reconciler detects drift.

They ship a feature. The schema changes. The new projection version registers. A materialization worker spawns and replays history; the founder watches the streaming progress indicator: "processed 247,000 of 312,000 events." Within seconds, the new admin page renders at memory speed, the MCP descriptor is advertised with push notifications to subscribers, the pricing surface is live, agents and other instances see the new capability immediately.

They subscribe to a cross-instance event stream — "every Tuesday, fetch new patient acquisition patterns from the dental-practice network." The subscription begins. A replica of the relevant slice of the shared registry maintains current state locally via the replicas package. Every Tuesday, the subscriber executes against the local replica in milliseconds; no network calls block the founder's operations. Metering applies per event consumed; the windowed metering Function aggregates costs into the bill in real time.

They notice a latency budget violation in the timeline: "your projection materialization for users.audit is running 3x slower than budget." The chat suggests a remediation: "the audit projection is processing 50,000 events per second; the budget is 150,000 per second; consider partitioning by user segment." The founder doesn't know what materialization is. The system tells them the problem and the fix.

The founder never sees the words "materialization," "replica," "iii Function," "streaming," "logical replication," "windowed aggregation." They see a system that responds before they finish thinking, scales with their network without warning, and tells them when something is slow. The architecture is the strategy; the network is the substrate; the runtime is the experience.

Every wave is shippable on its own. Every wave makes the next one cheaper to build. Every wave runs at memory speed because the runtime calcified in Wave 0 — once, deliberately, before paying customers arrived. The architecture, the experience, the network, and the runtime are the same structure. That is the strategy. That is the runtime. That is v5.
