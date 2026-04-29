---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Collapsing distribution into one composer surface — backed by per-channel iii Functions with explicit backpressure, and inbound cross-instance content arriving into a local materialized inbox via replicas — turns publishing into conversation, posting into async-by-default, and syndication into a memory-speed read. The founder describes what to publish; the system handles channel selection, formatting, scheduling, tracking, and cross-instance routing without blocking.
falsifier: After Wave 3 ships, ≥1 publish operation blocks the founder's chat session waiting on a vendor SDK call, OR ≥1 cross-instance content stream is consumed via synchronous poll rather than local materialized inbox, OR rate-limit violations across vendors exceed 1% of attempts. Window: through Wave 4 ship-date.
measurement:
  {
    metric: 'p99 publish-request latency + count of synchronous cross-instance polls + vendor rate-limit violation rate',
    source: 'channel iii Function trace logs + adapter telemetry',
    baseline: 'N/A (pre-Wave-3)',
    threshold: 'p99 publish-request <500ms (request returns; posting is async) + 0 synchronous polls + <1% rate-limit violations',
    window_days: 60,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-29-vision-v5-source.md
wave: 3
status: not-started
---

# Initiative 0008 — Wave 3: Distribution Composer, Streaming and Async

Distribution as one composer surface. The founder describes what they want to publish; the system handles channel selection, formatting, scheduling, tracking — all through explicit iii Functions with backpressure. Cross-instance content arrives into a local materialized inbox; the composer reads from the inbox at memory speed.

## 1. Context / Research

The previous two waves produced a discoverable product (Wave 1: admin) and a typed contract surface for grounding (Wave 2: contracts + docs). v5's distribution requires the contract surface for vertical feed routing, the runtime infrastructure for explicit async iii Functions (0005), and the replicas mechanism for cross-instance content streams (0005).

Today's state (post-0007): admin renders Linear-fast, docs are queryable via hybrid retrieval, contracts span local + network. But the founder cannot publish — there's no newsletter pipeline, no social, no broadcast, no syndication into the network. Wave 3 is the wave that gets the product out.

The category-defining version: publishing is conversation, posting is async by default, and cross-instance content arrives at memory speed. The founder describes what to publish; the request returns immediately; an iii Function handles posting with explicit backpressure; the timeline shows progress. Cross-instance content streams arrive into a local inbox; the composer reads from materialized state instantly. The founder never waits for a publish or a syndication query.

## 2. Strategy

**Problem**: Without backpressure, a founder's "publish to all channels" request bursts past vendor rate limits and gets throttled. Without async, the founder's chat session blocks on Twitter, LinkedIn, Resend, etc. Without local inboxes, cross-instance content discovery is a poll loop. Without one composer, "newsletter" and "social" and "broadcast" become three separate UIs.

**Approach** (chosen): one composer surface (specialized lens on chat); three channels (newsletter, social, broadcast) each as iii Functions with explicit backpressure (one social post per second across the network regardless of how many items the founder publishes); a fourth `network/` channel for inbound/outbound syndication via replicas; mechanics (referral, capture, gating) as audience-graph operations; content projections that draft channel content from feature shipments.

**Cap table** (what 0008 ships v1.0):

| Surface                         | Ships v1.0                                                                                                                            | Capped                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/composer/`                | Specialized lens on streaming chat for content authoring                                                                              | Calendar/timeline UI for scheduled posts (defer) |
| `apps/marketing/`               | Marketing site, triple-rendered                                                                                                       | Multi-language (defer)                           |
| `packages/channels/newsletter/` | iii Function for email broadcast with backpressure + retry                                                                            | A/B subject-line testing (defer)                 |
| `packages/channels/social/`     | iii Function for social posting with backpressure (1 post/sec network-wide)                                                           | Auto-generated thread variants beyond LLM output |
| `packages/channels/broadcast/`  | iii Function for transactional + marketing email                                                                                      | Multivariate transactional templates (defer)     |
| `packages/channels/network/`    | Syndication via local materialized inbox; outbound to shared registry; depends on `packages/replicas/`                                | Per-instance trust scoring (defer)               |
| Mechanics                       | `packages/mechanics/{referral,capture,gating}/` — audience graph operations                                                           | Multi-stage funnels (defer)                      |
| Content projection              | `packages/projections/content/` + materialize.ts — drafts channel content from feature shipments                                      | —                                                |
| Adapters                        | `packages/adapters/social/` (X, LinkedIn, Bluesky, Threads), `packages/adapters/broadcast/` (Resend Audiences, Mailchimp, ConvertKit) | TikTok, YouTube (defer)                          |
| `d-distribute` skill            | Composer flow, scheduling, tracking, syndication orchestration                                                                        | —                                                |

**Preserved**: mechanics package carries from v4 unchanged in shape. Channels never import vendor SDKs directly — adapters mediate every external call.

## 3. Folder Structure

```
santiago/
├── apps/
│   ├── marketing/                    # NEW — marketing site, triple-rendered
│   └── composer/                     # NEW — specialized lens on chat for content authoring
│
├── packages/
│   ├── channels/                     # NEW — outputs that subscribe to events
│   │   ├── newsletter/               # iii Function for email broadcast with backpressure
│   │   ├── social/                   # iii Function for social posting with backpressure
│   │   ├── broadcast/                # iii Function for transactional + marketing
│   │   └── network/                  # syndication via local materialized inbox
│   │       └── (depends on packages/replicas/ from 0005)
│   │
│   ├── mechanics/                    # NEW — primitives that mutate the audience graph
│   │   ├── referral/
│   │   ├── capture/
│   │   └── gating/
│   │
│   ├── projections/
│   │   └── content/                  # NEW — contracts + events → channel content drafts
│   │       └── materialize.ts
│   │
│   └── adapters/
│       ├── social/                   # NEW — X, LinkedIn, Bluesky, Threads
│       └── broadcast/                # NEW — Resend Audiences, Mailchimp, ConvertKit
│
├── content/
│   ├── social/                       # NEW — scheduled and published social posts
│   ├── newsletters/                  # NEW — newsletter issues and templates
│   └── magnets/                      # NEW — lead magnet content
│
└── .claude/skills/
    └── d-distribute/                 # NEW — composer flow, scheduling, tracking, syndication
```

## 4. Implementation

**Order of operations**:

1. `packages/adapters/{social,broadcast}/` — vendor wrappers. Adapters first because channels never import SDKs directly.
2. `packages/channels/newsletter/` — first iii Function with backpressure + retry. Establishes the channel-Function pattern.
3. `packages/channels/social/` — second channel. Network-wide rate limit (1 post/sec).
4. `packages/channels/broadcast/` — third channel. Transactional + marketing share the Function shape.
5. `packages/channels/network/` — depends on `packages/replicas/` from 0005. Outbound syndication is an iii Function emitting to the shared registry; inbound is a replica subscription with a local materialized inbox.
6. `packages/mechanics/{referral,capture,gating}/` — audience graph operations. Carry from v4 in shape.
7. `packages/projections/content/` + materialize.ts — fourth projection family. Drafts render at memory speed; new drafts appear in the composer within seconds of feature shipments.
8. `apps/composer/` — specialized lens on `packages/conversation/stream/`. Streaming progress visible as posts go out.
9. `apps/marketing/` — triple-rendered marketing site. Renders against materialized projections.
10. `content/{social,newsletters,magnets}/` — content surfaces.
11. `.claude/skills/d-distribute/` — composer orchestration skill.
12. End-of-wave audit: p99 publish-request latency <500ms; 0 synchronous cross-instance polls; <1% vendor rate-limit violations under load.

**Risks**:

1. **Vendor rate-limit windows differ across providers.** Mitigation: per-adapter rate-limit config; backpressure happens at the adapter layer, not the channel.
2. **Inbound network/ inbox grows unboundedly for popular verticals.** Mitigation: time-windowed retention (90 days default); explicit subscription scoping; founder can mute streams from chat.
3. **Composer feels separate from chat.** Mitigation: literally a specialized lens on the chat surface — same streaming primitives, same conversation package. Just a different filter and palette.
4. **Content projection drafts feel generic.** Mitigation: drafts are starting points; founder edits in the streaming chat; persona configuration (Wave 4) shapes voice.

**Out of scope**:

- Calendar/timeline UI for scheduled posts (v1.1).
- A/B testing infrastructure (v1.1).
- TikTok, YouTube adapters (defer to demand).
- Multi-language marketing site (v1.1).
- Per-instance trust scoring on inbound network content (defer).
- Multi-stage funnels in mechanics (v1.1).

## 5. PR Breakdown

| PR  | Title                                                          | Files (high-level)                                                | Status  |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| 1   | `packages/adapters/social/` (X, LinkedIn, Bluesky, Threads)    | adapter wrappers, per-vendor rate-limit config                    | pending |
| 2   | `packages/adapters/broadcast/` (Resend, Mailchimp, ConvertKit) | adapter wrappers                                                  | pending |
| 3   | `packages/channels/newsletter/`                                | iii Function, backpressure, retry, hooks to broadcast adapter     | pending |
| 4   | `packages/channels/social/`                                    | iii Function, network-wide 1 post/sec rate limit                  | pending |
| 5   | `packages/channels/broadcast/`                                 | iii Function for transactional + marketing                        | pending |
| 6   | `packages/channels/network/` — syndication                     | outbound emit + inbound replica subscription                      | pending |
| 7   | `packages/mechanics/{referral,capture,gating}/`                | audience graph operations                                         | pending |
| 8   | `packages/projections/content/` + materialize.ts               | content drafts from feature shipments                             | pending |
| 9   | `apps/composer/` — specialized lens on chat                    | composer UI, scheduling controls, status panel                    | pending |
| 10  | `apps/marketing/` — triple-rendered                            | marketing site, MCP descriptors, pricing                          | pending |
| 11  | `content/{social,newsletters,magnets}/`                        | content surfaces                                                  | pending |
| 12  | `.claude/skills/d-distribute/`                                 | composer skill                                                    | pending |
| 13  | Wave 3 audit                                                   | publish p99 + 0 sync polls + <1% rate-limit violations under load | pending |

## 6. Decision Audit Trail

| ID  | Decision                                                                                                          | Source                                 |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1 | Wave 3 = Initiative 0008. Depends on `packages/replicas/` (0005) and `packages/contracts/network/` (0007).        | Founder 2026-04-29                     |
| F-2 | Channels are iii Functions with explicit backpressure. Vendor rate limits respected; failures retry with backoff. | Founder 2026-04-29 (v5 vision §Wave 3) |
| F-3 | Network-wide social rate limit: 1 post/sec across the founder's social channels combined.                         | Founder 2026-04-29 (v5 vision §Wave 3) |
| F-4 | Inbound network content arrives into a local materialized inbox via replicas. Never synchronously polled.         | Founder 2026-04-29 (v5 vision §Wave 3) |
| F-5 | Composer is a specialized lens on `packages/conversation/stream/`, not a separate UI.                             | Founder 2026-04-29 (v5 vision §Wave 3) |
| F-6 | Channels never import vendor SDKs directly. Adapters mediate every external call.                                 | Founder 2026-04-29 (v5 vision §Wave 3) |
| F-7 | Inbound network/ inbox retention: 90 days default, founder-mutable per-subscription from chat.                    | Founder 2026-04-29                     |
