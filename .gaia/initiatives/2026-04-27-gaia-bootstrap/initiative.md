---
parent: roadmap.md — "A working Gaia v6 template that clones, installs, and runs"
hypothesis: a complete, MIT, opinionated template that takes a developer from `git clone` to a deployed public URL in 30 minutes — covering auth, payments, DB, email, observability, admin, and CI/CD — is the wedge that gets the Lovable-graduate ICP to adopt Gaia, because it collapses 6–10 vendor stitching jobs into one repo + one guided skill.
measurement: time-to-first-deploy on real external accounts. Five alpha sessions (3 internal, 2 external) inside an unstructured 30-minute window. Threshold: ≥3 of 5 reach a live URL serving the auth flow without operator intervention. 30-day window from the day v1.0 of the template is tagged.
status: draft (autoplan round 1 in progress)
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
> **Status:** DRAFT (first version — to be hardened by /office-hours + /plan-eng-review + /autoplan in subsequent passes).
> **Predecessors:** none. This is the foundation initiative — 002 (launch hardening) and any future initiative covering the open-source self-hostable platform depend on 001 substantially complete.
> **Source:** Founder direction 2026-04-28 + three accumulated session summaries (Setup Gaia project, Plan Open-Source Monorepo, Understand startup play).

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

| Layer                | Contents                                                                                                                                                                                   | Mode                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **L1 — Stack**       | Bun + Elysia + SolidStart + Drizzle + TypeBox + Polar + Better Auth + Resend + Inngest + Sentry + PostHog + Axiom + ast-grep + oxlint + oxfmt                                              | Distribution. We pick, version, and wire. We do not reinvent.                         |
| **L2 — Surfaces**    | Landing, auth flows (signup/login/verify/reset/optional OAuth), dashboard, billing (checkout + portal), admin scaffold + 3 modules (metrics, email log, mini-CRM), content/CMS scaffolding | Template. The user clones, owns, modifies.                                            |
| **L3 — Methodology** | `.gaia/vision.md`, 17 reference files, 8 d-\* skills, gstack foundation, `.gaia/initiatives/` workflow loop                                                                                | Vendored markdown + skills. Modifiable by the user; upgraded by codemods later.       |
| **L4 — Harness**     | PreToolUse / PostToolUse / Stop / SessionStart hooks consuming `.gaia/rules.ts`; oxlint + oxfmt + ast-grep + script-tier gates + parallel CI                                               | Vendored TypeScript. Modifiable. The deterministic enforcement that makes L3 not rot. |

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

6. **The first impression is a single skill invocation.** After `git clone` + `bun install`, the user types `claude` and runs `/d-onboard`. That skill is the entire onboarding UX. There is no wizard, no CLI binary, no web setup tool. The skill is the surface because skills are how Gaia operates. If the skill is broken, the template is broken. So the skill is testable end-to-end (`bun run test:onboard` simulates the 30-min path against test accounts).

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
- No new reference files added in 001. The 17 already exist; closing the 5 with "judgment only" enforcement (design, dx, tokens, ux, voice) is OUT of scope for 001 and lives in 002 or 003.
- No CLI binary. `bun gaia ...` does not exist and will not exist in 001. The skill is the surface.

---

## Premises (load-bearing assumptions — falsifiable)

1. **The "first 30 minutes" is the conversion event.** A graduate who hasn't seen a deployed URL in 30 minutes will not return Day 2. _Falsifier:_ Phase 2 alpha sessions show that users who took 60+ minutes still completed and adopted at the same rate as <30-min users. (Would mean the 30-min target is vanity, not load-bearing.)

2. **Overbuilding + AI pruning beats minimal + AI scaffolding.** It is faster for a Claude Code agent to _delete_ an unused admin module than to _generate_ one from scratch, given the harness + reference files + skills. _Falsifier:_ in 5 prune sessions, users abandon the prune loop and instead manually rewrite from scratch. (Would mean ship minimal and let `/d-admin add` build on demand — Approach C.)

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

### D — Hybrid: complete template + optional `/d-admin remove <module>` cleanup

- **Scope:** Approach B's full template, plus a `/d-admin remove` skill that prunes modules cleanly with audit log.
- **Pros:** captures both thesis (overbuild + prune) and recovery (clean removal of unused).
- **Cons:** adds skill scope to 001.
- **Verdict:** **adopted as a v1.1 follow-up**, not v1.0 must-ship. v1.0 ships Approach B. v1.1 (within Phase 2) adds `/d-admin remove` if Premise 2 needs it.

---

## Recommended approach — B with explicit caps

| Surface           | What ships in v1.0                                                                                             | What's capped (no second feature)                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Landing page**  | One page: hero + 30-second demo video embed + clone command + 3 trust elements (Bun, Polar, Drizzle) + footer  | No blog, no docs site, no marketing pages. Pricing page deferred to 002 paid launch. |
| **Auth flows**    | Email + password, email verification, password reset, optional Google OAuth                                    | No SSO, no magic link, no MFA, no passkeys.                                          |
| **Billing**       | Polar checkout (one plan: "Pro $19/mo"), Polar customer portal, webhook → DB → entitlement gating              | No multi-plan, no per-seat, no usage-based, no annual.                               |
| **Admin**         | Scaffold (auth-gated `/admin`) + 3 modules: metrics dashboard, email log, mini-CRM (contacts list)             | No Linear-clone, no projects view, no docs view, no audit viewer.                    |
| **Content**       | `content/` folder → static HTML render (frontmatter routing) for blog + 1 docs page                            | No multi-format, no theming, no MDX, no API docs auto-gen.                           |
| **Database**      | Postgres (Neon) in production, SQLite fallback for first-run                                                   | No Turso, no PlanetScale, no MongoDB.                                                |
| **Email**         | Resend transactional (welcome + verify + reset)                                                                | No marketing list, no segments, no templates UI.                                     |
| **Workflows**     | Inngest mounted, one example: `user/created` → send welcome email                                              | No advanced step composition, no human-in-the-loop.                                  |
| **Observability** | Sentry + Axiom + PostHog wired and called at boot                                                              | No custom dashboards, no SLO definitions.                                            |
| **Deploy**        | Railway via railway.toml + GitHub Actions CI; `/d-fail` integration                                            | No Cloudflare Workers, no Fly, no Vercel adapter.                                    |
| **AI agent**      | Anthropic SDK adapter present; one example feature ("/api/ai/summarize")                                       | No agent loops, no tool use, no streaming UI.                                        |
| **Skills**        | `/d-onboard` (orchestrator) + reuse existing `/d-fail`, `/setup-deploy`, `/d-strategy`, `/d-roadmap`, `/d-tdd` | No `/d-admin add`, no `/d-cms`, no `/d-deploy` (that's `/setup-deploy`'s job).       |

---

## The first-cycle onboarding — `/d-onboard` skill

This is the load-bearing UX of 001. Designed in detail below so the implementation has a fixed shape to TDD against.

### Trigger

User runs `/d-onboard` inside Claude Code, after `git clone` + `bun install`. (No CLI binary. The skill is the surface.)

### Inputs

- Current working directory (must be a fresh Gaia clone).
- `gh` CLI authenticated.
- Bun installed.
- `claude` CLI authenticated.

### Phases

**Phase 1 — Identify (1–2 min)**

1. Read `package.json`, confirm we're inside a Gaia template (presence of `.gaia/vision.md` + `bun-only` engine pin).
2. Prompt: project name (used for GitHub repo + Railway service + display).
3. Prompt: domain (optional, default `null` — user can add later).
4. Write `setup/onboard-state.json` (the skill's working memory).

**Phase 2 — GitHub setup (2–3 min)**

1. `gh repo create $name --public --source=. --remote=origin --push=false`.
2. Generate `setup/human-tasks.md` from `setup/human-tasks.md.template`, populated with the project name + a per-task `[ ]` checkbox.
3. Commit the populated `human-tasks.md`. Push to GitHub.

**Phase 3 — Human tasks loop (10–20 min, the bulk)**

For each external account (Polar, Resend, Neon, Railway):

1. Open the signup URL in the user's browser.
2. Print the exact steps the user needs to take in that service's UI (copy-paste of the `human-tasks.md` entry).
3. Wait for the user to paste back the API key / DSN / token.
4. Write to `.env.local`.
5. Run the verifier (`bun run setup:verify-key polar` etc.) — verifier hits the provider with a known-safe API call, fails loudly if the key is wrong.
6. On verify-fail: print actionable error + the key's expected format + retry up to 3 times before pausing for human help.
7. On verify-pass: tick the checkbox in `human-tasks.md`, commit.

**Phase 4 — GitHub secrets sync (1 min)**

1. For each verified key, set it as a GitHub Actions secret via `gh secret set`.
2. Append to `setup/onboard-state.json`.

**Phase 5 — Deploy (5–8 min)**

1. Push initial commit to `origin/main`.
2. GitHub Actions runs `bun run check`. If green → triggers Railway deploy. If red → call `/d-fail` to fix and retry (max 3 retries).
3. Watch Railway deploy logs via Railway CLI (`railway logs --json | tail -f`). If deploy fails → call `/d-fail`. Max 3 retries.
4. On success: capture the Railway public URL.

**Phase 6 — Smoke test (2 min)**

1. `curl https://$url/health` → expect 200.
2. `curl -I https://$url/me` → expect 401.
3. `curl -X POST https://$url/auth/sign-up/email -d {...}` with a test account → expect 200, then verify Resend log shows the welcome email queued.
4. Open `https://$url` in browser via gstack/browse, screenshot the landing page, save to `setup/onboard-screenshots/`.

**Phase 7 — Report (30 sec)**

1. Compute total elapsed time (Phase 1 start → Phase 6 end).
2. Print summary: live URL, TTFD, what was deployed, what's next (`/d-strategy` to start the user's first real initiative).
3. Append to `.gaia/audit/onboard.jsonl`.

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

8. **30-min target is wall-time-optimistic.** First-time users hit doc gaps, copy-paste errors, missing prerequisites (no `gh` CLI, no Bun installed). **Mitigation:** staged targets — 60 min v0.1 (internal only), 30 min v1.0 (alpha + public). Prerequisite check is Phase 1's first action: skill validates `gh`, `bun`, `claude` are present before continuing.

---

## Open questions

1. **Reconcile 002 framing.** Existing 002 = launch hardening. User's 2026-04-28 message reframes 002 as "create the open-source deployment platform." These are different work. Resolution paths:
   - **(a)** Rename existing 002 to "Gaia v1 launch readiness" and add a new 003 for the platform.
   - **(b)** Treat existing 002 as the _content_ and reorder: 001 = template, 002 = launch readiness (existing), 003 = open-source platform (new).
   - **(c)** Reshape existing 002 to be the platform, demote launch readiness inside 001's Phase 3.
   - **My recommendation: (b).** Existing 002 has 600+ lines of hardened plan; renaming + adding 003 is the cleanest. Awaiting founder decision before touching 002.
2. **Skill name:** `/d-onboard` vs `/d-bootstrap` vs `/gaia-init`. Recommend `/d-onboard` — fits the d-\* methodology pattern; "onboard" reads as the user's verb, not Gaia's.
3. **Default deploy target — Railway only?** Adding a second target (Cloudflare, Fly) doubles testing surface. Recommend Railway-only for v1.0; document a "switch to Fly/Cloudflare in <1 hour" path in `reference/deployment.md` (deferred to 002).
4. **SQLite for local dev — keep or always Postgres?** Recommend SQLite first-run (zero deps), Postgres flag-on. Risk: drift between dev DB and prod DB schemas. Mitigation: drizzle-kit can target both; CI tests against Postgres only.
5. **Sample feature in the template — yes/no?** Currently leaning _yes_: a single "ideas board" CRUD example so users see end-to-end (schema → migration → admin module → API → UI → feature). Lets `/d-onboard`'s smoke test be richer. Risk: it's the second feature of "admin," violating the cap. Resolve in Phase 1 of execution.
6. **`/d-onboard` mutates `.env` directly, or print and ask user to paste?** Recommend mutate `.env.local` directly with explicit "the skill will write to .env.local" upfront consent. Reduces copy-paste error surface.
7. **Founder decision on the 7 invariants.** Are they the right 7? Anything missing? Anything wrong?

---

## Success criteria

**Stage 1.0 (v1.0 must-ship — minimum viable):**

- 5 alpha sessions (3 internal, 2 external) complete `/d-onboard` end-to-end. ≥3 reach a live URL inside 30 minutes without operator intervention.
- gaia.app deploys from this template's `master` with zero modifications.
- `bun run check` passes all gates (lint, format, types, harden, scripts, tests, ast-grep, knip).
- `bun run test:onboard` runs in CI on every commit, completes in ≤30 minutes against test accounts.
- Median TTFD across alpha sessions ≤30 minutes.

**Stage 1.1 (v1.1, follows v1.0 by 2 weeks if Premise 2 holds):**

- `/d-admin remove <module>` skill ships; pruning UX validated in 5 sessions (≥4 prune in <5 min/surface).
- All 17 reference domains have at least one active enforcement mechanism (currently 12/17 — close design, dx, tokens, ux, voice via ast-grep + script gates).
- Mutation testing (Stryker) and e2e (Playwright) integrated into `bun run check`.

**Stage 1.2 (handoff to 002):**

- Once Stage 1.0 hits the alpha bar, the template is ready for 002's launch hardening to operate on a known-good artifact. 002 becomes coherent.

**Abandonment ladder (45 days from v1.0 tag):**

- **<2 of 5 alphas reach 30 min:** re-scope. Likely strip features, re-test. Could mean pivot to Approach C.
- **2 of 5 alphas reach 30 min:** re-iterate the skill, hold scope, run another 5 sessions.
- **≥3 of 5 alphas reach 30 min:** ship publicly, hand off to 002.

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

### Phase 1 — substance (estimated 2–3 weeks)

| #   | Deliverable                                                                 | Touches                                                                                                               | Notes                                             |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Real landing page (single, hero + demo + clone + 3 trust elements + footer) | `apps/web/src/routes/index.tsx`                                                                                       | Reuses tokens; aligns with 002 H2.6 claim hygiene |
| 2   | Complete auth flows (verify, reset, optional Google OAuth)                  | `apps/web/src/routes/{verify-email,forgot-password,reset-password,oauth}.tsx`, `packages/auth/`                       | Better Auth supports all out of the box; wire UI  |
| 3   | Polar checkout + portal end-to-end                                          | `apps/api/server/routes/billing.ts`, `apps/web/src/routes/billing.tsx`, `packages/db/schema.ts` (subscriptions table) | Webhook → DB → entitlement gating                 |
| 4   | Admin scaffold + 3 modules                                                  | `apps/web/src/routes/admin/`, `packages/db/schema.ts`                                                                 | Metrics, email log, mini-CRM                      |
| 5   | Content/CMS scaffolding                                                     | `content/`, `apps/web/src/routes/(content)/`                                                                          | Frontmatter routing only; no MDX                  |
| 6   | One sample feature (resolves Open Q #5)                                     | TBD                                                                                                                   | Decide in execution                               |
| 7   | Inngest example: `user/created` → welcome email                             | `packages/workflows/functions/`, `packages/auth/` (hook signup)                                                       | One real async path                               |

### Phase 2 — onboarding (estimated 2 weeks)

| #   | Deliverable                                   | Touches                                                   | Notes                                                 |
| --- | --------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| 8   | `/d-onboard` skill v0.1                       | `.claude/skills/d-onboard/SKILL.md` + scripts             | Orchestrator; calls existing skills                   |
| 9   | `setup/human-tasks.md.template` + format spec | `setup/`, `scripts/check-human-tasks.ts`                  | Script-tier rule enforced via `bun run check:scripts` |
| 10  | Verifier scripts per provider                 | `scripts/setup/verify-key-{polar,resend,neon,railway}.ts` | Each does one safe API call, fails loudly             |
| 11  | Railway CD/CI with `/d-fail` integration      | `.github/workflows/deploy.yml`, `.claude/skills/d-fail/`  | Loop until green or 3 attempts                        |
| 12  | `bun run test:onboard` end-to-end CI test     | `scripts/test-onboard.ts`, CI workflow                    | Throwaway accounts, asserts ≤30 min                   |

### Phase 3 — verification (estimated 1 week)

| #   | Deliverable                                   | Notes                                                                      |
| --- | --------------------------------------------- | -------------------------------------------------------------------------- |
| 13  | 3 internal alpha sessions, recorded, measured | Founder + 2 friends; 30-min unstructured; record TTFD + abandonment points |
| 14  | 2 external alpha sessions                     | Lovable/Bolt graduates; recruit via Twitter DM                             |
| 15  | Iterate skill based on failure clusters       | Each alpha produces a `setup/alpha-NN.md` postmortem                       |
| 16  | Tag v1.0 if ≥3 of 5 hit ≤30 min               | Hand off to 002                                                            |

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

| #   | Decision                                                                                     | Source                                                           | Rationale                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lock identity as "open-source distribution + methodology + harness"                          | Founder 2026-04-28                                               | Resolves recurring template/framework/distribution/OS confusion across 3 prior sessions                                                 |
| 2   | Template is MIT (not FSL/AGPL)                                                               | Founder 2026-04-28                                               | "the template MUST be MIT so people can actually use it as they want"; FSL reserved for future open-source platform                     |
| 3   | Success metric = deployed-to-production in 30 min                                            | Founder 2026-04-28                                               | Beats local-only and beats first-feature anchors; matches the wedge promise                                                             |
| 4   | First cycle = single skill `/d-onboard`, not CLI or wizard                                   | Founder 2026-04-28 + harness/SKILL convention                    | Skills are how Gaia operates; a CLI binary would conflict with vision §13 (CLI-first ops via existing tools)                            |
| 5   | Overbuild + AI-prune (Approach B), not minimal + AI-scaffold (Approach C)                    | Founder 2026-04-28                                               | "there is NO problem if the template overbuilds because AI can eliminate the extra files" — this is the contrarian bet that defines 001 |
| 6   | Same `master` for gaia.app and template (no overlay until paid features exist)               | Plan-Open-Source-Monorepo summary §"Two databases, one codebase" | Dogfooding by construction beats dogfooding by discipline                                                                               |
| 7   | No paid feature gating in template                                                           | Founder 2026-04-28                                               | "moat is hosted ops + methodology, not lock-and-key features"; matches Cal.com, Supabase, PostHog patterns                              |
| 8   | Defer everything 002 already covers (launch, hardening, marketing, security audit)           | Both initiatives                                                 | Clean handoff: 001 makes the artifact, 002 launches it                                                                                  |
| 9   | Reuse existing skills (`/d-fail`, `/setup-deploy`); don't build new ones beyond `/d-onboard` | Skill availability check                                         | Avoid skill sprawl; orchestration > duplication                                                                                         |

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
