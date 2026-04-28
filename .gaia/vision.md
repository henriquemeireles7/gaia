# Gaia

An opinionated, open-source template for building production SaaS in the agent-native era.

The Rails of TypeScript, redesigned for a world where agents write most of the code.

**Status:** Vision v6 — pre-MVP
**Codename:** Gaia
**Last updated:** April 2026 (v6 — Workflow added; Harness sharpened; self-evolving deferred to v2)

⸻

## What Gaia is

Gaia is an open-source, MIT-licensed template for shipping production-grade SaaS as a solo operator in the agent-native era. Clone it, `bun install`, deploy. Everything needed to go from zero to paying customer is wired, tested, documented, and enforceable by agents.

**The promise: idea to deployment in minutes instead of weeks.**

The template is the product. The course, orchestrator (conductor.build), and deployment platform are future extensions that layer on top; they are explicitly out of scope for v1.

## Who Gaia is for

The one-person unicorn — a solo founder who wants to build and scale a software company without a team, using AI agents as collaborators.

Not indie hackers aiming for $5K/mo side income. The target is operators shipping serious software alone with agent leverage — people who would otherwise need a team of 5–10, and who have both the ambition and the leverage to do it solo.

Secondary audience: small teams (2–5) adopting agent-native workflows who want shared conventions instead of inventing their own.

## Positioning

Rails, redesigned for a world where agents write the code.

Rails's unspoken gift was that generated code showed you the pattern. The codebase itself was the documentation. Rails optimized for human readability. Gaia extends that principle but flips the primary reader: agents first, humans second.

That single inversion drives every other decision.

⸻

## The 15 principles

These are load-bearing. Every decision in Gaia ties back to one of these. If a future tool or pattern contradicts a principle, the principle wins.

### Structure

1. **Decisions are stratified by shelf life and audience.** References are the constitution (long shelf life, agent-facing). Initiatives are the strategic bets (medium shelf life, daily-active). Other categories (memo, runbook, ADR) are deferred — added only if a specific need emerges and justifies the addition with a written reason. Genre proliferation is a smell, not a feature.

2. **One schema format, zero translation.** Types flow through a single schema format (TypeBox via Standard Schema), natively consumed by every layer — DB, validation, RPC, UI. No adapters. No generators. Change the schema once; every consumer updates.

3. **Three-layer dependency graph with concretely-named packages.** `core/` (importable from anywhere) → concretely-named middle packages (`config/`, `errors/`, `db/`, `adapters/`, `auth/`, `api/`, `ui/`, `security/`, `workflows/`) → feature modules (siblings forbidden). No `shared/` grab-bag. The rule is structural, not cultural. Violations are build errors the type system catches, not review comments.

### Enforcement

4. **Deterministic for facts, advisory for judgment — both legible.** Hooks enforce facts (syntax, types, security, format). CLAUDE.mds describe judgment (patterns, intent, architecture). Every hook ships with a clear explanation of what it blocks and the minimum fix. Nothing refuses silently.

5. **Errors tier up.** First occurrence → a test. Second → a lint rule. Third → a hook. Fourth → architectural change. This prevents hook sprawl. A test is cheap; a hook is expensive. You only pay the higher tier when the lower tier demonstrably failed.

6. **Every rule has a document AND an enforcement.** Rule exists in markdown (judgment, intent) AND in a linter/test/hook (mechanism). Double-representation prevents drift. If you can't write the mechanism, the rule is aspirational, not real.

7. **One policy, many enforcement surfaces.** Rules live in one file (`.gaia/rules.ts`). Claude Code hooks, CI, editor integrations, and optional pre-commit hooks all consume from it. Drift is structurally impossible.

### Context

8. **Context is auto-loading AND discoverable.** Folder CLAUDE.mds auto-load by location. The root `CLAUDE.md` is the resolver — it routes the agent to the right reference for the task. Agents can query: "which rules apply here, and why?"

9. **The template is the manual.** The code teaches how to use it. Reading the template IS the documentation. Rails's unspoken gift — generated code shows the pattern — is Gaia's explicit mandate. Every file in the template is readable in isolation AND in sequence.

10. **Legibility outranks cleverness.** Every abstraction earns its place by being more legible than the thing it replaces. Clever code is an agent-misuse site. If the agent has to ask what something does, it's too clever.

### Quality

11. **Test behavior at boundaries; mutation-test the middle.** Public APIs and external integrations get heavy tests. Internal logic gets mutation testing (does the test catch a deliberate bug?). Wiring, getters, generated code — no tests required. Coverage is measured by mutations caught, not lines touched.

12. **Scale triggers are pain-metrics, not growth-metrics.** Split the monolith when CI parallelism is blocked, when two features need radically different scaling profiles, or when you can no longer hold the system in your head. Growth on a clean system isn't pain; complexity is.

### Operations

13. **CLI-first operations with audit trails.** Agents operate via CLIs, not dashboards. Every agent action produces a structured log entry — what was done, by whom, when, what state changed. The audit trail is the product of the action, not something separate.

14. **Brand rules are versioned, not frozen.** Design and voice constraints have their own decision log. Old rules deprecate, not delete. Agents read the current version but can see the evolution.

### Identity

15. **Agents are first-class users.** The codebase is optimized for agents to navigate, reason about, and extend. Humans are second-class — still important, still maintained, but agent-first. This flips the historical priority. It's the thing Rails didn't know to build for, and it's what makes Gaia a framework rather than a stack.

⸻

## The stack

Locked decisions as of v6. Each choice traces back to one or more of the 15 principles.

### Runtime & framework

- **Runtime:** Bun
- **Backend framework:** Elysia
- **Frontend framework:** SolidStart
- **Type bridge:** Eden Treaty (end-to-end types, server → client)
- **Language:** TypeScript 6.x (migrate to TS 7/tsgo when GA stable)
- **Validation:** TypeBox (native to Elysia, via Standard Schema everywhere else)

### Data

- **Database:** Neon (serverless Postgres with branching)
- **ORM:** Drizzle (with TypeBox schema emission, zero translation)
- **Cache / KV:** Dragonfly (Redis-compatible, multi-threaded)
- **Storage:** Railway Buckets (S3-compatible)
- **Search:** Postgres FTS by default; Typesense/Orama when needed

### Application features

- **Auth:** Better Auth
- **Password hashing:** Bun.password (argon2id native)
- **Crypto primitives:** Web Crypto API (native to Bun)
- **Payments:** Polar (merchant-of-record, solo-friendly)
- **Email (transactional):** Resend
- **Background jobs / workflows:** Inngest
- **Rate limiting:** @upstash/ratelimit + Dragonfly
- **Email format / disposable check:** zod.email() + disposable-email-domains

### Observability

- **Product analytics:** PostHog
- **Error tracking:** Sentry
- **Logs / traces / metrics:** Axiom
- **Instrumentation protocol:** OpenTelemetry
- **Uptime:** Better Stack (free tier)

### Documentation

- **API reference:** Scalar (self-hosted, MIT)
- **llms.txt:** auto-generated from OpenAPI + docs
- **Product docs:** custom inside the app (no separate stack)

### DevOps

- **Monorepo orchestration:** Moon
- **Toolchain manager:** proto
- **Version pinning:** .prototools checked into git
- **Package manager:** Bun
- **Monorepo dep sync:** syncpack

### Code quality (runs in CI, every PR)

- **Typecheck:** tsgo --noEmit
- **Linter:** Oxlint + custom Biome GritQL rules for agent anti-patterns
- **Formatter:** oxfmt
- **Dead code:** Knip (CI mode, strict, --production)
- **Tests:** Bun test (unit + integration) + Playwright (e2e) + Stryker (mutation)
- **Coverage strategy:** boundary testing + mutation testing in the middle
- **Bundle size:** size-limit with per-bundle budgets
- **Performance:** unlighthouse (weekly)
- **Accessibility:** pa11y

### Security (runs in CI, every PR, parallel)

- **Secrets in git:** gitleaks
- **Dependency CVEs:** osv-scanner
- **SAST:** semgrep + CodeQL (CodeQL is free because Gaia is OSS)
- **Container scanning:** trivy (release PRs only)
- **Supply chain:** Socket.dev (GitHub App)
- **WAF / DDoS:** Cloudflare free tier, fronting production

### Agent harness

- **Primary IDE:** Claude Code
- **Skill foundation:** gstack (`plan`, `review`, `qa` — vendored under `.claude/skills/gstack/`)
- **Gaia skills:** d-strategy, d-roadmap, d-tdd, d-content, d-review, d-harness, d-health, d-fail
- **Conductor:** thin TypeScript loop in Bun, ~200 LOC (`.gaia/conductor.ts`)
- **Hooks runtime:** TypeScript + Bun, consuming `.gaia/rules.ts`, living in `.claude/hooks/`
- **Memory architecture:** three surfaces — working, episodic, reference
- **Protocols:** typed tool schemas with preconditions, side-effects, approval gates
- **Permissions:** `.gaia/protocols/permissions.md` — always-allowed / requires-approval / never-allowed
- **Review flow:** `/d-review` runs a superset of CI and adds LLM judgment
- **Self-evolving (deferred to v2):** dream cycle, skill self-rewrite, auto-promotion of episodic patterns to reference files
- **Orchestrator (future):** conductor.build (see Orchestration section)

### AI / LLM features (opt-in, not required)

- **SDK:** Claude Agent SDK (simple cases)
- **Framework:** Mastra (complex agent workflows)
- **Observability:** Langfuse (OSS, self-hostable)

### Infrastructure

- **Template deploys to:** Railway (default, best DX for stateful containers)
- **Scale tier documented:** Cloudflare Workers + Neon + R2 (best free-tier economics at scale)
- **Secrets:** Railway env vars default; Infisical as documented upgrade path
- **CI:** GitHub Actions (free tier)
- **Container runtime:** Dockerfile for Railway, wrangler config for Cloudflare

⸻

## Architecture

The 15 principles say what Gaia believes. This section says how those beliefs show up in files, folders, and structural rules. Architectural principles are narrower than general principles — they govern the physical organization of the codebase.

Architecture is inward-facing. It is one of four parallel peers: **Architecture** (inward, how code is organized), **Experience** (outward, how surfaces reach audiences), **Workflow** (operational, how work moves from idea to deploy), **Harness** (substrate, how Workflow + Architecture + Experience are made enforceable). A principle may have an expression in all four; none dominates.

### The 12 architectural principles

**Stores & data**

1. **Data lives where its lifecycle lives.** Five stores, each chosen by the data's lifecycle, not by convenience:

| Store                            | Lifecycle                            | Examples                                       |
| -------------------------------- | ------------------------------------ | ---------------------------------------------- |
| Filesystem (git-tracked)         | Human-reviewed, version-controlled   | Course content, skills, rules, reference files |
| Postgres (Neon)                  | Transactional, queryable, long-lived | User data, billing state, workflow state       |
| KV / Cache (Dragonfly)           | Ephemeral, fast, lossy-OK            | Sessions, rate-limit counters, computed views  |
| Object storage (Railway Buckets) | Binary, immutable-after-write        | Uploads, exports, generated files              |
| Event log (Axiom)                | Append-only, time-indexed, queryable | Logs, traces, metrics, audit trail             |

Test: "If this data vanished, what would it take to recreate?" determines the store.

2. **Adapters wrap external capabilities behind typed interfaces.** One file per external system. The interface is capability-named, not vendor-named: `payments.subscribe()`, not `stripe.checkout.sessions.create()`. Interfaces are shaped for the capability needed, not for the lowest common denominator of possible vendors.

**Structure**

3. **Features are change-local.** A change to one feature touches that feature's folder and nothing else in the features layer. Cross-feature reuse happens via promotion to a concretely-named package, never via sibling imports. Enforce the property via the type system (tsconfig path restrictions + lint rule), not the shape via convention.

4. **Single-product by default.** One `apps/web/` and one `apps/api/`. No speculative multi-product organization. When a second product actually ships, it becomes `apps/second-product/` and reusable pieces move into `packages/`.

5. **Concretely-named packages.** No `platform/`, `utils/`, `common/`, grab-bag folders. Every package has a clear single responsibility: `db/`, `errors/`, `config/`, `auth/`, `adapters/`.

**Context**

6. **CLAUDE.md exists where local rules differ from global.** The root CLAUDE.md covers global conventions (the resolver). A folder gets its own CLAUDE.md only when it has local rules that override or extend the global ones. `.gaia/MANIFEST.md` lists which folders have CLAUDE.mds and why.

7. **Docs serve two roles by default: reference and initiatives.** `.gaia/reference/` is the constitution — long shelf life, agent-facing, the principles each domain follows. `.gaia/initiatives/` is the strategic bets — medium shelf life, daily-active, the work currently underway. Other genres (ADR, spec, memo, runbook) are deferred unless a specific recurring need justifies the addition.

**Dependencies**

8. **Dependency direction is structurally enforced.** Moon workspace boundaries + TypeScript project references + lint rules make invalid imports compile errors, not code-review concerns. Circular dependencies are architecturally impossible.

9. **Pages do three things: call, pass, render.** Pages call a service/hook, pass data to a component, and render. No data transformation, no business logic. Structurally lintable via GritQL rule.

**Workflow integration**

10. **Workflow orchestration is a platform primitive.** Multi-step workflows use Inngest, not per-feature orchestration code.

11. **Content is code when humans edit it.** Markdown files live in `content/` and git-track like source. When apps generate data, it goes to Postgres.

**Enforcement**

12. **Every architectural rule has an enforcement mechanism.** A rule without a mechanism is aspirational, not real.

### Folder structure

The complete repo layout.

```
gaia/                                    # Repo root
│
├── CLAUDE.md                            # Root resolver, ~100 lines
│
├── .claude/                             # Claude Code's home — what Claude Code reads
│   ├── settings.json                    # Hook wiring + skill registration
│   ├── hooks/                           # Lifecycle hooks (Bun TS)
│   │   ├── lib/                         # Shared hook utilities
│   │   ├── pre-tool/                    # block-dangerous, protect-files, protect-config, ...
│   │   ├── post-tool/                   # warn-console-log, harden-gate, ...
│   │   ├── stop/                        # stop-quality-gate, update-context-files, ...
│   │   └── session-start/               # reinject-context, consistency-checks
│   └── skills/                          # gstack foundation + Gaia d-* skills
│       ├── gstack/
│       │   ├── plan/SKILL.md
│       │   ├── review/SKILL.md
│       │   └── qa/SKILL.md
│       ├── d-strategy/                  # Initiative Q&A → initiative.md
│       ├── d-roadmap/                   # Initiative → projects/*.md
│       ├── d-tdd/                       # TDD orchestration from project (was d-code)
│       ├── d-content/                   # Strategy → branded content
│       ├── d-review/                    # Pre-commit principles review
│       ├── d-harness/                   # Error → prevention artifact at correct tier
│       ├── d-health/                    # Codebase health audit
│       └── d-fail/                      # Deploy failure recovery
│
├── .gaia/                               # The methodology — everything Gaia-specific
│   ├── CLAUDE.md                        # Methodology-internal resolver
│   ├── vision.md                        # The locked source of truth (this doc)
│   ├── MANIFEST.md                      # Index of folders with CLAUDE.mds
│   ├── rules.ts                         # Single policy source
│   ├── conductor.ts                     # Thin Bun/TS loop (~200 LOC)
│   │
│   ├── reference/                       # The CONSTITUTION — judgment loaded on demand
│   │   ├── code.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── database.md
│   │   ├── testing.md
│   │   ├── errors.md
│   │   ├── security.md
│   │   ├── observability.md
│   │   ├── commands.md
│   │   ├── design.md
│   │   ├── tokens.md
│   │   ├── ux.md
│   │   ├── dx.md
│   │   ├── ax.md
│   │   ├── voice.md
│   │   ├── workflow.md                  # Workflow principles + locked contracts
│   │   └── harness.md                   # Harness implementation plan
│   │
│   ├── initiatives/                     # Strategic bets per workflow
│   │   ├── roadmap.md                   # Current period's bets
│   │   ├── context.md                   # Latest data snapshot
│   │   └── YYYY-MM-DD-name/
│   │       ├── initiative.md            # The bet, expanded
│   │       └── projects/
│   │           ├── 01-name.md           # Parallel-executable slice
│   │           └── 02-name.md
│   │
│   ├── memory/                          # Agent memory (raw — no auto-promotion in v1)
│   │   ├── working/                     # Volatile per-task state (WORKSPACE.md)
│   │   ├── episodic/                    # Append-only action log (*.jsonl)
│   │   └── personal/                    # Per-developer preferences (folder)
│   │       ├── style.md
│   │       ├── workflow.md
│   │       └── ...
│   │
│   ├── protocols/                       # Trust layer
│   │   ├── tool-schemas/                # Typed schemas per tool
│   │   ├── permissions.md               # Hard boundaries
│   │   └── delegation.md                # Sub-agent handoff rules
│   │
│   └── audit/                           # Structured action logs (append-only)
│
├── apps/
│   ├── web/                             # SolidStart frontend
│   └── api/                             # Elysia backend
│
├── packages/
│   ├── core/, config/, errors/, db/, adapters/, auth/, api/, ui/, security/, workflows/
│
├── content/                             # Human-authored, git-tracked
│   ├── blog/, legal/, emails/
│
├── docs/                                # Human-only project docs
│   ├── README.md, CONTRIBUTING.md, LICENSE
│
├── tools/
│   └── gritql-rules/                    # Custom Biome GritQL rules
│
├── scripts/                             # Cross-file checks (test ratio, manifest, coverage audit)
│
├── .github/workflows/                   # CI configurations
│
├── moon.yml, package.json, biome.json, oxlintrc.json, tsconfig.json, .prototools
├── railway.toml, wrangler.toml, .env.example
```

The visual shift from earlier versions: **everything Gaia-methodology lives under `.gaia/`. `.claude/` holds only what Claude Code natively reads (settings, skills, hooks). Root contains only `CLAUDE.md` and the actual project (apps, packages, content).**

⸻

## Experience

Architecture is inward. Experience is outward: the craft of every interface. Both are parallel peers to Workflow and Harness; none dominates.

### The five experience axes

| Axis | Stands for                                       | Audience       | Primary artifacts                                                    |
| ---- | ------------------------------------------------ | -------------- | -------------------------------------------------------------------- |
| UI   | User interface — visual language                 | humans (eyes)  | Design system, tokens, components                                    |
| UX   | User experience — flows & interactions           | humans (hands) | Onboarding, empty/error/loading states, a11y                         |
| DX   | Developer experience — tooling                   | developers     | CLI, error messages, setup, docs-close-to-code                       |
| AX   | Agent experience — agent-native interfaces       | agents         | Skills (primary), MCP (capability only), schemas, context discipline |
| VX   | Voice experience — brand voice + AI humanization | readers        | Microcopy, marketing, docs prose, generated content                  |

### The 12 experience principles

_(Unchanged from v4. Summary below; full text in `.gaia/reference/`.)_

**Value & flow:** Time-to-first-value is the leading metric; progressive disclosure; feedback loops close fast.

**Truth & safety:** Honest feedback (state is never a lie); reversibility; defaults are safe AND sensible.

**Structure & discipline:** Consistency is a contract; restraint over decoration; legibility by audience.

**Humanity & access:** Voice is human even when the author isn't; accessibility is baseline; discoverability without clutter.

### The MCP-vs-Skills decision

As of April 2026, the agent-native ecosystem has resolved the tension between Anthropic's two protocols:

- **MCP is for capabilities.** Connecting to external systems (GitHub, Linear, Sentry) where the agent needs to read data or take action. MCP tool definitions are always loaded in context — fine for a handful of capabilities; catastrophic at scale.
- **Skills are for procedures.** How to do something — review a PR, write a migration, scaffold a feature, respond in a specific voice. SKILL.md uses progressive disclosure: ~50-token description loads at startup; full body loads only when activated; reference files load on demand.

Gaia defaults to skills. MCP is used only when a genuine external capability is needed. Skills are treated as code with review + version + owner, never as inert text.

⸻

## Workflow

Architecture says how code is organized. Experience says how surfaces reach audiences. **Workflow says how work moves from idea to deployed product.** Harness is the substrate that runs all three.

Workflow is the spine. Architecture and Experience are static (they describe shapes); Workflow is dynamic (it describes motion). The harness's job is to make Workflow actually run, daily, without the user holding the system in their head.

### Northstar

> **Every day, an idea becomes a shipped, quality-gated, value-delivering change — in minutes of user attention.**

Every workflow principle derives from that sentence. If a principle would still be true with "daily" deleted, it's a Harness principle, not a Workflow one.

### Three loops

Work flows through three loops at three cadences:

| Loop      | Asks       | Cadence            | Produces                                              |
| --------- | ---------- | ------------------ | ----------------------------------------------------- |
| Strategy  | WHY / WHAT | Weekly + on signal | `roadmap.md` (informed by `vision.md` + `context.md`) |
| Tactical  | HOW        | Daily              | `initiative.md` → `projects/*.md`                     |
| Execution | DO         | Continuous         | Merged PR + measurement window                        |

Loops run in parallel, not in sequence. The default daily session touches all three: a strategic decision is confirmed, a tactical plan is produced, and one or more execution slices are merged. The user holds the steering wheel; the agent holds the keyboard. The execution sub-loop is governed by the four engineering disciplines (think before, simplify, surgical, goal-driven) encoded in root `CLAUDE.md`.

### The 12 workflow principles

Grouped into four clusters. Each principle states an enforcement mechanism. Full spec lives in `.gaia/reference/workflow.md`.

**Cadence and rhythm**

1. **The unit of success is a closed cycle, not a shipped change.** Cycles close on a measurement verdict. Shipping volume without measurement is the build trap with daily-cadence theater on top.
2. **Cadences are minimums; any loop can be triggered by a signal.** Strategy can be triggered by context invalidation; tactical by freed worker capacity; execution runs continuously.
3. **The system supports a "check and leave" daily user.** Default session is a briefing + a few decisions + close. Heroic mode is available, not the target.

**Loop structure**

4. **Three loops, bidirectional flow.** Loops produce typed artifacts forward and signal backward. Forward-only is waterfall; backward-only is paralysis.
5. **Every artifact links up and down.** A project states its parent initiative; an initiative states its parent commitment; orphaned artifacts fail validation.
6. **The roadmap is a portfolio, not a buffet.** Small, opinionated set (5–7) of bets per period. "Parked" and "Rejected" are explicit sections.
7. **The strategic taxonomy is locked in vision.** Gaia uses **NCT-hybrid** (Narrative + Commitments + Tasks-as-initiatives). Locked in vision; changing requires a vision update.

**Handoffs and gates**

8. **Each phase transition is an artifact validation, not a ceremony.** No phase progresses without a schema-valid prior artifact.
9. **Principles review runs before correctness review.** Gaia's `d-review` runs first; gstack `/review` and `/qa` only run on principles-passing diffs.
10. **Projects are parallel by declared concern, not assumed concern.** Each project declares `touches:` (files, modules); Conductor refuses to spawn worktrees with overlapping scopes.

**Outcomes and honesty**

11. **Every initiative states its hypothesized effect on the north star and its measurement plan.** Hypotheses can be wrong; they cannot be absent. Measurement runs as **measurement debt** — initiatives ship with a measurement plan; verdicts land asynchronously and feed back to strategy.
12. **Daily sessions start with outcomes, then outputs.** Outcome briefing is the first screen; PR queues come after. Structural ordering at the UX layer prevents the build trap.

### Locked contracts

Vision-v6 locks the artifact schemas. Full schemas in `.gaia/reference/workflow.md`; summarized:

- `vision.md`: `taxonomy: nct-hybrid`, `north_star: { metric, current, target, unit }`
- `context.md`: dated, generated by `roadmap` skill from real-time data sources
- `roadmap.md`: NCT-structured (Narrative / Commitments / Committed initiatives / Parked / Rejected)
- `initiative.md`: `parent`, `hypothesis`, `measurement: { metric, source, baseline, threshold, window_days, verdict }`
- `project.md`: `parent_initiative`, `touches: { files, modules, concerns }`, `depends_on: []`

⸻

## Harness

The 15 principles say what Gaia believes. Architecture says how code is organized. Experience says how surfaces reach audiences. Workflow says how work moves. **Harness says how Workflow + Architecture + Experience are made discoverable and enforceable by the AI coding agent.**

Architecture is inward. Experience is outward. Workflow is operational. **Harness is substrate.** The four are parallel peers; none dominates.

### Mission, in one sentence

> **The harness exists so that every principle in `.gaia/reference/*.md` is discoverable (the agent can find what applies) and enforceable (a mechanism catches deviations) — for the AI coding agent operating Gaia.**

Without the harness, the principles are aspirational. With it, they hold.

### Philosophical ground

**The harness does not think.** The model thinks. The skills encode judgment. The protocols enforce boundaries. The memory accumulates value. The harness is the substrate that lets these four work together.

If the harness starts thinking — loading context intelligently, matching skills semantically, making decisions about tool calls — intelligence has been put in the wrong place. Push it back into skills.

**Everything accumulates value except the harness.** You can swap models tomorrow. You can swap the harness tomorrow. You cannot swap your memory or your skills. Those are the only things that carry forward. This is why they are markdown in git, owned by you, portable across every agent and every IDE.

### The 14 harness principles

#### Separation

1. **Four externalized modules, one thin conductor.** The harness composes four modules — memory (what happened), skills (how to do things), protocols (what's allowed), and a ~200-line conductor (the loop). The conductor reads files, calls tools, writes logs, runs hooks. It does not reason. If the conductor grows past 500 lines, intelligence has leaked into the wrong layer and must be pushed back into skills.

2. **Skills are methods; markdown is the language; judgment is the runtime.** A skill is a markdown file with YAML frontmatter and (in v2) a self-rewrite hook. It takes parameters and produces different capabilities on each invocation. Same procedure, different world, different output. Markdown is a more perfect encapsulation of capability than rigid source code for anything involving judgment. This is software design, not prompt engineering.

#### Context

3. **Every context fragment earns its place.** The context window is a computation box. The model only reasons over what is inside it. Each fragment is an explicit decision: signal or noise. Targeted fragments steer the model; stale or conflicting fragments degrade it. The critical function in the harness is `buildContext()`, not the model call. Budget is declared explicitly, enforced by the conductor, audited per session.

4. **Progressive disclosure at every layer.** Manifest summaries always load. Full skill files load only on trigger match. References load only on task-match. A skill registry of 500 entries should add <10K tokens to baseline context, not 500K. Keyword triggers work to ~50 skills; semantic matching becomes necessary around 500.

5. **Resolvers are the management layer.** Resolvers are routing tables that compose fractally. The **skill resolver** lives in root `CLAUDE.md` (task intent → skill). The **docs resolver** also lives in root `CLAUDE.md` (content type → reference file). The **context resolver** lives inside each skill (sub-task → sub-procedure). No separate AGENTS.md, RESOLVER.md, or manifest files — Claude Code loads CLAUDE.md natively; routing tables don't need their own filenames. ~100 lines of routing in CLAUDE.md replace 20,000 lines of crammed context.

6. **Nested CLAUDE.md, MANIFEST.md as index.** Layer 1: folder CLAUDE.mds auto-load by location, footers auto-regenerated by the Stop hook when code changes. Layer 2: reference files at `.gaia/reference/*.md` (the constitution). Layer 3: strategy artifacts at `.gaia/initiatives/`. `.gaia/MANIFEST.md` lists which folders have CLAUDE.mds and why — missing entries mean root applies. No cargo-culted per-folder CLAUDE.mds; every one earns its place.

#### Trust

7. **Protocols first, skills second.** Write the tool schemas before the skills that use them. A typed schema with `preconditions`, `side_effects`, `blocked_targets`, and `requires_approval` fields tells the agent exactly what's allowed. The pre-tool-call hook enforces this at runtime regardless of what the skill tried to do. Skills describe "what good looks like"; protocols enforce "what's allowed."

8. **Permissions are hard boundaries.** `.gaia/protocols/permissions.md` has three sections: **always-allowed** (read files, run tests, create branches, write to memory/skills), **requires-approval** (merge PRs, deploy, install dependencies, modify CI), **never-allowed** (force-push to main/production/staging, access secrets directly, disable hooks, modify permissions.md itself). Force-push to main is never-allowed — no skill can override. Changing permissions requires explicit human edit; it is a product decision.

9. **One policy, many surfaces.** All rules live in `.gaia/rules.ts` — a single TypeScript source consumed by Claude Code hooks, CI, editor integrations, and optional pre-commit hooks. Drift is structurally impossible. Hooks run in TypeScript on Bun: no Python, no jq, no cross-language drift. `PreToolUse` checks against schemas and permissions. `PostToolUse` logs and warns. `Stop` triggers batch quality gates and footer regeneration. `SessionStart:compact` re-injects critical rules after context compaction.

#### Memory

10. **Three memory surfaces, three retention policies.**

| Surface  | Path                            | Lifecycle                              | Retrieval              |
| -------- | ------------------------------- | -------------------------------------- | ---------------------- |
| Working  | `.gaia/memory/working/`         | Volatile, cleared per task             | Always loaded          |
| Episodic | `.gaia/memory/episodic/*.jsonl` | Append-only, kept indefinitely in v1   | Top-k by recency in v1 |
| Personal | `.gaia/memory/personal/*.md`    | Stable per-developer (folder of files) | Always loaded          |

Reference files (`.gaia/reference/*.md`) are also memory in the broad sense — they're the curated long-term knowledge. But they are human-authored and version-controlled, not agent-written; they carry a different name (constitution) to keep the writer/reader contract clear. **In v1, episodic memory accumulates raw — no automatic promotion to references.** Auto-promotion (the dream cycle) is v2 work.

#### Process

11. **Destinations and fences, never driving directions.** Skills teach "what good looks like," not "step 1 do X, step 2 do Y." **Procedures** give a skeleton so the agent doesn't skip a phase. **Heuristics** give defaults so it doesn't freeze at forks. **Constraints** give fences so it stays in the yard. Anything more is micromanagement, and it rots the moment the next model improves.

12. **Latent for judgment, deterministic for facts.** Every step in the system is classified. **Judgment** → latent space (LLM reads, interprets, decides). **Facts** → deterministic (SQL, tests, lint, compiled code, counts, sorts, verifications). Mixing them is the #1 failure mode. If you catch yourself asking the model to count, sort, deduplicate, or verify — stop, and write a deterministic tool. The boundary is the design.

13. **Diarization is the signature skill shape.** Diarization is the skill pattern unique to AI: read everything about a subject, hold contradictions in mind, synthesize a structured profile. `/d-review` diarizes a PR. `/d-health` diarizes the codebase. `/d-strategy` diarizes an initiative. No SQL produces this. No RAG pipeline produces this. The model has to actually read and synthesize. Most of Gaia's highest-value skills are diarization skills.

#### Mission

14. **The harness enforces the reference principles.** The harness's primary job is to make every principle in `.gaia/reference/*.md` enforceable. Each principle has a mechanism — lint rule, hook, script, CI gate, or `/d-review` heuristic — registered in `.gaia/rules.ts`. Without a mechanism, a principle is aspirational and gets demoted to memo until enforcement is designed. The harness is the union of all such mechanisms, and nothing more.

### Coding: the missing-by-design skill

Gstack has no `code` skill. Neither does Gaia. **Coding is not a skill; it is the surface every other skill operates on.** The guideline lives in `.gaia/reference/code.md` as context (destinations and fences), not procedure.

Agents code by loading the relevant CLAUDE.mds, the architecture references, the feature's local context, and the current task — then writing. No skill wraps the act of writing code itself. Skills wrap the acts _around_ writing code: planning (`plan`), reviewing (`review`, `d-review`), testing (`qa`), TDD orchestration (`d-tdd`), refactoring, documenting.

The four engineering disciplines (think before, simplify, surgical, goal-driven) are operating instructions in the root `CLAUDE.md`, not principles in this document. Their place is at the point of work, not in vision.

### How the harness ships

Cloning Gaia gives you a working harness on day one:

- `.gaia/rules.ts` — policy source, pre-populated with all enforcement rules
- `.gaia/conductor.ts` — thin TypeScript loop (~200 LOC)
- `.gaia/reference/` — the 17 reference files (constitution + workflow + harness)
- `.gaia/initiatives/` — empty, ready for your first roadmap
- `.gaia/memory/` — three-surface structure initialized empty
- `.gaia/protocols/` — permissions.md, delegation.md, typed tool schemas
- `.gaia/CLAUDE.md` — methodology-internal resolver
- `.gaia/MANIFEST.md` — index of nested CLAUDE.mds
- `.gaia/audit/` — empty append-only log
- `.claude/settings.json` — hook wiring + skill registration
- `.claude/hooks/` — lifecycle hooks in Bun TS
- `.claude/skills/gstack/` — vendored `plan`, `review`, `qa`
- `.claude/skills/d-*/` — Gaia skills (d-strategy, d-roadmap, d-tdd, d-content, d-review, d-harness, d-health, d-fail)
- `CLAUDE.md` — root resolver (~100 lines)

Users clone, run `bun install`, configure env vars, and have a fully operational agent-native development environment. No Python runtime for hooks. No jq. No external memory service. All state is markdown + JSONL + TypeScript in git.

### Self-evolving behavior — deferred to v2

The following capabilities are explicitly **not** in v1, by design:

- **Dream cycle** — nightly Bun cron that compresses episodic memory and promotes recurring patterns to reference files
- **Skill self-rewrite** — skills proposing edits to themselves based on their own episodic history
- **Salience-ranked retrieval** — pain × importance × recurrence × recency-decay scoring
- **Constraint escalation** — local skill-level lessons promoted to global reference automatically
- **Auto-promotion to LESSONS.md** — agent-authored writes to the constitution

In v1, episodic memory accumulates raw. The user (or `d-harness` invoked manually) is the promotion path. This keeps v1 honest: the reference files only contain principles a human reviewed and approved. v2 adds self-evolution once the trigger-eval infrastructure exists to catch confidently-wrong promotions before they poison the constitution.

⸻

## Orchestration

_(Deferred to a later spec; included here for directional clarity.)_

The harness runs inside an IDE — Claude Code, by default. The orchestrator is the layer that coordinates the IDE, the harness, the tooling, and the deployment lifecycle from a single opinionated interface.

**Planned implementation: conductor.build**, integrated via an opinionated configuration that installs all necessary dependencies and wires them correctly on first run. The goal is to collapse "idea to deployment" to minutes by making the full harness operational from one command, with sensible defaults and no hidden configuration.

Conductor is the runtime for Workflow. It implements W3 (workspaces fast enough that "check and leave" works), W8 (phase-transition validation before spawning sessions), W10 (reading `touches:` declarations and assigning worktrees without scope collisions), and W2 (watching signal detectors for triggered loop runs).

Scope and design are deferred to a later vision revision. Everything in v1 must stand on its own if the orchestrator layer never ships.

⸻

## What Gaia ships (v1 template scope)

The template ships with the following working out of the box:

- Monorepo scaffold (Moon + proto + Bun workspaces)
- Elysia API with auth (Better Auth), billing (Polar), email (Resend)
- SolidStart frontend with auth flows, billing pages, dashboard skeleton
- Neon-ready Postgres schema with Drizzle migrations
- Rate limiting, session security, helmet-style headers, audit logging
- Full CI pipeline (type/lint/format/test/security/coverage/size)
- **Complete static harness**: `.gaia/rules.ts`, Bun/TS hooks, three-surface memory, typed protocols, gstack foundation + Gaia d-skills
- **Reference files** for code, backend, frontend, database, testing, errors, security, observability, commands, design, tokens, ux, dx, ax, voice, workflow, harness
- **Initiatives folder** scaffolded with empty roadmap.md and the daily workflow ready to run
- **Nested CLAUDE.md strategy** with `.gaia/MANIFEST.md`
- **Root CLAUDE.md** as the resolver (~100 lines: principles overview, four engineering disciplines, skills resolver, docs resolver)
- **`.gaia/CLAUDE.md`** as the methodology-internal resolver
- Scalar-rendered API docs
- PostHog + Sentry + Axiom + OpenTelemetry wiring
- Dockerfile + railway.toml for one-click Railway deploy
- wrangler.toml documented for Cloudflare scale migration
- README + onboarding walkthrough
- Workflow scaffolding: a fresh repo can run `d-strategy` on day one

### What does not ship in v1

- **Self-evolving harness** (dream cycle, skill self-rewrite, salience scoring, auto-promotion) — explicitly v2
- **Orchestrator / conductor.build integration** — v2/v3
- **Trigger-eval infrastructure** — needed for v2 self-evolving; specified separately
- **Admin panel** (documented pattern, not generated)
- **Multi-tenancy** (single-tenant first; multi-tenant in v2 if demanded)
- **Queue-heavy workload templates** beyond Inngest hello-world
- **Payment models** beyond subscription + one-time
- **i18n scaffolding** (single locale in v1)
- **Third-party memory service integration** (future research: Mem0, Letta, etc.)

⸻

## What Gaia is NOT

Explicit non-goals, to stay focused:

- Not a framework that locks you in. Every dependency is conventionally used, not structurally coupled.
- Not a hosted backend. You own your backend code.
- Not for enterprise. Scaling is technical, not organizational.
- Not a React/Next.js template.
- Not a no-code tool. Real code, AI-assisted.
- Not infrastructure you rent servers for.
- Not multi-language. TypeScript only.
- Not optimized for cold starts.
- Not IDE-agnostic. Gaia assumes Claude Code.
- **Not an agent framework with a thick harness.** The harness is infrastructure — invisible when it works. The value accumulates in skills, memory, and reference files.
- **Not a self-evolving system in v1.** v1 is static enforcement of human-authored principles. Self-evolution is v2.

⸻

## Competitive landscape

### The closest competitor: Wasp.sh

Wasp is the closest thing to "Rails for TypeScript." It uses a custom DSL, ships auth + payments + deploy out of the box, and is opinionated about the full stack. Gaia differs on five axes:

1. **Agent-native first.** Wasp's audience is human developers with AI assistance. Gaia's audience is agents with human oversight.
2. **No custom DSL.** Wasp invents a `.wasp` file. Gaia uses plain TypeScript everywhere. Agents already know TypeScript; they don't know Wasp's DSL.
3. **Modern runtime/framework.** Wasp is Node + React + Express + Prisma. Gaia is Bun + Elysia + SolidStart + Drizzle. 5–10x performance on most benchmarks.
4. **Harness as core.** Wasp has no equivalent to typed protocols, the resolver-in-CLAUDE.md pattern, principle-mechanism enforcement, or the workflow loops. This is what makes Gaia agent-native rather than AI-assisted.
5. **Composability.** Wasp is hard to eject from. Gaia is structurally ejectable at every layer — including the harness, which is plain markdown and TypeScript in git.

### Other adjacent products

_(Unchanged from v4: create-t3-app, Encore.dev, Convex, SST, Shuttle, Supabase/Appwrite/Pocketbase, Rails/Laravel/Django.)_

Gaia is the first product combining (1) modern agent-native TypeScript stack + (2) opinionated architecture + (3) **a daily workflow loop with measurement debt** + (4) **a harness whose explicit job is to enforce reference principles** + (5) solo-scale target + (6) structural ejectability.

⸻

## Future tiers (explicitly deferred)

- **v2 — Self-evolving harness.** Dream cycle, skill self-rewrite, salience-ranked retrieval, auto-promotion of episodic patterns to reference files. Requires trigger-eval infrastructure first.
- **Tier 2 (future): Course.** Teaches non-technical operators to ship SaaS using Gaia. Acquisition funnel.
- **Tier 3 (future): Orchestrator.** conductor.build integration — idea to deployment in minutes via a single opinionated interface.
- **Tier 4 (future): Platform (free).** `gaia init` / `gaia deploy` CLI. Provisions to user-owned Cloudflare + Neon accounts.
- **Tier 5 (future): Platform (paid).** Team features, multi-provider, managed upgrades, priority support.

⸻

## Open specs (Vision v6 requires these)

Ordered by blocking priority:

1. **`.gaia/rules.ts` schema** — single policy source consumed by hooks, CI, editor integrations. Blocks MVP.

2. **Root `CLAUDE.md` content** — ~100 lines covering principles overview, four engineering disciplines (Karpathy), skills resolver, docs resolver, thin policy. Blocks MVP.

3. **`.gaia/CLAUDE.md` content** — methodology-internal resolver. Short — points to vision, reference, initiatives.

4. **Reference file inventory and mechanisms** — for v1, ship mechanisms for `code.md`, `backend.md`, `errors.md`, `testing.md`, `security.md` (engineering core). `frontend.md` ships with route-shape and accessibility mechanisms. Experience-axis files (`design.md`, `voice.md`, `ux.md`, `dx.md`, `ax.md`, `tokens.md`) ship with `/d-review` heuristics initially.

5. **V1 MVP file list** — every file that ships in the starter, with description and reason.

6. **Tool schemas library** — typed schemas for bash, github, deploy, database, and the Gaia CLI. Pre-populated with preconditions, side-effects, approval gates.

7. **Onboarding / initial setup** — `bun create gaia@latest` first-run flow.

8. **Security-by-default Elysia package** — rate limiting, headers, CSRF, validation gateway, session security, audit logging pre-wired in `packages/security/`.

9. **Custom Biome GritQL ruleset** — encoded enforcement rules. One per principle that needs codebase-pattern enforcement (estimated 30–50 rules across reference files).

10. **Workflow skill artifacts** — for each workflow skill (`d-strategy`, `d-roadmap`, `d-tdd`, `d-content`, `d-review`, `d-harness`, `d-health`, `d-fail`), produce `SKILL.md` + walkthrough template + research/acknowledgements file.

11. **Conductor worktree-assignment algorithm** — how Conductor reads `touches:` declarations and resolves conflicts (deferred to Orchestration but specified here).

12. **Positioning statement (one sentence)** — current draft: _"Gaia is Rails for TypeScript in the agent era — for solo operators building production SaaS, with a daily workflow loop and a harness that enforces every principle in your reference files."_

13. **Template-as-manual verification** — can someone read the template top-to-bottom and understand how to build on it? Tests general principle #9.

14. **Trigger-eval infrastructure (v2 prerequisite)** — given input X, which skill fires? Testable routing for the skill resolver. Required before self-evolving features can ship safely.

15. **Distribution mechanism** — how does a user clone or import Gaia's harness into a new repo? CLI? Git template? Plugin? Open question for v1; defaults to `git clone` until decided.

⸻

_Vision v6. Decisions are locked; implementation is not. Architecture, Experience, Workflow, and Harness are parallel peers — none dominates. Self-evolving behavior is deferred to v2 by design. Orchestration is deferred to its own spec. Open specs above will be drafted in subsequent docs, one per open spec. The harness is what turns "idea to deployment in weeks" into "idea to deployment in minutes" — by making every principle in the reference files discoverable and enforceable for the AI coding agent._
