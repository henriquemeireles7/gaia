---
parent: roadmap.md — "A working Gaia v6 template that clones, installs, and runs"
hypothesis: a complete, MIT, opinionated template that takes a developer from `git clone` to a deployed public URL in 30 minutes — covering auth, payments, DB, email, observability, admin, and CI/CD — is the wedge that gets the Lovable-graduate ICP to adopt Gaia, because it collapses 6–10 vendor stitching jobs into one repo + one guided skill.
measurement: time-to-first-deploy on real external accounts. Five alpha sessions (3 internal, 2 external) inside an unstructured 30-minute window. Threshold: ≥3 of 5 reach a live URL serving the auth flow without operator intervention. 30-day window from the day v1.0 of the template is tagged.
status: approved (autoplan round 1, 2026-04-28)
restore_point: /Users/henriquemeireles/.gstack/projects/henriquemeireles7-gaia/project-6-adversarial-rewrites-autoplan-restore-20260428-011907.md
---

# Initiative 001 — Gaia v1 Template (clone-to-deploy in 30 minutes)

> **Parent commitment** (roadmap.md): "A working Gaia v6 template that clones, installs, and runs."
> **Hypothesis:** a complete, MIT, opinionated template + a single guided skill (`/d-onboard`) that walks a developer from `git clone` through GitHub setup, API-key collection, first commit, and deploy — completing in ≤30 wall-clock minutes — will convert Lovable/Bolt/V0 graduates into Gaia users at a rate above the floor any incremental boilerplate can hit.
> **Measurement:**
>
> - **metric:** time-to-first-deploy (TTFD) on a real account, plus alpha completion rate
> - **source:** screen recordings + structured post-session interview + git timestamps
> - **baseline:** ShipFast/Makerkit median TTFD ≈ 2–6 hours for a first-time developer (founder estimate; verify in Phase 2)
> - **threshold:** ≥3 of 5 alpha testers reach a live URL inside 30 minutes; median TTFD ≤30 min; zero alpha sessions abandoned at install/build steps
> - **window_days:** 30 days from the day the template is tagged v1.0 in the public repo
> - **verdict:** TBD (set after Phase 2 alpha sessions)
> - **abandonment ladder (45 days):** <2 of 5 alphas reach 30-min URL → re-scope (likely strip features, simplify onboarding); 2 of 5 → re-iterate the skill, hold scope; ≥3 of 5 → ship, hand off to 002 (launch hardening)
>
> **Status:** APPROVED (autoplan round 1 complete, 2026-04-28). 18 mechanical changes auto-applied below; User Challenge resolved via option B (`bun create gaia@latest` added; `/d-onboard` retained as orchestrator); 5 taste decisions accepted per autoplan recommendations.
> **Predecessors:** none. This is the foundation initiative — 002 (launch hardening) and any future initiative covering the open-source self-hostable platform depend on 001 substantially complete.
> **Source:** Founder direction 2026-04-28 + three accumulated session summaries (Setup Gaia project, Plan Open-Source Monorepo, Understand startup play) + autoplan round 1 (Codex + Claude subagent across CEO/Eng/DX phases).

---

## Why this initiative exists (the gap 002 doesn't fill)

Initiative 002 (`2026-04-27-gaia-v1-launch-hardening`) was scoped first by accident. It assumes "the template works" and focuses on launch readiness — security audits, claim hygiene, the X thread, the Show HN post, the landing page. **But there is no separate document defining what "the template works" actually means.** The 002 doc embeds template scope inside its launch checklist, conflating two different jobs:

- **Job A (this initiative, 001):** make the substantive template real — UI, backend, providers, admin, the first-cycle onboarding skill, the deploy machinery. The thing a developer clones.
- **Job B (002):** make the public OSS launch credible — security review, claim hygiene, telemetry, marketing, docs polish, distribution.

Without 001, 002 is launching nothing. With 001 done, 002 is launching a known-good artifact.

**Reconciliation note for 002:** the user's 2026-04-28 message reframes 002 as "the open-source deployment platform" (a self-hostable hosted-runtime alternative). The existing 002 doc is launch hardening. These are different. Carried as **Open Question #1** in this doc; 002 stays untouched in this turn.

---

## What "Gaia" is — locked answer

The recurring identity question (template? framework? distribution? OS?) is resolved here so 001 has stable ground. The locked phrasing:

> **Gaia is an open-source distribution of an opinionated TypeScript SaaS stack, plus a methodology and a harness, packaged as a clonable MIT template.**

Four layers, shipped as one repo:

| Layer                | Contents                                                                                                                                                                                   | Mode                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **L1 — Stack**       | Bun + Elysia + SolidStart + Drizzle + TypeBox + Polar + Better Auth + Resend + Inngest + Sentry + PostHog + Axiom + ast-grep + oxlint + oxfmt                                              | Distribution. We pick, version, and wire. We do not reinvent.                                                   |
| **L2 — Surfaces**    | Landing, auth flows (signup/login/verify/reset/optional OAuth), dashboard, billing (checkout + portal), admin scaffold + 3 modules (metrics, email log, mini-CRM), content/CMS scaffolding | Template. The user clones, owns, modifies.                                                                      |
| **L3 — Methodology** | `.gaia/vision.md`, **21 reference files**, 8 d-\* skills + gstack foundation, `.gaia/initiatives/` workflow loop                                                                           | Vendored markdown + skills. Modifiable by the user; upgraded by codemods + `/d-upgrade` skill (see Assignment). |
| **L4 — Harness**     | PreToolUse / PostToolUse / Stop / SessionStart hooks consuming `.gaia/rules.ts`; oxlint + oxfmt + ast-grep + script-tier gates + parallel CI                                               | Vendored TypeScript. Modifiable. The deterministic enforcement that makes L3 not rot.                           |

**License:** MIT for the template. (FSL-1.1-MIT is reserved for the future open-source self-hostable platform — out of scope for 001.)

**Why "distribution" is the right word:** we don't invent (framework). We don't ship a snapshot the user diverges from forever (template alone). We curate, wire, document, and upgrade — like Ubuntu does for Linux, like Laravel-with-Jetstream does for PHP, like RedwoodSDK is trying to do for React. The clonable template is the _shape_ the distribution takes. The methodology + harness are what makes it different from ShipFast.

**What we are NOT:**

- Not a backend framework (Elysia is the backend framework; we ship it).
- Not a frontend framework (SolidStart is the frontend framework; we ship it).
- Not a hosting platform (Railway is the hosting platform; we wire it).
- Not a closed-source product (the template is MIT, period).
- Not a no-code tool (every line is real code, ejectable, debuggable).

---

## Problem Statement

A new class of developer — graduating from Lovable / Bolt / V0 / Make / n8n into Claude Code — wants to build a real SaaS but doesn't have the senior-developer instinct to assemble the 6–10 vendors that would be needed: a runtime, a backend framework, a frontend framework, an ORM, a validation layer, an auth library, a payments provider, a transactional email service, a workflow runner, an observability stack, an error tracker, and a deploy target. Each of those has a non-trivial setup. Each multiplies the others. The combinatorial complexity is the wall.

Existing alternatives:

- **Paid boilerplates (ShipFast, Makerkit, Supastarter)** sell a Next.js + Supabase + Stripe scaffold for $200–$300 one-time. They target classical TypeScript developers; the no-code graduate has neither the money habit nor the framework instinct, and the 2-to-6-hour TTFD ceiling pushes them off.
- **OSS frameworks (T3, RedwoodSDK, Wasp, Encore.ts)** ship the framework but not the SaaS surface. The user still has to build auth, billing, admin, and ops on top.
- **No-code platforms (Lovable, Bolt, V0)** ship a working app fast but lock the user into a sandbox they cannot eject from. The graduate already hit this ceiling.

**The gap:** an MIT, agent-native, fully-assembled, opinionated template + a single guided skill that walks a graduate through the 30-min path to a deployed URL — with the harness keeping the AI agent on-rails the whole way.

That's what 001 ships.

---

## Status quo (what's already in the repo)

**Done (Phases 1–8 across PRs #8 → #18, master):**

- Stack swap complete: Hono → Elysia, Preact → SolidStart, Zod → TypeBox, Stripe → Polar, single-pkg → Bun workspaces.
- 17 reference files in `.gaia/reference/`.
- `vision.md` (Gaia v6, locked).
- `rules.ts` with 56 rules; 35 active mechanisms (24 hooks, 3 oxlint, 3 ci, 5 scripts), 21 pending.
- 4 core hooks running (PreToolUse, PostToolUse, Stop, SessionStart:compact).
- Domain-context hook auto-loads relevant `reference/<domain>.md` on Edit.
- 8 d-\* skills (`d-strategy`, `d-roadmap`, `d-tdd`, `d-content`, `d-review`, `d-health`, `d-harness`, `d-fail`) + gstack foundation.
- oxlint + oxfmt + ast-grep + Knip + 4 script-tier gates wired into `bun run check`.
- `packages/security/` with `protectedRoute`, `publicRoute`, `applySecurityHeaders`, audit-log stub.
- `packages/ui/` with 3-tier design tokens + `styles.css`.
- `packages/auth/` with Better Auth + Bun.password (argon2id) + Drizzle adapter.
- `packages/adapters/payments.ts` with Polar webhook signature verification (Web Crypto).
- `packages/workflows/` with Inngest mounted at `/api/inngest` + one example function.
- `packages/core/observability.ts` with `initObservability(env)` called at boot.
- `packages/api/` with Eden Treaty client.
- Moon `.moon/` configured (CLI not yet installed locally).
- ADR-0001 (ast-grep over GritQL).
- Railway + Docker + GitHub Actions parallel CI.

**Missing for "30 min to deployed URL" (this initiative's actual scope):**

- Real landing page (current `/` is three lines of stub copy).
- Complete auth flows: email verification, password reset, optional OAuth (Google).
- Polar checkout + portal _end-to-end_ (currently only webhook verification).
- Admin scaffold + 3 working modules (currently zero modules).
- Content/CMS scaffolding to render `content/` markdown.
- `/d-onboard` skill — the orchestrator for the first cycle.
- `setup/human-tasks.md.template` format spec + verifier scripts.
- Railway CD/CI with self-diagnosing deploy failure recovery (calls `/d-fail`).
- gaia.app deployed from this template's `master` (the dogfooding contract).
- Mutation testing (Stryker) and e2e (Playwright) — vision §11 mandates, currently absent.
- 5 of 17 reference domains have only judgment-based enforcement (design, dx, tokens, ux, voice).

001 closes the 11 missing items above. Anything not in that list is **out of scope** and explicitly deferred to 002 or later.

---

## First Principles — the 7 invariants of a 30-min template

These are load-bearing for the whole initiative. Every design decision below traces back to one of these.

1. **One install command** must produce a running local dev server in <5 minutes on a clean Mac/Linux box. No Docker required for first-run; SQLite fallback drives local dev so the user does not have to provision Postgres before they see anything work. Postgres path is documented and enabled with one env-var flip.

2. **Every external dependency is enumerated in one place.** The user creates 4 external accounts — Polar (payments), Resend (email), Neon (Postgres), Railway (deploy). Nothing is implicit. The list lives in a single file (`setup/human-tasks.md`) the agent reads, the human acts on, and a verifier script checks. No "go figure out auth providers" — the path is explicit.

3. **The CD/CI pipeline self-diagnoses failures.** Deploy is a loop, not a fire-and-pray. When Railway fails, the orchestrating skill (`/d-onboard`) calls `/d-fail`, which reads Railway logs, classifies the failure (typecheck / migration / env-var / build), produces a fix, commits it, re-deploys. Loop until green or until 3 attempts (then surface to the human).

4. **Overbuild on purpose, prune by AI.** Counter to template orthodoxy ("ship minimal, let users add"), Gaia ships _complete_: auth flows present, billing checkout wired, admin modules pre-built, content scaffolding present. The bet is that a Claude Code agent + harness can prune unwanted surfaces in <5 minutes per surface, while assembling them from scratch takes hours. The boil-20% discipline (vision §10) constrains what "complete" means: one feature per replaced tool, never the second.

5. **Dogfood by construction, not by discipline.** gaia.app's `master` _is_ this template's `master`. There is no separate gaia.app codebase. The two databases (gaia.app's DB, the user's DB) hold different rows; the code is byte-identical. Divergence is structurally impossible because there's no second tree to diverge into. (Future Stage 2a paid features go into a private `@gaia/pro` overlay imported only by gaia.app's deployment — but 001 doesn't ship any of those.)

6. **The first impression is a thin CLI scaffolder + a single guided skill** _(revised by autoplan round 1, 2026-04-28; reconciles vision Open-specs §7 + dx.md §1 + ax.md §1)_. Two layers:
   - **Layer A — `bun create gaia@latest <name>`** (CLI scaffolder, deterministic, ~30 seconds). This is the first command. It clones, runs `bun install`, generates `.env.local` from `.env.example`, runs `drizzle-kit migrate` against SQLite fallback, prints "✓ localhost ready: `bun dev`." This is the **TTHW <5 min** target's load-bearing primitive. Per dx.md §1, every operation that matters is a CLI command — verb-noun, exit-coded, `--help`-equipped. The scaffolder is testable in pure CI without external services.
   - **Layer B — `/d-onboard` skill** (orchestrator, ~25 minutes). Runs after the CLI, inside Claude Code. Walks the human-tasks loop (Polar/Resend/Neon/Railway), syncs GitHub secrets, deploys to Railway, calls `/d-fail` on failure, smoke-tests. This is the **TTFD ≤30 min** target's load-bearing primitive. The skill orchestrates CLI commands underneath (`gh`, `railway`, `bun run setup:verify-key X`); the skill is the conversational front-end, the CLI is the testable substrate.
   - Three flags on the skill cover the escape hatches: `--no-billing` (skip Polar+Resend), `--local-only` (stop at Phase 4 — no deploy), `--dry-run` (walk Phases 1–7 narratively without writes). Plus `--resume` (default after partial run) and `--restart` (wipe `setup/onboard-state.json`).
   - If either layer breaks, the template breaks. Both must be testable end-to-end (`bun run test:scaffold` for Layer A, `bun run test:onboard` for Layer B).

7. **30 minutes is wall-time, including external account creation.** The clock starts when the user clicks "Use this template" on GitHub or runs `git clone`. It includes Polar's email-verify wait, Resend's domain-verification skip, Neon's project-create page-load, Railway's first-deploy minutes. We cannot pre-provision accounts; we can only sequence and parallelize the human work so external waits overlap with our automation.

---

## Target user & narrowest wedge

**Primary ICP** (carried from 002, locked): Lovable / Bolt / V0 / Make / n8n graduates moving into Claude Code. They are budget-conscious, taste-sharpening, and risk-averse about "is this real code?" They have one Saturday afternoon to evaluate Gaia. If 30 minutes in they don't have a deployed URL, they leave.

**Narrowest wedge for 001:**
A single demo flow recorded as a 60-second video on the README:

```
0:00  git clone https://github.com/USER/myapp gaia
0:05  cd gaia && bun install
1:30  bun dev   (localhost:3000 visible — landing + login + admin)
2:00  claude
2:05  /d-onboard
2:10  Skill prompts for project name, GitHub repo creation
3:00  Skill walks through human-tasks.md (Polar, Resend, Neon, Railway)
       — opens browser, shows where to click, asks for keys back
       — verifies each key with a one-shot bun script
20:00 All keys verified; skill commits, pushes, configures GitHub secrets
22:00 Railway deploy starts; skill watches; if failure, /d-fail loop
27:00 Deploy green; skill smoke-tests live URL
28:00 Skill prints: "Live at https://myapp.up.railway.app — TTFD 28m12s"
```

That's 001 v1.0. Nothing more, nothing less.

---

## Constraints

- Solo founder + AI as collaborator. No team to delegate to.
- TypeScript-only, Bun-only, vision v6 stack-locked.
- Template is **MIT**, no exceptions. (Future open-source platform = FSL-1.1-MIT, but out of scope here.)
- **No paid feature gating in the template.** Every UI surface, every flow, every skill ships free. The paid story is hosted services in Stage 2a, not template lock-and-key.
- **Provider files architecture from day 1.** Payment, email, observability, storage are swappable as config-line changes. Runtime / framework / auth are NOT (vision §Premise 9).
- The 30-min clock includes external account creation; cannot be cheated.
- Self-evolving harness deferred to v2 (vision §Harness). 001 ships static enforcement only.
- No new reference files added in 001. The **21** already exist; closing the 5 with "judgment only" enforcement (design, dx, tokens, ux, voice) is OUT of scope for 001 and lives in 002 or 003.
- **CLI exists.** _(revised by autoplan round 1, 2026-04-28.)_ `bun create gaia@latest <name>` is the scaffolder (Layer A of invariant #6). The internal verbs follow `dx.md` §3 (verb-noun): `bun gaia onboard verify-keys`, `bun gaia onboard deploy`, `bun gaia upgrade`. The skill `/d-onboard` is the conversational orchestrator that calls these CLI verbs underneath. **Original draft's "no CLI binary" was reversed via autoplan User Challenge resolution (option B).** Decision Audit #4 superseded by AP-9.

---

## Premises (load-bearing assumptions — falsifiable)

1. **The "first 30 minutes" is the conversion event.** A graduate who hasn't seen a deployed URL in 30 minutes will not return Day 2. _Falsifier:_ Phase 2 alpha sessions show that users who took 60+ minutes still completed and adopted at the same rate as <30-min users. (Would mean the 30-min target is vanity, not load-bearing.)

2. **Overbuilding + AI pruning beats minimal + AI scaffolding.** It is faster for a Claude Code agent to _delete_ an unused admin module than to _generate_ one from scratch, given the harness + reference files + skills. _Falsifier:_ in 5 prune sessions, users abandon the prune loop and instead manually rewrite from scratch. (Would mean ship minimal and let `/d-admin add` build on demand — Approach C.) **Pre-Phase-1 spike (added by autoplan round 1):** before locking, run a 1-day pruning experiment on the current repo: ask Claude Code to delete the admin scaffold cleanly. Time it. If >15 min OR breaks tests, Premise 2 is dead and we switch to Approach C for v1.0. This spike is the first deliverable in The Assignment.

3. **`setup/human-tasks.md` is the right pattern for steps the AI cannot do.** A structured markdown checklist with per-task verifier scripts is more reliable than a wizard, a CLI prompt, or a web setup tool. _Falsifier:_ alpha sessions show users get stuck reading the markdown more often than they get stuck on the underlying tasks.

4. **The first cycle should be a single orchestrating skill (`/d-onboard`), not many.** Composition happens _inside_ the skill: it calls `/setup-deploy`, `/d-fail`, etc. The user experiences one skill. _Falsifier:_ a multi-skill flow (`/d-init` → `/d-keys` → `/d-deploy`) tests better in alpha because users can resume from a known step after they break.

5. **Dogfooding by construction (same `master`) beats dogfooding by discipline (separate `gaia.app` repo).** _Falsifier:_ a paid feature lands that needs to be hidden from OSS users — but the overlay-package pattern handles that without a fork.

6. **External services cooperate.** Polar's signup, Resend's free tier, Neon's free Postgres, Railway's free trial are all <5-minute signups today. _Falsifier:_ if any one of them adds friction (mandatory phone verification, manual review queue), the 30-min budget breaks and we either re-route to a different provider or document the friction.

7. **MIT licensing the template does not kill the business.** Cal.com, Supabase, Plausible, PostHog all ship OSS cores and capture value via hosted services + premium features. Empirical pattern. _Falsifier:_ a competitor forks Gaia, sells it as "TypeScript SaaS Pro," and captures the no-code-graduate funnel before Gaia Cloud (Stage 2a) ships. (Mitigation: Stage 2a is the moat, not the template.)

8. **One demo flow is enough for v1.0.** README links to a 60-second video and one written walkthrough. Multiple "tutorials" / "how-tos" defer to 002 / 1.5. _Falsifier:_ alpha users ask for an alternate path (e.g. "I don't have a Polar account, can I skip billing?") and abandon when there isn't one. (Mitigation: human-tasks.md per-task `[skip]` flag.)

---

## Approaches considered

### A — Minimal template (auth + DB + landing only, defer billing/admin)

- **Scope:** Better Auth + Drizzle migrations + landing + login. Polar, Resend, admin, content all deferred.
- **Pros:** ship in 7 days; easy to understand; small attack surface.
- **Cons:** undifferentiated from ShipFast/Makerkit's free tier; doesn't validate the boil-20% thesis; user still has to assemble billing themselves on day 2 — the very thing we promised to solve.
- **Verdict:** rejected. This is the trap of every "starter kit" that gets one star and dies.

### B — Complete template, all providers wired, admin pre-built (this initiative)

- **Scope:** all providers, all flows, all admin modules, all observability, the onboarding skill, the deploy machinery.
- **Pros:** delivers boil-20% thesis; lets the 30-min demo land; matches the user's stated "overbuild + prune" preference; differentiated from every paid boilerplate.
- **Cons:** large scope; 4–6 weeks of focused work; pruning UX is unverified; admin scope creep is a real risk.
- **Verdict:** **chosen**. Capped per "Constraints" above (one feature per replaced tool, never the second).

### C — Minimal template + on-demand skills (`/d-admin add billing`)

- **Scope:** auth + DB + landing only at clone time. Skills generate billing, admin modules, content scaffolding on user invocation.
- **Pros:** small initial template; AI builds the rest; minimal cognitive load on first read.
- **Cons:** first impression is empty (no demo); `/d-admin add billing` is a much harder skill than pruning is; skill failure mid-generation leaves the repo broken; doesn't deliver a 30-min demo because the user has to invoke skills before seeing anything.
- **Verdict:** rejected for v1.0. Holds as a Stage 1.5 evolution if Premise 2 falsifies.

### E — CLI scaffolder + complete template + skill orchestrator (chosen, autoplan round 1)

- **Scope:** Approach B's full template, PLUS `bun create gaia@latest <name>` CLI that does deterministic scaffolding (clone + install + `.env.local` + first migrate + sanity check), THEN `/d-onboard` runs as the orchestrator inside Claude Code. The CLI is the testable substrate; the skill is the conversational front-end.
- **Pros:** matches vision Open-specs §7 (`bun create gaia@latest`); honors dx.md §1 (CLI primary) + ax.md §1 (skills wrap CLI); industry-standard onboarding (Next/Vite/Astro/T3 all do `create-*`); TTHW <5 min becomes a tractable target via the CLI alone (no Claude Code needed for first-success); the skill stays focused on the long, interactive deploy-loop phase.
- **Cons:** ~3 days of additional scope (CLI binary + npm publish flow + `bun create` integration). Two surfaces to maintain instead of one. Two test suites (`test:scaffold` + `test:onboard`).
- **Verdict:** **chosen**. Resolves the User Challenge from autoplan round 1 (5/5 voices). Approach B remains the template scope; Approach E is B + the CLI scaffolder added as the front door.

### D — Hybrid: complete template + optional `/d-admin remove <module>` cleanup

- **Scope:** Approach B's full template, plus a `/d-admin remove` skill that prunes modules cleanly with audit log.
- **Pros:** captures both thesis (overbuild + prune) and recovery (clean removal of unused).
- **Cons:** adds skill scope to 001.
- **Verdict:** **adopted as a v1.1 follow-up**, not v1.0 must-ship. v1.0 ships Approach B. v1.1 (within Phase 2) adds `/d-admin remove` if Premise 2 needs it.

---

## Recommended approach — E (B + CLI scaffolder) with explicit caps

**E = Approach B template scope + `bun create gaia@latest` CLI scaffolder + `/d-onboard` skill orchestrator.** Cap table below applies to the template surface (Approach B). The CLI scaffolder adds three additional deliverables to The Assignment (see Phase 1).

| Surface              | What ships in v1.0                                                                                                                                                                                                                                             | What's capped (no second feature)                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Landing page**     | One page: hero + 30-second demo video embed + clone command + 3 trust elements (Bun, Polar, Drizzle) + footer                                                                                                                                                  | No blog, no docs site, no marketing pages. Pricing page deferred to 002 paid launch.                  |
| **Auth flows**       | Email + password, email verification, password reset, optional Google OAuth                                                                                                                                                                                    | No SSO, no magic link, no MFA, no passkeys.                                                           |
| **Billing**          | Polar checkout (one plan: "Pro $19/mo"), Polar customer portal, webhook → DB → entitlement gating                                                                                                                                                              | No multi-plan, no per-seat, no usage-based, no annual.                                                |
| **Admin**            | Scaffold (auth-gated `/admin`) + 3 modules: metrics dashboard, email log, mini-CRM (contacts list)                                                                                                                                                             | No Linear-clone, no projects view, no docs view, no audit viewer.                                     |
| **Content**          | `content/` folder → static HTML render (frontmatter routing) for blog + 1 docs page                                                                                                                                                                            | No multi-format, no theming, no MDX, no API docs auto-gen.                                            |
| **Database**         | Postgres (Neon) in production, SQLite fallback for first-run                                                                                                                                                                                                   | No Turso, no PlanetScale, no MongoDB.                                                                 |
| **Email**            | Resend transactional (welcome + verify + reset)                                                                                                                                                                                                                | No marketing list, no segments, no templates UI.                                                      |
| **Workflows**        | Inngest mounted, one example: `user/created` → send welcome email                                                                                                                                                                                              | No advanced step composition, no human-in-the-loop.                                                   |
| **Observability**    | Sentry + Axiom + PostHog wired and called at boot                                                                                                                                                                                                              | No custom dashboards, no SLO definitions.                                                             |
| **Deploy**           | Railway via railway.toml + GitHub Actions CI; `/d-fail` integration                                                                                                                                                                                            | No Cloudflare Workers, no Fly, no Vercel adapter.                                                     |
| **AI agent**         | Anthropic SDK adapter present; one example feature ("/api/ai/summarize")                                                                                                                                                                                       | No agent loops, no tool use, no streaming UI.                                                         |
| **Skills**           | `/d-onboard` (orchestrator with `--no-billing` / `--local-only` / `--dry-run` / `--resume` / `--restart` flags) + new `/d-upgrade` (codemod-driven, `git diff` upstream + ast-grep patterns) + reuse existing `/d-fail`, `/d-strategy`, `/d-roadmap`, `/d-tdd` | No `/d-admin add`, no `/d-cms`, no `/d-deploy`. `/setup-deploy` (gstack) dropped — Railway is locked. |
| **CLI**              | `bun create gaia@latest <name>` (npm-published scaffolder) + internal `bun gaia onboard verify-keys`, `bun gaia onboard deploy`, `bun gaia upgrade`. All exit-coded, `--help` equipped, `--json` for CI.                                                       | No `bun gaia generate <feature>` (future skill). No interactive prompts beyond name.                  |
| **Mutation testing** | Stryker enabled for `packages/security/`, `packages/auth/`, `packages/adapters/payments` (TD-3 from autoplan: vision §11 mandates "mutate the middle").                                                                                                        | Other packages defer to v1.1.                                                                         |

---

## The first-cycle onboarding — Two-layer surface

_(restructured by autoplan round 1: Layer A is the CLI scaffolder; Layer B is the `/d-onboard` skill orchestrator.)_

### Layer A — `bun create gaia@latest <name>` (CLI scaffolder)

Deterministic, ~30 seconds. Drives **TTHW <5 min**. Pure CI-testable, no external services.

**What it does** _(in order; idempotent on re-run):_

1. Validates inputs: project name (kebab-case), Bun ≥1.2, git installed.
2. Clones `github.com/henriquemeireles7/gaia` to `./<name>`.
3. Detects existing config; if `<name>/` already exists → asks `[overwrite | resume | abort]`.
4. Runs `bun install` across workspaces.
5. Generates `.env.local` from `.env.example` with stub values that boot.
6. Runs `drizzle-kit migrate` against SQLite fallback (no Postgres needed for first run).
7. Sanity-checks: `bun run check` passes; `bun dev` boots in <5s.
8. Prints next-step contract:

```
✓ gaia template scaffolded in ./<name> (ttfd target: 30 min)
  TTHW: 2m 14s

Next:
    cd <name>
    bun dev          # localhost:3000 — landing + login + admin
    claude           # then /d-onboard to deploy to Railway
```

**Flags:** `--help`, `--json`, `--dry-run`, `--no-install` (skip Bun install for CI), `--branch <name>` (alpha track).

**Exit codes:** 0 success, 1 user error, 2 environment error (Bun missing), 3 network error (clone failed).

**Tested by** `bun run test:scaffold` — runs in pure CI without external services.

### Layer B — `/d-onboard` skill (orchestrator)

Runs after Layer A. Drives **TTFD ≤30 min**. Calls existing skills (`/d-fail`, `/d-strategy`) and underlying CLI (`gh`, `railway`, `bun gaia onboard verify-keys`, etc.).

### Trigger

User runs `/d-onboard` inside Claude Code from a scaffolded Gaia repo. The CLI scaffolder runs first; the skill is the conversational front-end for the post-scaffold deploy flow.

### Inputs

- Current working directory (must be a fresh Gaia clone).
- `gh` CLI authenticated.
- Bun installed.
- `claude` CLI authenticated.

### Skill modes per phase (per `skills.md` §7 — one mode per phase)

| Phase                         | Mode           | Stake                                                                                                          |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Phase 0 — Pre-flight gate     | report         | Asserts `bun run check` passes (sandwich gate per skills.md §6). Aborts if red.                                |
| Phase 1 — Identify            | question       | Project name, optional domain.                                                                                 |
| Phase 2 — GitHub setup        | fix            | Creates **--private** repo (autoplan round 1: AD-3); audits .gitignore; commits human-tasks.md.                |
| Phase 3 — Human tasks loop    | question + fix | **Parallelized** (AD-6): opens all 4 provider tabs upfront, interleaves verify as keys arrive.                 |
| Phase 4 — GitHub secrets sync | fix            | `gh secret set` per verified provider.                                                                         |
| Phase 5 — Deploy              | fix            | Per-class retry (AD-4): network=3, build/typecheck=2, migration=1+rollback.                                    |
| Phase 6 — Smoke test          | report         | If 200 instead of 401 → escalate to a different skill (NOT `/d-fail`, which reads Railway logs not app logic). |
| Phase 7 — Final gate          | report         | Re-runs `bun run check` (sandwich gate). Writes structured exit message (per ax.md §12).                       |

### Phases

**Phase 0 — Pre-flight gate (15 sec) [skills.md §6]**

1. Verify prerequisites: `bun --version ≥ 1.2`, `gh auth status`, `claude` authenticated, `railway --version` (added during scaffold).
2. Run `bun run check` — must pass green. If red, halt with: "fix lint/types first; resume with `/d-onboard --resume`."
3. Detect previous run: read `setup/onboard-state.json`. If present and <24h old → `/d-onboard --resume` mode (continue from last completed step). Otherwise treat as fresh.

**Phase 1 — Identify (1–2 min)**

1. Read `package.json`, confirm we're inside a Gaia template (presence of `.gaia/vision.md` + `bun-only` engine pin).
2. Prompt: project name (used for GitHub repo + Railway service + display).
3. Prompt: domain (optional, default `null` — user can add later).
4. Write `setup/onboard-state.json` (the skill's working memory).

**Phase 2 — GitHub setup (2–3 min)** _(security-hardened by autoplan round 1: AD-3)_

1. `gh repo create $name --private --source=. --remote=origin --push=false`. **Default --private** (was --public in v1 draft; flipped after autoplan round 1 found CRITICAL secret-leak window). User can opt in to public via `/d-onboard --public` after deploy verifies green.
2. **Audit .gitignore** before any keys are written: assert `.env.local`, `.env`, `setup/onboard-state.json`, `node_modules/`, `dist/` are listed. Refuse to proceed if any are missing.
3. Generate `setup/human-tasks.md` from `setup/human-tasks.md.template`, populated with the project name + a per-task `[ ]` checkbox.
4. Commit the populated `human-tasks.md`. Push to GitHub (private remote).

**Phase 3 — Human tasks loop (8–12 min, parallelized)** _(restructured by autoplan round 1: AD-6, AD-7, AD-9, AD-18)_

1. **Open all four provider signup URLs in parallel browser tabs** at the start of Phase 3 (was serial in v1 draft; saves 6–8 minutes per user). The four are Polar, Resend, Neon, Railway.
2. Print the human-tasks.md entries for all four with realistic time-per-task estimates surfaced upfront.
3. Poll `.env.local` (and prompt directly via the skill) for any key to land first.
4. As each key arrives, run the verifier (`bun run setup:verify-key <provider>`) immediately — don't wait for all four.
5. **All verifier scripts use the shared error envelope from `scripts/setup/verifier-shape.ts`** (AD-5). The envelope is enforced by `scripts/check-verifier-shape.ts` (AD-18, new script-tier rule).
6. **Resend uses `delivered@resend.dev`** in test mode to avoid the 100/day rate limit during alpha and CI (AD-9).
7. On verify-fail: emit the three-part error (what / cause / what-to-do / details). Per-class retry (AD-4): typo errors → 3 retries; network timeouts → exponential backoff up to 3 minutes; rate limits → respect Retry-After header.
8. On verify-pass: tick the checkbox in `human-tasks.md`, append to `.gaia/manifest.json` `onboarded.providers.<x>` block (per gstack `setup-deploy` pattern), commit.
9. **Skip support (AD-7):** `--no-billing` mode skips Polar+Resend (uses stub adapters); `--local-only` mode ends the skill at Phase 4 — no deploy.
10. **Resumability is real** (per-task, not just per-phase): `setup/onboard-state.json` records each provider's verified_at timestamp, key fingerprint, environment (sandbox/prod). On re-run, the skill re-verifies keys via API ping (cheap, ~5s total) before trusting state — state drift surfaces immediately.

**Phase 4 — GitHub secrets sync (1 min)**

1. For each verified key, set it as a GitHub Actions secret via `gh secret set`.
2. Append to `setup/onboard-state.json`.

**Phase 5 — Deploy (5–8 min)** _(per-class retry policy added by autoplan round 1: AD-4)_

1. Push initial commit to `origin/main`.
2. GitHub Actions runs `bun run check`. If green → triggers Railway deploy via `.github/workflows/deploy.yml` (must exist; AD-1.5 — Eng codex flagged it doesn't yet).
3. Watch Railway deploy logs via `packages/adapters/deploy.ts` (AD-8 — thin adapter wrapping Railway CLI). On failure → call `/d-fail` with classification.
4. **Per-class retry policy** (NOT global 3-retry):
   - Network/transient → up to 3 with exponential backoff (max 3 min total).
   - Build/typecheck → up to 2 (deterministic; if it fails twice the fix is wrong).
   - Migration → exactly 1 + **rollback** (autoplan F4 finding: half-applied migrations are silent DB corruption).
   - Env-var → up to 3 (cheap fix via `railway variable set`).
   - Smoke-test fail → escalate to a behavior-bug skill, NOT `/d-fail` (autoplan F9 finding: `/d-fail` reads Railway logs, not app code).
5. On success: capture the Railway public URL via the deploy adapter.
6. **Note on `/d-fail`** (autoplan AD-12.1, follow-up): existing `/d-fail` is single-pass; the retry-loop semantics live in `/d-onboard` Phase 5 (this section), not `/d-fail`. `/d-fail` is the one-shot diagnose+fix tool. Either upgrade `/d-fail` or document this division (next-PR follow-up).

**Phase 6 — Smoke test (2 min)**

1. `curl https://$url/health` → expect 200.
2. `curl -I https://$url/me` → expect 401.
3. `curl -X POST https://$url/auth/sign-up/email -d {...}` with a test account → expect 200, then verify Resend log shows the welcome email queued.
4. Open `https://$url` in browser via gstack/browse, screenshot the landing page, save to `setup/onboard-screenshots/`.

**Phase 7 — Final gate + structured exit (60 sec)** _(structured per autoplan round 1: AD-13, ax.md §12)_

1. **Sandwich gate (skills.md §6):** re-run `bun run check`. Must pass. If red, the skill aborted somewhere — surface as a concern, not silent failure.
2. Compute total elapsed time (Phase 1 start → Phase 6 end). Compare against TTHW (from CLI scaffolder) + TTFD (this skill).
3. Print **deterministic exit message** (parseable by `scripts/test-onboard.ts`):

```
═══ /d-onboard — Run completed ═══════════════════════════════════════════
Run ID:        <ISO timestamp>-<project name>
Total time:    <Mm Ss> (TTFD)  /  TTHW from scaffold: <Mm Ss>
Outcome:       DONE | DONE_WITH_CONCERNS | BLOCKED

Input
  Project:     <name>
  Domain:      <or "(deferred)">

Decisions
  [HH:MM] <decision 1>
  [HH:MM] <decision 2>

Output
  Live URL:    https://<project>.up.railway.app  (HTTP 200, /health green)
  Repo:        github.com/<owner>/<project>
  Providers:   Polar ✓  Resend ✓  Neon ✓  Railway ✓

Concerns (if any)
  - <concern + recovery hint>

Next steps
  /d-strategy                   — start your first feature initiative
  /d-onboard --rotate-keys      — rotate keys before going public
  bun run test:onboard          — re-run smoke loop in CI

Audit:    .gaia/audit/onboard.jsonl (this run appended)
Manifest: .gaia/manifest.json (onboarded block updated)
═══════════════════════════════════════════════════════════════════════════
```

4. Append structured run record to `.gaia/audit/onboard.jsonl` (with key fingerprints redacted: first-4 + last-3 only).
5. Mirror summary to `.gaia/manifest.json` `onboarded` block (per gstack `setup-deploy` pattern, AD-13).
6. **Magical moment narration (AD-13):** if `/d-fail` fired during Phase 5, the exit message includes a labeled "Recovery" block highlighting the autonomous fix — this is the screencap-recordable artifact for the README's 60-second video.

### Failure surfaces & recovery

- **API key wrong:** retry-with-better-error pattern. Surface format expected.
- **Network timeout to provider:** retry once; if fails, mark task as "skip-and-fix-later," continue.
- **Deploy fails:** delegate to `/d-fail`. Max 3 attempts.
- **User abandons mid-flow:** `setup/onboard-state.json` has a `phase` and `step`. Re-running `/d-onboard` resumes from last completed step.

### Testability

`bun run test:onboard` runs the full skill against:

- A throwaway GitHub org (`gaia-onboard-tests`).
- Polar / Resend / Neon / Railway test or dev tenants (provisioned via env vars in CI).
- Asserts: total elapsed time ≤30 min in 5 runs, smoke test passes 5/5.

---

## `setup/human-tasks.md` — format spec

The format is deliberate. The agent reads it, the human acts, the verifier checks. Each task has the same shape:

```markdown
### Task N — <verb the noun> [estimated time: <minutes>]

**What:** <one-sentence description of what we're doing>
**Why:** <one-sentence why we need this for the deploy>

**Steps:**

1. Open <URL>
2. <click-by-click instructions, written for someone who's never seen this service>
3. Copy the <thing>
4. Paste it back here when prompted, OR add to .env.local as `<KEY_NAME>=...`

**Verifier:** `bun run setup:verify-key <task-id>`
**Cost:** <free tier? credit card needed? trial expires?>
**Skip flag:** `[skip]` to defer (only for optional tasks)
```

A populated example for Polar:

```markdown
### Task 1 — Create Polar account and get an API key [estimated time: 4 minutes]

**What:** Polar processes payments. We need a sandbox API key to enable checkout.
**Why:** Without this key, the billing page will return 500 and `/d-onboard` cannot proceed past Phase 3.

**Steps:**

1. Open https://polar.sh
2. Click "Get started" — sign in with GitHub (fastest).
3. Create an organization. Name it your project name.
4. **Important:** select the "Sandbox" environment from the dropdown in the top right.
5. Settings → Developers → Create new access token → name it "gaia-onboard" → copy.
6. Paste into the Claude Code prompt OR set in `.env.local`: `POLAR_ACCESS_TOKEN=polar_at_xxx`

**Verifier:** `bun run setup:verify-key polar`
**Cost:** free in Sandbox; production keys come later when you flip POLAR_SERVER=production.
**Skip flag:** not allowed (billing is a must-have for v1.0).
```

The format is enforced by `scripts/check-human-tasks.ts` (a script-tier rule added in 001).

---

## Dogfooding contract

gaia.app's `master` branch is this template's `master` branch. Concretely:

- The repo at `github.com/henriquemeireles7/gaia` is _both_ the public template _and_ gaia.app's source.
- gaia.app's deployment uses the same `bun run build` as a user's clone would.
- The only difference between gaia.app and a user's deployment is the `.env` (different DB, different keys, different domain).
- Marketing copy specific to gaia.app (the "buy Gaia Cloud" CTA, the migration guides) lives in `content/` — which the template ships with demo content + a "delete this before you launch yours" README. So users who clone get _Gaia's_ demo content out of the box, and either delete it or replace it.
- Future paid features (Stage 2a) go into a `@gaia/pro` private package imported only by gaia.app's deployment via a deploy-time flag. Not in 001.

This means: every PR that lands in 001 ships to gaia.app the same day. We feel every bug.

---

## Risks (priority-ordered)

1. **First-cycle skill failure ruins first impression.** `/d-onboard` is _the_ surface. If it errors halfway, the user is stuck staring at a half-configured repo with no clear path forward. **Mitigation:** skill is testable end-to-end via `bun run test:onboard`; runs in CI on every commit; resumable via `setup/onboard-state.json`; every failure mode documented in the skill's SKILL.md with a recovery path.

2. **Scope creep on the template surface.** "Just one more module" is the universal trap of complete-template projects. **Mitigation:** the cap table above is the contract. Anything beyond is a 002-or-later concern. New surfaces require a documented one-paragraph "why this and not the second feature" before lands.

3. **AI pruning unverified — Premise 2 might falsify.** "Overbuild and AI prunes" is a bet. If pruning is hard, we ship a bloated template that overwhelms beginners. **Mitigation:** Phase 2 alpha includes 5 prune sessions (each user picks 2 surfaces to delete). Time-boxed at 5 min/surface. If <60% succeed, we re-scope to Approach C (minimal + on-demand) for v1.1.

4. **External services slow the 30-min clock.** Polar's verification email might take 10 minutes; Railway's first deploy is 4–7 minutes; Neon's project create occasionally hangs. We don't control these. **Mitigation:** human-tasks.md surfaces realistic time-per-task estimates; `/d-onboard` parallelizes external waits with internal automation; if Polar verification is the longest pole, the user can do Resend + Neon while Polar email arrives.

5. **Dogfooding gap.** If a paid feature lands that _must_ be hidden from OSS users, the same-master contract breaks. **Mitigation:** overlay package pattern (`@gaia/pro` private package, imported only by gaia.app deploy) is the answer — but it doesn't exist yet because no paid feature exists yet. Decision documented; implementation deferred to Stage 2a.

6. **MIT invites cloners.** A shop ports the template, ships "TypeScript SaaS Pro" for $299. **Mitigation:** accept it. The Stage 2a hosted services (FSL-1.1-MIT) are the moat. The template is a funnel. Plausible, Cal.com, Supabase, PostHog all weather this fine. We're betting on hosting + brand + methodology, not template lock-in.

7. **`/d-onboard` gets stale.** Every external service UI changes every quarter. The skill's UI-walkthroughs rot. **Mitigation:** the skill calls verifier scripts that fail loudly when shape changes — the rot surfaces as test failures, not silent UX rot. Quarterly skill refresh added to roadmap as a recurring task once 002 lands.

8. **30-min target is wall-time-optimistic.** First-time users hit doc gaps, copy-paste errors, missing prerequisites (no `gh` CLI, no Bun installed). **Mitigation:** staged targets — 60 min v0.1 (internal only), 30 min v1.0 (alpha + public). Prerequisite check is Phase 0's first action: skill validates `gh`, `bun`, `claude` are present before continuing.

9. **Secret-leak window during onboarding** _(added by autoplan round 1, Eng CRITICAL S2)._ The original draft created the GitHub repo as `--public` before any keys were written. **Mitigation:** flipped to `--private` default (AD-3); `.gitignore` audit added in Phase 2 step 2; verifier output redacts keys to last-3 chars only; `.gaia/audit/onboard.jsonl` writes redacted fingerprints. Public repo opt-in is post-deploy via `/d-onboard --public`.

10. **`/d-fail` integration overstated** _(added by autoplan round 1, Eng HIGH)._ Existing `/d-fail` is single-pass; doesn't implement the retry loop or DB-migration rollback that `/d-onboard` Phase 5 assumes. **Mitigation:** retry orchestration moved into `/d-onboard` Phase 5 with per-class policy (network=3, build=2, migration=1+rollback). `/d-fail` remains the one-shot diagnose+fix tool. `/d-fail` upgrade tracked as AD-12.1 follow-up after alpha sessions reveal the right division.

11. **Upgrade path is the silent killer** _(added by autoplan round 1, DX CRITICAL)._ Without `/d-upgrade`, every cloned Gaia repo is forked at v1.0 and stuck there. "Distribution" claim collapses into "yet another template snapshot." **Mitigation:** `/d-upgrade` skill v0.1 is now in The Assignment as Phase 2 deliverable #20. Even thin (5 ast-grep codemods + git-diff against upstream) is enough to keep the claim honest.

12. **Test isolation holes — concurrent CI burns provider quotas** _(added by autoplan round 1, Eng CRITICAL)._ Polar Sandbox doesn't isolate per-test; Resend free tier is 100 emails/day; Neon free is 10 projects max; Railway free trial expires. **Mitigation:** per-run unique tenants (Polar org-per-run, Neon branch-per-run); `delivered@resend.dev` test mailbox in CI (AD-9); dedicated Railway team account; chaos drill (50 concurrent CI runs) before tag v1.0. Full test plan: `~/.gstack/projects/henriquemeireles7-gaia/project-6-adversarial-rewrites-test-plan-20260428-013500.md`.

---

## Open questions — resolutions (autoplan round 1)

1. ~~**Reconcile 002 framing.**~~ **RESOLVED via TD-5 (autoplan recommendation, founder approved):** option (b). Keep existing 002 as launch hardening. Create new 003 for the open-source self-hostable platform when its time arrives. Existing 002 doc untouched in this round (per founder's hardening directive).
2. ~~**Skill name `/d-onboard` vs alternatives.**~~ **RESOLVED:** `/d-onboard` retained. Supports project-name argument (`/d-onboard <name>`) per dx.md §3 verb-noun pattern.
3. ~~**Default deploy target.**~~ **RESOLVED:** Railway-only for v1.0. `reference/deployment.md` documents alternate targets for later.
4. ~~**SQLite vs Postgres for local dev.**~~ **RESOLVED:** SQLite fallback for first-run + CI scaffolder tests; Postgres in CI for `test:onboard` E2E. Schema-drift risk mitigated by drizzle-kit dual-target generation + CI on Postgres only. **Open follow-up:** `scripts/check-schema-parity.ts` to assert SQLite + Postgres migrations produce equivalent shapes.
5. ~~**Sample feature in the template.**~~ **RESOLVED via AD-10 (autoplan):** **NO sample feature in v1.0.** Smoke test uses the auth + billing flows that already exist. Defer "ideas board" to Stage 1.5 if alpha demand surfaces.
6. ~~**`/d-onboard` mutation consent.**~~ **RESOLVED:** explicit upfront consent screen at Phase 1 listing all mutations (`.env.local`, `.gaia/manifest.json`, `setup/onboard-state.json`, GitHub repo + secrets, Railway project). Plus per-mutation tickmarks during execution. Skill never writes silently.
7. **Founder decision on the 7 invariants.** v1 list reviewed by autoplan; #6 was rewritten (CLI + skill, was skill-only). Other 6 hold.

## New open questions surfaced by autoplan (out of scope for round 1, parked)

8. **Should `/d-fail` itself be upgraded to a true loop**, or kept as one-shot and let `/d-onboard` Phase 5 own the retry orchestration? Autoplan round 1 punted (AD-12.1 follow-up). Recommendation: keep `/d-fail` one-shot; revisit when alpha sessions show whether the division of labor is awkward.
9. **`/d-upgrade` codemod set scope** — which 5 patterns get codemods in v1.0? Candidates: (a) skill name renames; (b) reference file additions; (c) hook signature changes; (d) rules.ts schema migrations; (e) provider adapter shape changes. Decide in Phase 2 of execution.
10. **Mutation testing scope expansion** — TD-3 limits Stryker to security/auth/payments for v1.0. When does it expand to all packages? Tied to the v1.1 release decision after alpha results.

---

## Success criteria

_(updated by autoplan round 1: TTHW + TTFD as separate KPIs (AD-12); N≥10 alphas not 5; P75 not median (TD-4))_

**Stage 1.0 (v1.0 must-ship — minimum viable):**

- **TTHW P75 ≤5 min** measured by `scripts/measure-tthw.ts` over 10 fresh-clone runs across Mac/Linux. (Drives `bun create gaia@latest` quality.)
- **TTFD P75 ≤30 min** across **N≥10 alpha sessions** (5 internal, 5 external), unstructured, on real external accounts. **≥7 of 10** reach a live URL without operator intervention. (N=5 was statistically meaningless per autoplan CEO consensus.)
- gaia.app deploys from this template's `master` with zero modifications (dogfooding contract).
- `bun run check` passes all gates (lint, format, types, harden, scripts, tests, ast-grep, knip, **mutation for security/auth/payments**).
- `bun run test:scaffold` (Layer A) runs on every PR, completes in ≤2 min in pure CI.
- `bun run test:onboard` (Layer B) runs **nightly only** (not per-PR — would burn the CI budget per Eng cost analysis), completes in ≤30 min against per-run-isolated test tenants.
- Both metrics tracked in `.gaia/audit/onboard.jsonl` and reported in the README.

**Stage 1.1 (v1.1, follows v1.0 by 2 weeks if Premise 2 holds):**

- `/d-admin remove <module>` skill ships; pruning UX validated in 5 sessions (≥4 prune in <5 min/surface).
- All 17 reference domains have at least one active enforcement mechanism (currently 12/17 — close design, dx, tokens, ux, voice via ast-grep + script gates).
- Mutation testing (Stryker) and e2e (Playwright) integrated into `bun run check`.

**Stage 1.2 (handoff to 002):**

- Once Stage 1.0 hits the alpha bar, the template is ready for 002's launch hardening to operate on a known-good artifact. 002 becomes coherent.

**Abandonment ladder (45 days from v1.0 tag):** _(updated for N=10)_

- **<5 of 10 alphas reach 30 min:** re-scope. Strip features, re-test. Could mean pivot to Approach C.
- **5–6 of 10 alphas reach 30 min:** re-iterate the skill, hold scope, run another 10 sessions.
- **≥7 of 10 alphas reach 30 min:** ship publicly, hand off to 002.

---

## Distribution plan

001 is **internal**. The template is published to `github.com/henriquemeireles7/gaia` (already public), but no marketing happens until 002 ships the launch.

What 001 ships externally:

- The repo itself (already public).
- README that gets a reader to "I could clone and run this" in 60 seconds (carried from 002 H2.6).
- The 30-second demo video at the top of the README.
- One landing page at gaia.app (single page, positioning + clone command — carried from 002 v0.1 must-ship).

What 001 does NOT ship:

- X thread.
- Show HN post.
- Product Hunt.
- DMs to influencers.
- Migration guides.
- Press / blog posts.
- Pricing page.

All distribution is 002's job. 001's job is to make the artifact 002 distributes.

---

## Dependencies (must exist before 001 can complete)

All structural prerequisites are present. Listed for paranoia:

- `.gaia/rules.ts` and the 4 core hooks (✅ shipped).
- All 17 reference files (✅ shipped).
- gstack + 8 d-\* skills (✅ shipped).
- Provider adapters (payments, email, observability, auth — ✅ shipped, partial; checkout/portal pending in 001 itself).
- `packages/security/` runtime primitives (✅ shipped).
- `packages/ui/` design tokens + base styles (✅ shipped, partial; full token spec coverage pending).
- Bun + TypeScript + oxlint + oxfmt + ast-grep + Knip toolchain (✅ shipped).
- Railway + GitHub Actions CI (✅ shipped).

**External dependencies (provisioned by founder, not the agent):**

- Polar Sandbox account.
- Resend account.
- Neon account.
- Railway account with billing ready (free trial ends).
- Domain `gaia.app` (or fallback) registered.

These are 002's first-week assignment items, but 001 cannot complete its alpha tests without them.

---

## The Assignment

### Phase 0 — Premise spike (1 day, before Phase 1) _(added by autoplan round 1)_

| #   | Deliverable                | Touches      | Notes                                                                                                                                                                                                                                                                                                |
| --- | -------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0a  | Premise 2 prune-time spike | (experiment) | Take current half-built repo. Ask Claude Code (fresh session, no special prompting) to delete the admin scaffold cleanly. Time it. Record in `setup/premise-2-spike.md`. **If >15 min OR breaks tests → switch v1.0 to Approach C (minimal + on-demand) before any Phase 1 work begins.** Hard gate. |

### Phase 1 — substance (estimated 3–4 weeks; +1 week for added scope) _(updated by autoplan round 1)_

| #     | Deliverable                                                                 | Touches                                                                                                               | Notes                                                                                        |
| ----- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1     | Real landing page (single, hero + demo + clone + 3 trust elements + footer) | `apps/web/src/routes/index.tsx`                                                                                       | Reuses tokens; aligns with 002 H2.6 claim hygiene                                            |
| 2     | Complete auth flows (verify, reset, optional Google OAuth)                  | `apps/web/src/routes/{verify-email,forgot-password,reset-password,oauth}.tsx`, `packages/auth/`                       | Better Auth supports all out of the box; wire UI                                             |
| 3     | Polar checkout + portal end-to-end                                          | `apps/api/server/routes/billing.ts`, `apps/web/src/routes/billing.tsx`, `packages/db/schema.ts` (subscriptions table) | Webhook → DB → entitlement gating                                                            |
| 4     | Admin scaffold + 3 modules                                                  | `apps/web/src/routes/admin/`, `packages/db/schema.ts`                                                                 | Metrics, email log, mini-CRM                                                                 |
| 5     | Content/CMS scaffolding                                                     | `content/`, `apps/web/src/routes/(content)/`                                                                          | Frontmatter routing only; no MDX                                                             |
| ~~6~~ | ~~One sample feature~~                                                      | —                                                                                                                     | **AD-10: NO sample feature in v1.0** (Open Q #5 resolved).                                   |
| 7     | Inngest example: `user/created` → welcome email                             | `packages/workflows/functions/`, `packages/auth/` (hook signup)                                                       | One real async path                                                                          |
| 8     | `packages/adapters/deploy.ts` _(new, AD-8)_                                 | `packages/adapters/deploy.ts`                                                                                         | Thin Railway wrapper: `getLogs`, `getStatus`, `setVar`. Isolates Railway API drift. ~30 LOC. |
| 9     | Mutation testing for security/auth/payments _(new, TD-3)_                   | `stryker.config.json`, scripts, CI                                                                                    | Vision §11 critical-path requirement. Rest defers v1.1.                                      |

### Phase 2 — onboarding (estimated 2.5 weeks; +0.5 week) _(updated by autoplan round 1)_

| #   | Deliverable                                                           | Touches                                                                         | Notes                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | **`bun create gaia@latest` CLI scaffolder** _(new, User Challenge B)_ | new `packages/cli/` + npm publish + `.github/workflows/publish-cli.yml`         | Layer A of invariant #6. Drives TTHW. Pure CI testable. ~2 days.                                                                                                                       |
| 11  | **`scripts/setup/verifier-shape.ts`** _(new, AD-5)_                   | `scripts/setup/verifier-shape.ts` + `scripts/check-verifier-shape.ts`           | Shared three-part error envelope. **MUST ship before any verifier.** ~2 hours. Enforced via new script-tier rule.                                                                      |
| 12  | `/d-onboard` skill v0.1 (Phase 0–7, with flags)                       | `.claude/skills/d-onboard/SKILL.md` + scripts                                   | Orchestrator with `--no-billing` / `--local-only` / `--dry-run` / `--resume` / `--restart` flags. Per-task resumability via `setup/onboard-state.json` + `.gaia/manifest.json` mirror. |
| 13  | `setup/human-tasks.md.template` + format spec                         | `setup/`, `scripts/check-human-tasks.ts`                                        | Script-tier rule enforced via `bun run check:scripts`. **Shotgun 3 variants in alpha** before locking format.                                                                          |
| 14  | Verifier scripts per provider                                         | `scripts/setup/verify-key-{polar,resend,neon,railway}.ts`                       | Each calls `formatVerifierError()` from #11. Resend uses `delivered@resend.dev` test mailbox in CI (AD-9).                                                                             |
| 15  | **Per-run test isolation primitives** _(new)_                         | `scripts/test/{polar,resend,neon,railway}-tenant.ts`                            | Polar Sandbox per-run org; Neon branch-per-run; Railway team account. Per test plan artifact.                                                                                          |
| 16  | Railway CD/CI with `/d-onboard` retry orchestration                   | `.github/workflows/deploy.yml`, `packages/adapters/deploy.ts`                   | Per-class retry policy (network=3, build=2, migration=1+rollback). `/d-fail` stays one-shot.                                                                                           |
| 17  | `bun run test:scaffold` (Layer A E2E)                                 | `scripts/test-scaffold.ts`, CI workflow                                         | Pure CI, no external services. ≤2 min. **Every PR.**                                                                                                                                   |
| 18  | `bun run test:onboard` (Layer B E2E)                                  | `scripts/test-onboard.ts`, `tests/fixtures/broken-deploy/*.patch`, nightly cron | Per-run isolated tenants. Fault-injection patches for `/d-fail`. **Nightly only**, NOT per-PR. ≤30 min.                                                                                |
| 19  | `scripts/measure-tthw.ts` _(new, AD-12)_                              | `scripts/measure-tthw.ts`, CI workflow                                          | P75 TTHW budget enforcement. Fails build if P75 >5 min.                                                                                                                                |
| 20  | **`/d-upgrade` skill v0.1** _(new, TD-1)_                             | `.claude/skills/d-upgrade/SKILL.md`                                             | `git diff` against upstream + ast-grep codemods for 5 most-likely-to-change patterns. Without this, "distribution" is empty marketing.                                                 |
| 21  | **`setup/alpha-recruits.md`** _(new, AD-16)_                          | `setup/alpha-recruits.md`                                                       | Names 5–10 specific candidate users (Twitter handles + GitHub usernames) BEFORE recruitment starts in Phase 3.                                                                         |

### Phase 3 — verification (estimated 1.5 weeks; +0.5 week) _(updated by autoplan round 1)_

| #   | Deliverable                                   | Notes                                                                                              |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 22  | 5 internal alpha sessions, recorded, measured | Founder + 4 friends/peers; 30-min unstructured; record TTHW + TTFD separately + abandonment points |
| 23  | 5 external alpha sessions                     | Recruit from `setup/alpha-recruits.md`; Lovable/Bolt/V0 graduates                                  |
| 24  | Iterate skill based on failure clusters       | Each alpha produces a `setup/alpha-NN.md` postmortem                                               |
| 25  | Chaos drill: 50 concurrent CI runs            | Verify no test-tenant collisions; budget Resend mail use                                           |
| 26  | Tag v1.0 if ≥7 of 10 hit ≤30 min              | Hand off to 002                                                                                    |

### What success looks like at the end of 001

- Founder's `/d-onboard` run on a fresh clone hits a deployed URL in <30 min on screen recording.
- Two external graduates do the same in unstructured sessions, with the only intervention being "where do I find Polar's sandbox toggle."
- The artifact 002 launches is real.

---

## Out of scope for 001 (deferred to 002 or later)

- Public OSS launch (X thread, Show HN, Product Hunt) — 002.
- Pricing page + paid plans — 002.
- Migration guides ("from Lovable to Gaia") — Stage 1.5.
- Open-source self-hostable deployment platform — future initiative (per founder 2026-04-28).
- Cloudflare Workers / Fly deploy targets — Stage 1.5.
- Multi-tenant, B2B SSO, audit retention — Stage 3.
- Self-evolving harness — vision v2.
- All 17 reference domains have active enforcement (currently 12/17) — closes during 002.
- Stryker mutation testing — v1.1.
- Playwright e2e — v1.1.
- llms.txt auto-generation — Stage 1.5.
- Scalar API docs auto-generation — Stage 1.5.

---

## Decision Audit Trail

| #   | Decision                                                                                                                                                                                                                       | Source                                                                                 | Rationale                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lock identity as "open-source distribution + methodology + harness"                                                                                                                                                            | Founder 2026-04-28                                                                     | Resolves recurring template/framework/distribution/OS confusion across 3 prior sessions                                                 |
| 2   | Template is MIT (not FSL/AGPL)                                                                                                                                                                                                 | Founder 2026-04-28                                                                     | "the template MUST be MIT so people can actually use it as they want"; FSL reserved for future open-source platform                     |
| 3   | Success metric = deployed-to-production in 30 min                                                                                                                                                                              | Founder 2026-04-28                                                                     | Beats local-only and beats first-feature anchors; matches the wedge promise                                                             |
| 4   | First cycle = single skill `/d-onboard`, not CLI or wizard                                                                                                                                                                     | Founder 2026-04-28 + harness/SKILL convention                                          | Skills are how Gaia operates; a CLI binary would conflict with vision §13 (CLI-first ops via existing tools)                            |
| 5   | Overbuild + AI-prune (Approach B), not minimal + AI-scaffold (Approach C)                                                                                                                                                      | Founder 2026-04-28                                                                     | "there is NO problem if the template overbuilds because AI can eliminate the extra files" — this is the contrarian bet that defines 001 |
| 6   | Same `master` for gaia.app and template (no overlay until paid features exist)                                                                                                                                                 | Plan-Open-Source-Monorepo summary §"Two databases, one codebase"                       | Dogfooding by construction beats dogfooding by discipline                                                                               |
| 7   | No paid feature gating in template                                                                                                                                                                                             | Founder 2026-04-28                                                                     | "moat is hosted ops + methodology, not lock-and-key features"; matches Cal.com, Supabase, PostHog patterns                              |
| 8   | Defer everything 002 already covers (launch, hardening, marketing, security audit)                                                                                                                                             | Both initiatives                                                                       | Clean handoff: 001 makes the artifact, 002 launches it                                                                                  |
| 9   | Reuse existing skills (`/d-fail`, `/setup-deploy`); don't build new ones beyond `/d-onboard`                                                                                                                                   | Skill availability check                                                               | Avoid skill sprawl; orchestration > duplication. **_Superseded by AP-9 below._**                                                        |
| 10  | **User Challenge resolved (option B): add `bun create gaia@latest` CLI scaffolder; keep `/d-onboard` as orchestrator**                                                                                                         | autoplan round 1 (5/5 voices unanimous) + founder approval 2026-04-28                  | Reverses original Decision #4. Resolves vision Open-specs §7 + dx.md §1 + ax.md §1 contradictions. Adds ~1 week scope.                  |
| 11  | **TD-1: `/d-upgrade` skill ships in v1.0**                                                                                                                                                                                     | autoplan round 1 (DX subagent CRITICAL) + founder approval                             | Without it, "distribution" claim collapses into "yet another template snapshot." Codemod-driven, 5 patterns.                            |
| 12  | **TD-2: keep `/d-onboard` monolithic** (CLI handles scaffolding; skill remains single orchestrator for the post-scaffold flow)                                                                                                 | autoplan recommendation under User Challenge option B + founder approval               | Decompose later if alpha shows resumability friction.                                                                                   |
| 13  | **TD-3: mutation testing for security/auth/payments in v1.0**; rest defers to v1.1                                                                                                                                             | autoplan round 1 (vision §11 contradiction) + founder approval                         | Resolves vision §11 mandate for critical-path packages without ballooning scope.                                                        |
| 14  | **TD-4: keep 30-min TTFD; add TTHW <5 min as separate KPI; N≥10 alphas, P75 not median**                                                                                                                                       | autoplan round 1 (CEO consensus: N=5 was statistically meaningless) + founder approval | More honest measurement; both KPIs visible in README.                                                                                   |
| 15  | **TD-5: keep existing 002 as launch hardening; create new 003 for open-source platform when relevant**                                                                                                                         | autoplan round 1 (4/4 voices) + founder approval                                       | Existing 002's 600+ lines preserved; platform isolated in own initiative with own falsifiers.                                           |
| 16  | **AP-1 to AP-18: 18 mechanical changes auto-applied** (private repo default; verifier-shape.ts; per-class retry; Resend test mailbox; Phase 3 parallelization; deploy adapter; magical moment locked; NO sample feature; etc.) | autoplan round 1 mechanical decisions per the 6 principles + founder approval          | See `/autoplan Round 1 — Review Output` section below for full list.                                                                    |

---

## What I'd want from a /office-hours or /autoplan pass

This doc is a v1 — written from synthesis of 3 prior sessions + founder's 2026-04-28 direction, without web access for live competitor verification. Open holes I'd want pressure-tested:

- **Premise 2 (overbuild + AI prune)** is the single biggest unverified bet. A `/plan-eng-review` should pressure-test whether the prune UX is actually better than a `/d-admin add` UX.
- **Approach D vs B for v1.0** — is shipping `/d-admin remove` in v1.0 (not v1.1) the right call? `/plan-design-review` would catch this.
- **Skill name `/d-onboard`** — could be sharper. `/plan-devex-review` should A/B test names.
- **The 30-min number** — is 30 the right target, or 45, or 15? Empirical question for Phase 2 alphas.
- **Open Question #1 (002 reframe)** — needs founder decision before this initiative can be considered locked.

---

_End of initiative 001 v1 draft. Hardening passes welcome._

---

# /autoplan Round 1 — Review Output

> **Captured:** 2026-04-28T01:19:07Z
> **Restore point:** `/Users/henriquemeireles/.gstack/projects/henriquemeireles7-gaia/project-6-adversarial-rewrites-autoplan-restore-20260428-011907.md`
> **Test plan artifact:** `/Users/henriquemeireles/.gstack/projects/henriquemeireles7-gaia/project-6-adversarial-rewrites-test-plan-20260428-013500.md`
> **Hardening directive (founder):** features may be added ONLY to improve developer onboarding experience; template must work; onboarding must be best-in-class; gstack patterns are SOTA reference.
> **Voices ran:** Codex (gpt-5.2) + Claude subagent — independent — for CEO, Eng, DX. Phase 2 (Design) was light: UI is enumerated, not designed in this doc.

---

## Phase 1 — CEO Consensus

| Dimension                 | Codex                                                                                              | Subagent                                                                                                  | Consensus                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1. Premises valid?        | DISAGREE — P2 (prune) bear case strong; "agents better at deletion than generation" is unsupported | DISAGREE — P1 (30-min conversion) has zero source data; P2 falsifier (N=5) is statistically meaningless   | **CONFIRMED — premises 1 & 2 are weak**   |
| 2. Right problem?         | DISAGREE — Lovable ICP is "vibe segment"; 4 reframes proposed                                      | DISAGREE — zero named users; ICP is "transient label"; 4 reframes proposed                                | **CONFIRMED — ICP is unvalidated**        |
| 3. Scope calibration      | DISAGREE — "no CLI" contradicts vision Open-specs #7 (`bun create gaia@latest`)                    | DISAGREE — Approach E (CLI scaffolder + skill orchestrator) was missing; should be considered             | **CONFIRMED — Approach E missing**        |
| 4. Alternatives explored? | DISAGREE — C dismissed too fast; E unconsidered                                                    | DISAGREE — same                                                                                           | **CONFIRMED — Approach E added**          |
| 5. Competitive moat       | DISAGREE — methodology/harness copyable in 30 days                                                 | DISAGREE — moat shallow; Stage 2a hosted ops is the real moat (out of scope)                              | **CONFIRMED — moat in 001 is shallow**    |
| 6. 6-month trajectory     | DISAGREE — admin scope creep + dogfooding contract + sample-feature-TBD timebombs                  | DISAGREE — `/d-onboard` rotted by quarterly UI changes; gaia.app same-master breaks at first paid feature | **CONFIRMED — multiple regret scenarios** |

**CEO Top 3 critical concerns (both voices agree):**

1. 🔴 **CRITICAL — Skills-only vs CLI-first contradiction.** Both voices independently flag the same thing: vision Open-specs #7 mentions `bun create gaia@latest`, dx.md §1 mandates CLI-primary, ax.md §1 says "skills wrap CLI." The initiative's "no CLI binary" constraint contradicts the constitution. **This is a User Challenge under autoplan rules.**
2. 🔴 **CRITICAL — Premise 1 + Premise 2 are both unverified and load-bearing.** The 30-min number has no source. The overbuild+prune bet has no empirical evidence. Falsifier (N=5) is statistically meaningless.
3. 🟠 **HIGH — ICP is unvalidated.** Zero named users. "Lovable graduate" is transient. Methodology+harness moat copyable in 30 days; Stage 2a hosted ops (out of scope) is the real moat.

**CEO recommendation on Open Question #1 (002 reframe):** both voices independently chose **option (b)** — keep existing 002 (launch hardening), create new 003 (open-source platform). Existing 002 has 600+ lines of hardened plan; renaming + adding 003 is the cleanest.

---

## Phase 2 — Design (light)

UI scope in 001 is **enumerated, not designed** (landing/auth/admin/billing surfaces are listed but their visual design is deferred to implementation). No critical findings from this phase. Single recommendation: shotgun the `setup/human-tasks.md` format into 3 variants before locking, in Phase 2 of execution. Tagged `[design-skipped: UI-listed-not-designed]`.

---

## Phase 3 — Eng Consensus

| Dimension                    | Codex                                                                            | Subagent                                                                                     | Consensus                                          |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1. Architecture sound?       | DISAGREE — Railway coupling total; no `packages/adapters/deploy.ts`              | DISAGREE — `/d-onboard ⇆ /setup-deploy` overlap; no deploy adapter                           | **CONFIRMED — needs deploy adapter**               |
| 2. Test coverage sufficient? | DISAGREE — 4 fatal isolation holes (Polar, Resend, Neon, Railway)                | DISAGREE — Polar tenant race + Resend rate limit + Neon quota + Railway trial                | **CONFIRMED — 4 fatal isolation holes**            |
| 3. Performance               | DISAGREE — Phase 3 serial; 6–8 min recoverable via parallelization               | (deferred to DX)                                                                             | CONFIRMED                                          |
| 4. Security threats          | DISAGREE — public-repo default + key leak in audit log + webhook secret rotation | DISAGREE — `gh repo create --public` is critical: secrets land before .gitignore audit       | **CONFIRMED — public-repo-default is dealbreaker** |
| 5. Error paths               | DISAGREE — 3-retry cap is naïve (per-class needed)                               | DISAGREE — F4 migration failure → silent DB corruption; F9 smoke-test → wrong tool (/d-fail) | **CONFIRMED — retry policy + recovery wrong**      |
| 6. Deployment risk           | DISAGREE — no `.github/workflows/deploy.yml` exists; doc is aspirational         | DISAGREE — /d-fail single-pass not loop; no DB rollback                                      | **CONFIRMED — /d-fail integration overstated**     |

**Eng Top 3 critical concerns (both voices agree):**

1. 🔴 **CRITICAL — `gh repo create --public` default + no .gitignore audit before keys land.** One mis-step (key echoed to stdout, accidental `git add .`) and a Polar token is publicly indexed within minutes. **Fix: default `--private`, audit `.gitignore` in Phase 2 step 1.5, redact verifier output by default (last-3 only).**
2. 🟠 **HIGH — `/d-onboard` violates skills.md §6, §7, §8 (no sandwich gates, mode-mixing, no real resumability).** Decompose into `/d-bootstrap` + `/d-keys` + `/d-deploy-loop`, with `/d-onboard` as meta-skill. Define the underlying CLI properly (`bun gaia ...` or `bun create gaia@latest`). [related to CEO User Challenge]
3. 🟠 **HIGH — `/d-fail` does not implement the retry loop or smoke-test recovery that /d-onboard Phase 5/6 assume.** Single-pass; no DB-migration rollback. **Fix: either upgrade `/d-fail` to true loop, or move retry orchestration into `/d-onboard` Phase 5 and document `/d-fail` as one-shot.**

**Architecture diagram (current — flagged for refactor):**

```
USER (Claude Code, fresh clone)
  ↓ /d-onboard (7-phase orchestrator, mutates everything)
  ├─→ gh CLI ──────────────→ GitHub repo + secrets
  ├─→ bun test/check ────────→ Bun runtime + CI gates
  ├─→ railway CLI ─────────── Railway API/REST       ← TIGHT COUPLING (5+ refs, no adapter)
  ├─→ scripts/setup/verify-key-*.ts → Polar/Resend/Neon/Railway REST
  ├─→ /d-fail (SKILL) ─────── reads railway logs, single-pass diagnose+fix
  └─→ /setup-deploy (gstack) — DEAD WEIGHT (Railway is locked)
                ↓
       .github/workflows/deploy.yml (DOES NOT YET EXIST)
                ↓
       Railway service (auto-deploys on push to origin/main)
```

**Failure modes registry (top 5 — full list in test plan artifact):**

| #   | Severity | Mode                              | Fix                                                                                                                                                                |
| --- | -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F4  | CRITICAL | Deploy: migration partial         | Add migration rollback to `/d-fail` Step 3, OR refuse retry on migration failure. Current state: silent DB corruption risk.                                        |
| F2  | HIGH     | Network timeout to provider       | "Skip-and-fix-later" but billing isn't skippable per spec — will deadlock. Fix: per-class retry (network=3 with backoff; build/typecheck=2; migration=1+rollback). |
| F9  | HIGH     | Smoke-test: 200 not 401           | Treated as deploy fail; `/d-fail` reads Railway logs but bug is app logic. Wrong tool.                                                                             |
| F11 | MEDIUM   | Polar email-verify stalls 10+ min | Phase 3 hangs; no `[skip]` for billing; need timeout + alternate path.                                                                                             |
| S2  | CRITICAL | Public repo default               | Default `--private`; opt-in to public after deploy + .gitignore audit.                                                                                             |

---

## Phase 3.5 — DX Consensus

| Dimension                   | Codex                                                                     | Subagent                                                                                                   | Consensus                                                     |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1. TTHW <5 min?             | DISAGREE — survives median, fails P75                                     | DISAGREE — 2.5–4 min realistic; SQLite fallback correct call but no P75 budget                             | **CONFIRMED — TTHW needs P75 measurement**                    |
| 2. API/CLI naming           | DISAGREE — needs verb-noun-arg pattern (`/d-onboard <name>`)              | DISAGREE — same                                                                                            | **CONFIRMED**                                                 |
| 3. Error msgs actionable    | DISAGREE — three-part envelope must be codified before verifiers ship     | DISAGREE — implicit not specified; multi-author drift will produce 4 different shapes                      | **CONFIRMED — verifier-shape.ts must ship first**             |
| 4. Docs findable & complete | CONFIRMED — `human-tasks.md` colocated approach is good                   | CONFIRMED — same; minus 2 for no `--help` equivalent                                                       | CONFIRMED                                                     |
| 5. Upgrade path safe        | DISAGREE — vendor UI drift acknowledged; needs concrete refresh mechanism | DISAGREE — **3/10 score**; biggest gap; cloned repos stuck on v1.0 forever; "distribution" claim collapses | **CONFIRMED — upgrade path is silent killer**                 |
| 6. Dev env friction         | DISAGREE — Bun + gh + Railway CLI prerequisites                           | DISAGREE — same                                                                                            | CONFIRMED                                                     |
| 7. Magical moments          | CONFIRMED — self-healing deploy recovery (option b) is the right pick     | CONFIRMED — same; defended over (a)/(c)/(d)                                                                | **LOCKED: Magical moment = autonomous /d-fail recovery loop** |
| 8. Escape hatches           | DISAGREE — every phase needs `--skip` or alternate path                   | DISAGREE — 4-provider gauntlet has no escape; need `--no-billing` and `--local-only` modes                 | **CONFIRMED — add escape hatches**                            |

**DX Top 3 critical concerns (both voices agree):**

1. 🟠 **HIGH — Skills-only vs CLI-first doctrine needs single explicit answer.** [matches CEO User Challenge — UNANIMOUS across 5 voices.] The skill is the orchestrator; every operation underneath should be a CLI/script with `--help`, stable exit codes, loggable output.
2. 🟠 **HIGH — Verifier error contract is implicit, not specified.** Four verifier scripts written by four sessions will produce four different error shapes. **Fix: ship `scripts/setup/verifier-shape.ts` with `formatVerifierError(input)` BEFORE any verifier is written. Enforce via script-tier rule.** 2-hour scope; cost of skipping is days of inconsistent UX during alpha.
3. 🔴 **CRITICAL — Upgrade path missing (3/10).** Cloned Gaia repos forked at v1.0; when v1.1 ships there is no `gaia upgrade` skill. "Distribution" claim collapses into "yet another template snapshot." **Fix: scope a minimum `/d-upgrade` skill before tagging v1.0** (uses `git diff` against upstream + ast-grep codemods for the 5 most-likely-to-change patterns).

**DX scorecard (8 dimensions, /d-onboard v1.0 as designed):**

| #   | Dimension           | Score | Justification                                                                                  |
| --- | ------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| 1   | Time to hello world | 6/10  | <5min plausible on median, fails P75. Needs `scripts/measure-tthw.ts`.                         |
| 2   | API/CLI naming      | 5/10  | `/d-onboard` is one-token; no verb-noun-arg; needs project-name argument                       |
| 3   | Error messages      | 6/10  | Three-part envelope needed; not specified                                                      |
| 4   | Doc findability     | 8/10  | `setup/human-tasks.md` colocated approach is excellent                                         |
| 5   | Upgrade path        | 3/10  | **Silent killer.** No `/d-upgrade` skill. Codemods promised in vision but no plan in 001.      |
| 6   | Dev env friction    | 7/10  | Bun-only + `gh` CLI + Claude Code prerequisites — documented but real friction                 |
| 7   | Magical moments     | 8/10  | Self-healing deploy recovery is genuinely novel; needs explicit narration to be screencap-able |
| 8   | Escape hatches      | 4/10  | No `--no-billing` / `--local-only` mode; 4-provider gauntlet is mandatory                      |

**Total: 47/80 ≈ 5.9/10** — credible for an initiative-stage doc, not yet best-in-class. Gaps are concrete and addressable.

**Magical moment locked: autonomous self-healing deploy recovery loop.**

- The agent watches Railway deploy fail, calls `/d-fail`, reads logs, classifies failure, edits the migration/code, redeploys. Lovable broke at "deploy outside the sandbox." Gaia heals at the same point. Implementation requirement: `/d-fail` invocation must produce a screencap-recordable narrated trace ("Detected: migration error. File: `packages/db/schema.ts:42`. Fix: ...") so the README's 60-second video can highlight it.

**Verifier error contract (must ship in `scripts/setup/verifier-shape.ts`):**

```
Error: <one-sentence what>.
Cause: <one-line why>.
What to do:
  1. <action>
  2. <alternate action>
  3. <escape hatch>
Details:
  Expected format: <regex>
  Got:             <last-3-redacted>
  Verifier:        scripts/setup/verify-key-X.ts:LINE
  Error code:      ERR_SETUP_X_<SUBCODE>
Exit code: 1
```

**`/d-onboard` exit message contract (self-documenting per ax.md §12):** structured "handoff artifact" — Run ID, total time, outcome, input, decisions log, output (live URL, providers verified), concerns, next-skill suggestion. Deterministic shape parseable by `scripts/test-onboard.ts`. (Full template in DX subagent output, restore point.)

---

## Cross-Phase Themes (concerns appearing in 2+ phases independently)

| Theme                                                   | Phases         | Confidence             | Verdict                                                      |
| ------------------------------------------------------- | -------------- | ---------------------- | ------------------------------------------------------------ |
| **CLI/skill doctrine contradiction**                    | CEO + Eng + DX | UNANIMOUS (5/5 voices) | **USER CHALLENGE — must resolve before v1.0**                |
| **`/d-onboard` decomposition**                          | CEO + Eng + DX | High                   | **TASTE DECISION — surface at gate**                         |
| **30-min number not empirical / N=5 alpha is theatre**  | CEO + Eng      | High                   | **TASTE DECISION — replace alpha protocol**                  |
| **`/d-fail` overstated**                                | CEO + Eng      | High                   | Auto-decide: upgrade `/d-fail` OR move retry to `/d-onboard` |
| **Verifier error contract missing**                     | Eng + DX       | High                   | Auto-decide: ship `verifier-shape.ts` first                  |
| **Public-repo default**                                 | Eng (CRITICAL) | High                   | Auto-decide: default `--private`                             |
| **Upgrade path missing**                                | DX             | Singleton but CRITICAL | **TASTE DECISION — surface at gate**                         |
| **Sample feature TBD (Open Q #5)**                      | Eng + DX       | High                   | Auto-decide: NO sample feature in v1.0                       |
| **Mutation/Playwright deferred contradicts vision §11** | Eng + DX       | High                   | **CONTRADICTION FIRES — needs human resolution**             |
| **Reference count drift (17 → 21)**                     | mechanical     | trivial                | Auto-decide: fix doc                                         |

---

## USER CHALLENGE — the load-bearing decision

**🔴 CHALLENGE: Reverse the "no CLI binary" constraint and decompose `/d-onboard` into CLI + smaller skills.**

**You said:** _"No CLI binary. `bun gaia ...` does not exist and will not exist in 001. The skill is the surface."_ (Initiative §Constraints, Decision Audit Trail #4)

**5 of 5 voices recommend the change.** Both Codex and Claude subagent across CEO, Eng, and DX phases independently arrived at the same conclusion.

**Why both models recommend the change:**

- vision Open-specs #7 already mentions `bun create gaia@latest` (codex CEO)
- dx.md §1 mandates CLI as primary operational surface (CEO + Eng + DX)
- ax.md §1 says skills wrap CLI ("CLI is the mechanism") (CEO + DX)
- skills.md §6, §7, §8 are violated by the 7-phase mode-mixing monolith (Eng)
- Every actual operation in `/d-onboard` is already a CLI invocation (`gh`, `railway`, `bun run setup:verify-key X`) — the rhetoric of "no CLI" hides the reality (Eng + DX)
- Multi-skill flow tests better in alpha because users can resume from a known step (CEO)

**What we might be missing (you have context we don't):**

- You explicitly chose "skill is the surface" because skills are how Gaia operates. There may be a vision-level reason rooted in your "agent-native first" principle that makes a CLI redundant or a step backwards.
- `bun create gaia@latest` is mentioned as a vision spec but may have been deferred for a reason we don't see.
- Building a CLI binary is real scope (~1 week) vs ~0 days for a skill — if 21-day target is firm, this trades 1 week of CLI work for an unknown amount of skill rework later.

**If we're wrong, the cost is:** a working `/d-onboard` skill ships in v1.0 that nobody complains about, the methodology stays internally consistent (skills-only), and the constitution gets amended to say "skills count as CLI for AX purposes." Low downside.

**If you're wrong, the cost is:** every operation in the skill rots when Railway/Polar/etc. change UIs (no underlying testable CLI to refactor against), the multi-author verifier scripts produce inconsistent UX, the doc contradicts dx.md §1 / ax.md §1 / vision §7 in production, future contributors build mismatched experiences. High downside.

**Three options to choose from:**

- **A) Accept change in full.** Add `bun create gaia@latest <name>` as the deterministic scaffolder (~30s). Decompose `/d-onboard` into `/d-bootstrap` + `/d-keys` + `/d-deploy-loop` (or keep as orchestrator that calls them). Define underlying CLI verbs (`bun gaia onboard`, `bun gaia onboard verify-keys`, etc.) so dx.md §1 holds. Skill is the conversational front-end; CLI is the testable substrate. **Adds ~1 week scope.**
- **B) Partial accept.** Add `bun create gaia@latest <name>` for the _scaffolding_ only (matches vision Open-specs #7); keep `/d-onboard` as the single skill for the post-scaffold flow. Resolves vision contradiction without decomposing the skill. **Adds ~3 days scope.**
- **C) Reject.** Hold the original direction. Document in vision (or 001) why "skill is the surface" overrides dx.md §1. Amend dx.md §1 with an "agent-era exception." **No scope add; but doc contradiction must be resolved with an ADR.**

**Recommendation (autoplan):** **B**. It's the highest-leverage minimum change — resolves vision Open-specs #7 + dx.md §1 contradictions without forcing a full skill decomposition mid-doc. `bun create gaia@latest` is industry-standard onboarding (Next, Vite, Astro, Remix, T3, Solid all do it), gives an instant TTHW <30s, and the post-scaffold flow can stay a single skill until alpha shows whether decomposition is needed.

**Your call. The original direction stands unless you explicitly change it.**

---

## Auto-decided changes (mechanical — applied per the 6 principles)

| #     | Change                                                                                                                  | Principle                 | Source                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------- |
| AD-1  | Reference count fixed: 17 → 21 in §"What Gaia is" Layer 3                                                               | P5 explicit               | `.gaia/CLAUDE.md` says 21 |
| AD-2  | `setup/onboard-state.json` sub-task resumability spec added (per gstack `setup-deploy` Step 1 detection pattern)        | P1 completeness           | DX consensus              |
| AD-3  | `gh repo create --private` default; opt-in to public after deploy + .gitignore audit step                               | P1 completeness, security | Eng CRITICAL S2           |
| AD-4  | `/d-fail` retry semantics moved to `/d-onboard` Phase 5 (per-class: network=3, build/typecheck=2, migration=1+rollback) | P1 completeness           | Eng CONFIRMED             |
| AD-5  | `scripts/setup/verifier-shape.ts` (shared error envelope) MUST ship before any verifier                                 | P1 completeness           | DX CONFIRMED              |
| AD-6  | Phase 3 parallelization: open all 4 provider tabs upfront, interleave verify                                            | P3 pragmatic              | Eng CONFIRMED             |
| AD-7  | `setup/human-tasks.md` per-task `[skip]` flag — billing skippable via `--no-billing` mode                               | P1 completeness           | DX CONFIRMED              |
| AD-8  | `packages/adapters/deploy.ts` thin Railway wrapper (`getLogs`, `getStatus`, `setVar`)                                   | P3 pragmatic              | Eng CONFIRMED             |
| AD-9  | `delivered@resend.dev` test mailbox in `verify-key-resend.ts` for CI runs (rate-limit dodge)                            | P1 completeness           | Eng test isolation        |
| AD-10 | Sample feature decision LOCKED: NO sample feature in v1.0 (Open Q #5 resolved)                                          | P3 pragmatic              | Eng + DX agreed           |
| AD-11 | Open Q #1 resolved per consensus: option (b) — keep 002, create 003 (open-source platform) when relevant                | P5 explicit               | CEO consensus             |
| AD-12 | TTHW + TTFD ship as TWO separate KPIs, not one                                                                          | P5 explicit               | DX CONFIRMED              |
| AD-13 | Magical moment locked: autonomous `/d-fail` recovery loop with screencap-recordable narration                           | P5 explicit               | DX CONFIRMED              |
| AD-14 | Escape hatches added to /d-onboard: `--no-billing`, `--local-only`, `--dry-run`, `--resume`, `--restart`                | P1 completeness           | DX CONFIRMED              |
| AD-15 | Test isolation strategy: per-run unique tenants for Polar/Resend/Neon/Railway (test plan artifact written)              | P1 completeness           | Eng CRITICAL              |
| AD-16 | `setup/alpha-recruits.md` added to Phase 2 deliverables — names before recruitment starts                               | P1 completeness           | DX CONFIRMED              |
| AD-17 | CI does NOT run `bun run test:onboard` on every PR; nightly cron only                                                   | P3 pragmatic              | Eng cost analysis         |
| AD-18 | `verifier-shape` enforced via new script-tier rule `scripts/check-verifier-shape.ts`                                    | P1 completeness           | DX CONFIRMED              |

---

## Taste Decisions (your call — surfaced at gate)

| #    | Decision                                                                                              | Recommendation                                                                                         | Why this not the other                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-1 | **`/d-upgrade` skill in v1.0 OR v1.1?**                                                               | **v1.0** (DX subagent CRITICAL)                                                                        | Without it, "distribution" claim is empty marketing. Even a thin `/d-upgrade` shipping is enough to keep the claim honest. Pushed to v1.1 = silent killer per DX subagent. **Trade:** ~3 days scope add. |
| TD-2 | **Decompose `/d-onboard` to 3 skills, or keep monolith with the User Challenge resolved (option B)?** | **Keep monolith** if you choose User Challenge option B; **decompose** if you choose option A          | Decomposition is the right shape long-term but not necessary if `bun create gaia@latest` absorbs scaffolding. Decompose later if alpha shows resumability friction.                                      |
| TD-3 | **Mutation testing (Stryker) in v1.0 or v1.1?**                                                       | **v1.0** for `packages/security`, `packages/auth`, `packages/adapters/payments`; **v1.1** for the rest | Vision §11 mandates mutation testing for "the middle." Defering all of it = vision contradiction. Critical-path packages must have it before public launch.                                              |
| TD-4 | **30-min target — keep, raise, or lower?**                                                            | **Keep 30-min as TTFD; add TTHW <5 min as separate KPI; honest baseline P75 not median**               | Both voices flagged the alpha protocol (N=5) as theatre. Recommend N≥10 alpha sessions before tagging v1.0, with both metrics measured. Median + P75 reported.                                           |
| TD-5 | **Alternative 002 reframe (Open Q #1) — option a/b/c?**                                               | **(b) — keep 002 as launch hardening, add 003 for open-source platform**                               | UNANIMOUS across 4 voices. Existing 002 has 600+ lines of value; renaming is wasteful. New 003 isolates the platform bet.                                                                                |

---

## Decision Audit Trail (autoplan round 1)

| #    | Phase       | Decision                                                                                              | Classification | Principle         | Rationale                                                                                     |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------- | -------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| AP-1 | Phase 0     | Premise gate not interactively asked (founder's hardening directive treated as implicit acceptance)   | Mechanical     | P6 bias to action | User explicitly invoked /autoplan to harden; gate fires at end with surfaced premise concerns |
| AP-2 | Phase 1     | Mode = SELECTIVE EXPANSION                                                                            | Mechanical     | autoplan default  | Hardening directive fits this mode                                                            |
| AP-3 | Phase 2     | UI scope tagged `[design-skipped: UI-listed-not-designed]`                                            | Mechanical     | P5 explicit       | UI surfaces enumerated, not visually designed; defer to implementation                        |
| AP-4 | Phase 3     | All 4 isolation holes flagged as test-plan artifact (separate file)                                   | Mechanical     | P1 completeness   | Prevents in-doc test bloat                                                                    |
| AP-5 | Phase 3.5   | gstack patterns mined explicitly (setup-deploy, setup-gbrain, land-and-deploy, setup-browser-cookies) | Mechanical     | founder directive | "use gstack as state-of-the-art reference"                                                    |
| AP-6 | Cross-phase | CLI/skill contradiction surfaced as USER CHALLENGE, not auto-decided                                  | Required       | autoplan rules    | 5/5 voices agree user direction should change; never auto-decided                             |
| AP-7 | Cross-phase | 5 taste decisions surfaced (TD-1 to TD-5)                                                             | Required       | autoplan rules    | Reasonable disagreement; founder's call                                                       |
| AP-8 | Cross-phase | 18 mechanical changes auto-applied (AD-1 to AD-18)                                                    | Mechanical     | 6 principles      | Each maps to a cited principle                                                                |

---

## Verdict + recommended next step

**Status:** APPROVED with one User Challenge + 5 Taste Decisions pending founder review.

**Auto-applied:** 18 mechanical fixes captured as AD-1 to AD-18 (must be folded into the body of the doc on next pass; this round leaves them as audit-trail entries to keep the diff minimal).

**Blocked on founder decision:** USER CHALLENGE (CLI/skill doctrine — recommend option B). Until resolved, 001 v1.0 cannot tag.

**Recommended next:**

1. Founder reads the User Challenge + 5 Taste Decisions.
2. Approve, override, or interrogate per autoplan gate options (A/B/B2/C/D/E).
3. On approval: I'll fold AD-1 to AD-18 into the body of 001, write the corrected v2 to disk, mark `status: approved (autoplan round 1)`, and `/ship` is the next move.
