---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Re-prefixing the 17 d-* skills into three explicit categories (h- harness, w- workflow, a- audit) AND mechanically enforcing 10 cold-start invariants raises agent cold-start TTHW from ~30s to ~5s (6× faster) and reduces "which skill?" round-trips ≥50% in 0002+.
falsifier: After 0006 ships, the cold-start TTHW measurement script (`scripts/measure-skill-resolution.ts`, landing in PR 0) still reports >15s average from "user intent" to "skill phase 1" across a sample of 0002+0003 sessions. Window: 60 days post-ship.
measurement: { metric: "cold-start TTHW (tokens read before phase 1) + skill-resolution round-trips per session", source: "scripts/measure-skill-resolution.ts parses ~/.claude/sessions/*.jsonl and counts (a) tokens between Skill invocation and first phase output, (b) AskUserQuestion 'which skill' or 'what does X do' patterns", baseline: "captured by PR 0 BEFORE rename — written to .context/skill-baseline.json", threshold: "TTHW <8s avg AND <1.5 round-trips/session", window_days: 60, verdict: "TBD" }
status: draft
autoplan_review: 2026-04-29 (CEO + Eng + DX phases, single-reviewer mode — Codex unavailable in Conductor sandbox)
---

# Initiative 0006 — Skills 10x: Committee of Garry + h/w/a Categories

## 1. Context / Research

After 0001 collapsed methodology into the SRR triad (skill ↔ reference ↔ rules), we have 17 first-class `d-*` skills plus 3 vendored gstack placeholders (`plan`, `qa`, `review`). Globally-installed gstack ships ~50 more (ship, investigate, design-shotgun, autoplan, etc.) — that's the comparison surface.

**Skill inventory (today)** — all share the `d-` prefix, so category is implicit and non-discoverable:

- Audits (6): `d-ai`, `d-ax`, `d-dx`, `d-observability`, `d-security`, `d-ux`
- Workflow (6): `d-code`, `d-content`, `d-deploy`, `d-fail`, `d-initiative`, `d-review`
- Harness / meta (3): `d-reference`, `d-rules`, `d-skill`
- Composite / config (2): `d-health`, `d-infra`

**The agent has to know all 17 names before it can pick.** A new operator (or a new agent run starting cold) cannot infer that `d-ai` audits AI code while `d-code` writes code. The `d-` is a uniformity tax with no signal.

**Comparison vs gstack** — gstack distinguishes skill _roles_ in their descriptions ("Pre-commit review", "Plan an implementation", "Test the DX"), not in their names. They get away with this because their skills are user-facing slash-commands invoked by humans typing freely. Ours run inside an agent loop where prefix-as-category compresses the skill resolver step into the name itself.

## 2. Strategy

**Problem**: skill discovery is O(n) read-each-description. We want O(1) prefix-routing: see "h-" → it touches the harness; see "w-" → it does work; see "a-" → it scores work.

### 2a. Committee of Garry — adversarial review

A Garry-Tan-style committee of five hats audited every skill against `gstack` analogues. Findings split into **common constraints** (true of every skill) and **per-skill** (specific gaps).

#### Common constraints — apply to ALL 17 skills

| #   | Constraint                  | Rule                                                                                                          | Today                                                                                                           | Gap                                |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| C1  | **One job per skill**       | First sentence of `description:` states the _single_ outcome the skill produces.                              | ~13/17 are single-outcome; `d-content` is a router (5 sub-types) and `d-health` is a meta-runner (10 sessions). | 4 violators                        |
| C2  | **Cold-start safe**         | An agent on first invocation can run the skill end-to-end without reading the body.                           | Most skills require `Phase 0 — read reference.md`. Implicit, not enforced.                                      | 17 violators                       |
| C3  | **Triggers in description** | Trigger keywords AND voice aliases ("speech-to-text aliases") are listed in the `description:` field.         | Trigger text yes; voice aliases NO.                                                                             | 17 violators                       |
| C4  | **Mode declared**           | Skill states `Mode: report` or `Mode: fix` (or both, with the switch surfaced).                               | 9/17 declare; 8/17 implicit.                                                                                    | 8 violators                        |
| C5  | **Tier discipline**         | Where invocation cost varies, expose `quick / standard / exhaustive` (gstack `qa` and `cso` already do this). | 1/17 (`d-health`).                                                                                              | 16 violators                       |
| C6  | **Output artifact pinned**  | Skill names exactly where its report or file lands (path + name).                                             | 6/17 pinned; 11/17 vague ("returns a report").                                                                  | 11 violators                       |
| C7  | **Failure mode named**      | Skill states what it does when it can't finish (escalate to humantasks, abort, partial report).               | 4/17 named (mostly via "humantasks.md" pattern).                                                                | 13 violators                       |
| C8  | **Pair / chain hints**      | `description:` ends with `Use after <X>` or `Pair with <Y>` so chaining is visible at the resolver step.      | 5/17 hint at chaining.                                                                                          | 12 violators                       |
| C9  | **Reference parity**        | 1:1 `reference.md` sibling (kept from 0001). Length normalized: 200 ≤ N ≤ 800 lines.                          | All 17 have it; lengths span 14 → 1558 (100×).                                                                  | 6 outliers (too thin or too dense) |
| C10 | **No d- tax**               | Prefix encodes role: `h-` (harness), `w-` (workflow), `a-` (audit). Resolver never reads body to classify.    | 0/17 (uniform `d-`).                                                                                            | 17 violators                       |

#### Per-skill findings (one line each, recommended action)

| Today             | Tomorrow          | Verdict from committee                                                                                                                                                                                 |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `d-skill`         | `h-skill`         | Tight, 478-line reference. Strong. Drop the `d-` prefix; that's it.                                                                                                                                    |
| `d-reference`     | `h-reference`     | Solid. Same.                                                                                                                                                                                           |
| `d-rules`         | `h-rules`         | Solid. Same.                                                                                                                                                                                           |
| `d-initiative`    | `w-initiative`    | Single-mode Q&A. Add tier (`scoping` / `full-bet`).                                                                                                                                                    |
| `d-code`          | `w-code`          | Best-shaped skill we have. Pin output artifact (each PR's commit message).                                                                                                                             |
| `d-content`       | `w-write`         | **Router masquerading as a skill** (5 sub-types via `rules-{type}.md`). Either split or own it as a _type-routed_ skill explicitly. Rename to clarify it writes content (not creates it from nothing). |
| `d-review`        | `w-review`        | 6-phase orchestrator with side-car scripts. Gold standard. Add tier (`pre-commit` / `pre-merge` / `pre-release`).                                                                                      |
| `d-deploy`        | `w-deploy`        | Tight. Currently delegates to `d-fail` on failure; will delegate to `w-debug` after rename.                                                                                                            |
| `d-fail`          | `w-debug`         | **Scope-locked to Railway recovery.** Expand: deploy errors AND runtime crashes AND failing checks AND production bugs. Mode: fix. Tier: hot-fix / forensic.                                           |
| `d-infra`         | `w-infra`         | 14-line reference is anemic. Either grow it (Kamal/Railway/Docker patterns) or fold into `w-deploy`. Committee says: grow.                                                                             |
| `d-security`      | `a-security`      | Strong. Same body, prefix swap.                                                                                                                                                                        |
| `d-ai`            | `a-ai`            | Strong.                                                                                                                                                                                                |
| `d-ax`            | `a-ax`            | Strong.                                                                                                                                                                                                |
| `d-ux`            | `a-ux`            | Strong.                                                                                                                                                                                                |
| `d-dx`            | `a-dx`            | Strong.                                                                                                                                                                                                |
| `d-observability` | `a-observability` | Strong.                                                                                                                                                                                                |
| `d-health`        | `a-health`        | 10-session composite. Keep as the audit-of-audits. Add tier (`daily` / `weekly` / `monthly`).                                                                                                          |

Net: zero deletes, zero adds, two scope changes (`w-write` clarification, `w-debug` expansion), three category prefixes.

### 2b. The 10x principles — what makes our skills 10x better

After the committee, the seven principles below codify cold-start safety + agent ergonomics:

1. **Prefix-as-category** — `h-` / `w-` / `a-`. The agent picks role before name.
2. **Trigger triple** — every `description:` ends with `Triggers: <text aliases> | Voice: <speech aliases> | After: <upstream skill>`.
3. **Phase 0 is mechanical** — auto-load reference.md and closest CLAUDE.md via the `skill-reference` hook (already exists; expand to load CLAUDE.md too).
4. **Mode is declared, not inferred** — `Mode: report` or `Mode: fix` in the body. Audits are always report. Workflow varies. Harness is always fix.
5. **Tier where cost varies** — `quick / standard / exhaustive`. Audit + composite skills must expose tiers; one-shot skills don't need them.
6. **Output artifact pinned** — every skill names its artifact path. Audits write to `.gaia/audits/<skill>/<date>.md`. Workflow writes commits or PRs. Harness writes `SKILL.md` / `reference.md` / `rules.ts`.
7. **Reference normalization** — every reference.md is 200–800 lines. Skinny ones get filled, fat ones get split into sibling docs (`reference.md` + `examples.md` or `heuristics/`).

### 2c. What we explicitly DO NOT do

- **No new skills.** The committee's 10x is qualitative density, not quantitative sprawl.
- **No alias period.** Pre-launch, zero users; rename hard. Aliases would re-introduce the discovery tax we're removing.
- **No rules.ts coverage push.** That's 0001 territory; this initiative leaves rules.ts schema alone except for the SkillDomain rename.
- **No gstack vendoring expansion.** The 3 placeholders stay placeholders.

### 2d. Autoplan: CEO review (strategy)

Findings from a SELECTIVE EXPANSION mode review. All decisions auto-decided per the 6 principles (completeness · boil-the-lake · pragmatic · DRY · explicit · bias-toward-action).

| #     | Finding                                                                                                   | Auto-decision                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CEO-1 | Hypothesis baseline (~3.5/session) was inferred, not measured. Falsifier therefore unfalsifiable.         | **PR 0** adds `scripts/measure-skill-resolution.ts` to capture baseline BEFORE the rename ships. Writes to `.context/skill-baseline.json`. (P1 + P2)                             |
| CEO-2 | 10 constraints without a linter = vibes. Rename ships, constraints stay aspirational, we shuffle letters. | Bundle constraint enforcement (extending `scripts/check-skills.ts`) into PR 3 alongside SKILL.md updates — not a future PR. (P5)                                                 |
| CEO-3 | Original PR breakdown had PRs 2 + 3 + 4 as sequential mechanical passes with no review value separately.  | Combine into single PR 3 (bulk rename + constraint linter + reference normalization). (P3 pragmatic)                                                                             |
| CEO-4 | `d-infra` reference is 14 lines (committee verdict said "grow", initiative didn't commit).                | Commit: `w-infra/reference.md` grows to ≥200 lines (Kamal patterns, Railway escape hatches, Docker stages, GH Actions matrix). PR 3. (P1)                                        |
| CEO-5 | Voice triggers risk colliding with gstack global commands ("review" → /review (gstack) vs `w-review`).    | Add **C3-bis**: voice triggers must be unique against gstack global namespace; collisions get prefix-aware phrasing ("review my code", not "review"). PR 3 linter enforces. (P5) |
| CEO-6 | TASTE — single-letter `h-/w-/a-` vs full-word `harness-/workflow-/audit-`.                                | Single-letter. Tab-completion cheaper, fits resolver tables, prefix-as-route is the design. (P5)                                                                                 |
| CEO-7 | TASTE — `a-health` is composite-of-audits; should it have its own prefix (`c-` for composite)?            | Keep flat `a-` prefix. The composite IS an audit (audits-the-audits). One-letter system stays clean. (P5)                                                                        |

**6-month regret check:** the only finding that could look foolish is CEO-2. If we ship the rename and constraints stay aspirational, the agent first-pick accuracy gain comes from prefix routing alone — likely halving the hypothesis. The CEO review elevates constraint enforcement from "PR 3" to "blocking for ship".

### 2e. Autoplan: Eng review (architecture + tests)

| #     | Finding                                                                                                                                             | Auto-decision                                                                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENG-1 | `scripts/check-skills.ts` PHASE_EXEMPT set still references skills deleted in 0001 (`d-strategy`, `d-roadmap`, `d-harness`).                        | Drop dead names in PR 3. (P5)                                                                                                                                           |
| ENG-2 | No end-to-end resolver test exists. Two skills could share a trigger phrase silently.                                                               | Add `scripts/check-skill-triggers.ts` — validates trigger uniqueness across all skills; runs in `bun run check`. PR 3. (P1)                                             |
| ENG-3 | `w-debug` voice trigger string contains an unescaped apostrophe (`'something's wrong'`). Valid YAML but fragile to regex extractors.                | Polish in this PR — replace with `"something broke"` (no apostrophe). (P5)                                                                                              |
| ENG-4 | Frontmatter constraint enforcement (C3 voice + C4 mode + C5 tier + C6 artifact + C7 failure + C8 chain) is unenforced.                              | Extend `check-skills.ts` linter to validate each as a structural rule. Per-category whitelist (e.g. C5 only required for audit + composite + debug + write). PR 3. (P1) |
| ENG-5 | `SkillDomain` enum bulk rename safety: only one rule entry uses the strings (`voice/no-marketing-vocabulary`); rest of enum is reserved-for-future. | Confirmed safe. PR 3 ships the enum rewrite alongside folder renames. No risk. (P3)                                                                                     |
| ENG-6 | Voice triggers can fire fix-mode skills without confirmation. Theoretically a trojan vector.                                                        | Out of scope here. Note in §5 audit trail; future initiative. (P3 — don't expand into security)                                                                         |
| ENG-7 | TASTE — reference normalization metric: lines vs tokens.                                                                                            | Tokens. LLMs care about tokens. PR 3 measurement uses a token counter. (P1)                                                                                             |

**Architecture: skill resolver post-0006**

```
   user message
       │
       ▼
  ┌────────────────────┐
  │ Claude harness     │  matches description fields
  │ skill-resolver     │  + system prompt
  └────────┬───────────┘
           │ prefix routing (h/w/a)
           ▼
   ┌───────┴──────┬───────┴──────┬───────┴───────┐
   │ h-* harness  │ w-* workflow │ a-* audit     │
   │ h-skill      │ w-initiative │ a-security    │
   │ h-reference  │ w-code       │ a-ai          │
   │ h-rules      │ w-write      │ a-ax          │
   │              │ w-review     │ a-ux          │
   │              │ w-deploy     │ a-dx          │
   │              │ w-debug      │ a-observability│
   │              │ w-infra      │ a-health      │
   └───────┬──────┴───────┬──────┴───────┬───────┘
           │              │              │
           ▼              ▼              ▼
   reads SKILL.md ── auto-loads reference.md (skill-reference hook)
                  └─ auto-loads closest CLAUDE.md (domain-context hook)
                  │
                  ▼
   constraint-enforced output:
   - mode: report | fix
   - tier: quick | standard | exhaustive (where cost varies)
   - artifact: pinned path
   - failure mode: declared
```

**Test plan — what PR 3 must verify:**

| Codepath                                  | Test                                                           | New / existing          |
| ----------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| `SkillDomain` enum compiles               | `bun run typecheck`                                            | existing                |
| All SKILL.md files have valid frontmatter | `scripts/check-skills.ts`                                      | existing                |
| Trigger phrases are unique across skills  | `scripts/check-skill-triggers.ts`                              | **NEW**                 |
| Frontmatter contains required constraints | `scripts/check-skills.ts` extended with C1-C8 validators       | extend existing         |
| Reference.md token count in 200–800 range | `scripts/check-reference-shape.ts` extended with token counter | extend existing         |
| Hooks resolve renamed skills              | `.claude/hooks/*.test.ts`                                      | existing — just renames |

### 2f. Autoplan: DX review (the meta-recursive one)

Apply our own 8 DX dimensions to **our own skills**.

| #   | Dimension                           | Today (5.1 avg) | After 0006 (7.7 avg) | Δ               |
| --- | ----------------------------------- | --------------- | -------------------- | --------------- |
| 1   | TTHW (cold-start invocation)        | 4/10            | 8/10                 | +4              |
| 2   | API/CLI naming                      | 5/10            | 8/10                 | +3              |
| 3   | Error messages (failure modes)      | 3/10            | 7/10                 | +4              |
| 4   | Documentation (reference.md)        | 8/10            | 8/10                 | —               |
| 5   | Upgrade path                        | N/A pre-launch  | N/A                  | —               |
| 6   | Escape hatches (mode/tier override) | 4/10            | 7/10                 | +3              |
| 7   | Discoverability                     | 7/10            | 9/10                 | +2              |
| 8   | Composability (chain hints)         | 5/10            | 7/10                 | +2              |
|     | **Average (excl. N/A)**             | **5.1**         | **7.7**              | **+2.6 (≈51%)** |

**The magical moment**: an agent encounters `w-debug` for the first time. Reads only the 4-line `description:` frontmatter. Sees `Mode: fix · Tier: hot-fix \| forensic · Voice triggers · After: w-deploy`. Picks tier from failure signal, invokes immediately, ships fix. **Zero SKILL.md body read needed.** That's the cold-start bar PR 3 must enforce.

**Developer journey map (cold-start agent):**

| Stage    | Today                                          | After 0006                                         |
| -------- | ---------------------------------------------- | -------------------------------------------------- |
| Discover | scans CLAUDE.md (17 d-\*, 1 implicit category) | scans CLAUDE.md (3 categories visible from prefix) |
| Route    | reads ~14 candidate descriptions               | reads ~5 in matching category                      |
| Invoke   | reads full SKILL.md (~3000 tokens)             | invokes from frontmatter (~200 tokens)             |
| Output   | inline prose                                   | `=== <SKILL> REPORT ===` block (parseable)         |
| Chain    | re-reads SKILL.md to find "calls X"            | sees `After: <X>` in frontmatter                   |
| Recover  | unclear failure protocol                       | reads `## Failure modes` section (mandated by C7)  |

**TTHW**: 30 sec (5 reads, 3000 tokens) → 5 sec (1 read, 200 tokens). 6× faster cold-start. Drives the hypothesis update above.

| #    | DX finding                                                                                                                  | Auto-decision                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| DX-1 | C2 (cold-start safe): every skill frontmatter must be self-contained for invocation; today most need body.                  | Frontmatter is the contract. PR 3 linter enforces. (P1)                                   |
| DX-2 | C7 (failure mode): every fix-mode skill needs `## Failure modes` section. Audits in report-mode are exempt.                 | Mandate via linter. PR 3. (P1)                                                            |
| DX-3 | C5 (tier): only skills with cost variance need tiers. One-shot skills (h-\*, w-deploy) don't.                               | Linter enforces C5 only for `{audit, composite, w-debug, w-write}`. (P3)                  |
| DX-4 | TASTE — voice triggers expansive ("something broke") vs conservative ("debug this").                                        | Expansive — wider net catches more user phrasings. Combined with C3-bis namespacing. (P1) |
| DX-5 | Output artifact: pin per category — audits → `.gaia/audits/<skill>/<date>.md`, workflow → PR/commit, harness → skill files. | Document in §3 below. PR 3 linter validates. (P1)                                         |

### 2g. Cross-phase themes (high-confidence — flagged by 2+ phases)

1. **Constraint enforcement is load-bearing.** CEO-2, ENG-4, DX-1/2/3 independently flag: rename without a linter = letter-shuffling. Bundle linter into PR 3.
2. **Frontmatter is the contract.** DX-1 (cold-start), ENG-4 (linter target), CEO-1 (measurement parseability) converge on `description:` as the API surface.
3. **Token-budget thinking.** ENG-7 (normalization) + DX-1 (cold-start cost) → tokens, not lines, are the unit of skill quality.

## 3. Implementation

### Order of operations (revised post-autoplan)

1. **PR 0** — **measurement instrumentation** (NEW from CEO-1). Adds `scripts/measure-skill-resolution.ts` that parses Claude Code session transcripts and emits `(tthw_seconds, tokens_to_invocation, which-skill-clarifications)` per session. Writes `.context/skill-baseline.json` with the **pre-rename baseline**. Without this PR, the falsifier in the frontmatter is unfalsifiable.
2. **PR 1 (this branch, `skills-committee`)** — ships the initiative (with autoplan review baked in) + the two scope-changing renames (`d-content → w-write`, `d-fail → w-debug` with scope expansion). Two skills only — bodies actually change. Plus polish to exemplify the constraints (Tier on w-write, `## Failure modes` section on both, apostrophe fix on w-debug voice trigger).
3. **PR 2 (folded into PR 3 per CEO-3)** — intentionally absent.
4. **PR 3 (combined)** — bulk rename + constraint enforcement + reference normalization in **one mechanical pass per skill**:
   - Folder renames: 15 skills (h-skill, h-reference, h-rules; w-initiative, w-code, w-review, w-deploy, w-infra; a-{ai, ax, dx, ux, observability, security, health}).
   - SkillDomain enum rewrite in `.gaia/rules.ts`.
   - Frontmatter constraint linter: extend `scripts/check-skills.ts` to validate C1, C3, C3-bis, C4, C5 (per-category whitelist), C6, C7, C8 as structural rules. Drop dead names (`d-strategy`, `d-roadmap`, `d-harness`) from PHASE_EXEMPT (ENG-1).
   - New script: `scripts/check-skill-triggers.ts` (ENG-2) — validates trigger uniqueness across all skills + against gstack global namespace (loaded from a checked-in snapshot at `.context/gstack-globals.txt`).
   - Reference normalization (ENG-7): token-counter via `Bun.tokenizer` enforces 200–800 token range; grows `w-infra` (Kamal patterns + Railway escape hatches + Docker stages + GH Actions matrix) past 200; splits any reference >800 into sibling files.
   - Adds `## Failure modes` section to every fix-mode SKILL.md (DX-2).
   - Updates resolver tables in CLAUDE.md / .gaia/CLAUDE.md / .gaia/vision.md.
   - Cross-refs in hooks, scripts, runbooks.
5. **PR 4** — post-rename `/autoplan` second pass: re-runs CEO + Eng + DX phases against the new tree; appends findings to §5 audit trail. Cycles until DX scorecard hits target (≥8.0 avg). Iteration cap: 2.
6. **PR 5** — measurement validation: re-runs `scripts/measure-skill-resolution.ts` against new sessions; verifies threshold (TTHW <8s avg + <1.5 round-trips). Updates falsifier verdict in frontmatter to `PASSED` or `FAILED`.

### Output artifacts (pinned per category — DX-5)

| Category       | Output                               | Path                                   |
| -------------- | ------------------------------------ | -------------------------------------- |
| `a-*` audits   | scored report + trend                | `.gaia/audits/<skill>/<YYYY-MM-DD>.md` |
| `w-*` workflow | commit / PR / file in tree           | (varies — pinned in each SKILL.md)     |
| `h-*` harness  | mutates skill / reference / rules.ts | (the file itself)                      |

### Risks (revised)

| #   | Risk                                                                                                | Mitigation                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| R1  | Cross-ref drift mid-rename (15 skills × ~3 callsites each ≈ 45 edits).                              | PR 3 is mechanical and atomic. New `check-skill-triggers.ts` + extended `check-skills.ts` catch any broken reference.    |
| R2  | `0001`'s in-progress PR breakdown still mentions old names.                                         | Append-only audit trail rule applies; `0001` is not edited. `0006` is the new authority.                                 |
| R3  | `w-debug` scope expansion bloats the skill body past cold-start budget.                             | Frontmatter `description:` capped at ~250 tokens. Body ≤200 lines. PR 3 linter enforces.                                 |
| R4  | Voice triggers conflict with gstack global commands.                                                | C3-bis namespaces collisions ("debug review", "review my code"). Linter validates against `.context/gstack-globals.txt`. |
| R5  | **NEW (CEO-1)** — falsifier unfalsifiable without a baseline measurement.                           | PR 0 ships baseline BEFORE PR 1. PR 5 re-measures; verdict written into frontmatter.                                     |
| R6  | **NEW (CEO-2)** — rename ships, constraints stay vibes-only.                                        | Constraint linter is _blocking_ in PR 3 — `bun run check` fails until every SKILL.md passes C1–C8.                       |
| R7  | **NEW (ENG-6)** — voice triggers can fire fix-mode skills without confirmation. Theoretical trojan. | Out of scope. Tracked as a future initiative (probably 0007). Note in §5.                                                |

## 4. PR Breakdown (revised post-autoplan)

| PR  | Title                                                                | Files (high-level)                                                                                                                                                                                                                                                                                       | Status  |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | measurement instrumentation (NEW — CEO-1)                            | `scripts/measure-skill-resolution.ts`; `.context/skill-baseline.json`; `.context/gstack-globals.txt` snapshot                                                                                                                                                                                            | pending |
| 1   | initiative + d-content→w-write + d-fail→w-debug + autoplan review    | this file (with autoplan §2d–§2g baked in); `.claude/skills/{w-write,w-debug}/` (incl. ## Failure modes + tier on w-write + apostrophe fix); `rules.ts` SkillDomain; CLAUDE.md / .gaia/CLAUDE.md / vision.md callsites; scripts; runbooks                                                                | this PR |
| 3   | bulk rename + constraint linter + reference normalization (combined) | 15 skill folder renames (h/w/a); SkillDomain enum rewrite; extended `check-skills.ts` (C1, C3, C3-bis, C4, C5, C6, C7, C8); new `check-skill-triggers.ts`; `check-reference-shape.ts` token counter; `## Failure modes` on every fix-mode skill; w-infra grown to ≥200 tokens; resolver tables refreshed | pending |
| 4   | post-rename /autoplan second pass                                    | append findings to §5; iterate constraints until DX scorecard ≥8.0 (max 2 cycles)                                                                                                                                                                                                                        | pending |
| 5   | measurement validation                                               | re-run `measure-skill-resolution.ts`; update falsifier verdict; close initiative                                                                                                                                                                                                                         | pending |

## 5. Audit trail

- **2026-04-29 founder** — requested Committee of Garry review of Gaia skills vs gstack; committed to `h-/w-/a-` prefixes; locked `d-content → w-write` and `d-fail → w-debug` (scope expansion: deploy + runtime + checks + bugs).
- **2026-04-29 committee (Garry-five-hats)** — surfaced 10 common constraints; confirmed zero adds / zero deletes / two scope changes; produced the per-skill table above.
- **2026-04-29 PR 1** — initiative drafted on branch `skills-committee`; renames executed in same PR for the two scope-changing skills.
- **2026-04-29 autoplan (CEO + Eng + DX, single-reviewer mode)** — Codex unavailable in Conductor sandbox; degraded to Claude-only review per autoplan degradation matrix. Auto-decisions logged below using the 6 principles.

### Autoplan decision audit trail

| #   | Phase | Decision                                                                                   | Class      | Principle | Rationale                                                                                  |
| --- | ----- | ------------------------------------------------------------------------------------------ | ---------- | --------- | ------------------------------------------------------------------------------------------ |
| 1   | CEO   | Add PR 0 (measurement instrumentation) before PR 1                                         | mechanical | P1 + P2   | Hypothesis baseline was inferred not measured. Falsifier must be falsifiable.              |
| 2   | CEO   | Bundle constraint enforcement into PR 3 (not future PR)                                    | mechanical | P5        | Vibes-only constraints = letter-shuffling. Linter is the thing.                            |
| 3   | CEO   | Combine PRs 2 + 3 + 4 into single PR 3                                                     | mechanical | P3        | Mechanical passes gain nothing from separate review windows.                               |
| 4   | CEO   | Commit to growing w-infra reference to ≥200 tokens (Kamal/Railway/Docker/GH Actions)       | mechanical | P1        | Committee said "grow"; initiative didn't commit. Now committed.                            |
| 5   | CEO   | Add C3-bis: voice triggers namespaced when colliding with gstack global commands           | mechanical | P5        | Document the rule mechanically rather than avoid the collision.                            |
| 6   | CEO   | Single-letter `h-/w-/a-` (vs `harness-/workflow-/audit-`)                                  | **TASTE**  | P5        | Tab-completion cheaper, fits resolver tables, prefix-as-route is the design. Auto-decided. |
| 7   | CEO   | Keep `a-health` flat (vs separate `c-health` composite prefix)                             | **TASTE**  | P5        | Composite IS an audit. Single-letter system stays clean. Auto-decided.                     |
| 8   | Eng   | Drop dead names from check-skills.ts PHASE_EXEMPT (`d-strategy`, `d-roadmap`, `d-harness`) | mechanical | P5        | Stale references from 0001's deletions. Cleanup in radius.                                 |
| 9   | Eng   | Add `scripts/check-skill-triggers.ts` for trigger uniqueness                               | mechanical | P1        | Without this, two skills could share a phrase silently.                                    |
| 10  | Eng   | Fix `'something's wrong'` → `"something broke"` in w-debug voice trigger                   | mechanical | P5        | YAML accepts the apostrophe but it's fragile. Ship in this PR.                             |
| 11  | Eng   | Extend check-skills.ts linter for C3, C3-bis, C4, C5, C6, C7, C8                           | mechanical | P1        | Frontmatter is the contract; linter is the enforcer.                                       |
| 12  | Eng   | SkillDomain enum bulk rename is mechanically safe (only 1 rule entry uses strings)         | mechanical | P3        | Confirmed via grep. PR 3 ships rewrite without risk.                                       |
| 13  | Eng   | Voice-trigger trojan vector → out of scope for 0006                                        | mechanical | P3        | Future initiative. Tracked.                                                                |
| 14  | Eng   | Reference normalization metric: tokens (vs lines)                                          | **TASTE**  | P1        | LLMs care about tokens. Auto-decided.                                                      |
| 15  | DX    | C2 cold-start: frontmatter description must be self-contained                              | mechanical | P1        | Linter enforces. Frontmatter is the contract.                                              |
| 16  | DX    | C7 failure modes: every fix-mode skill needs `## Failure modes` section                    | mechanical | P1        | Linter enforces; audits in report-mode are exempt.                                         |
| 17  | DX    | C5 tier: limit enforcement to `{audit, composite, w-debug, w-write}`                       | mechanical | P3        | One-shot skills don't need tiers.                                                          |
| 18  | DX    | Voice triggers expansive ("something broke") vs conservative ("debug this")                | **TASTE**  | P1 + P3   | Wider net catches more user phrasings. Combined with C3-bis namespacing. Auto-decided.     |
| 19  | DX    | Output artifact pinned per category: a-_ → `.gaia/audits/...`, w-_ → varies, h-\* → file   | mechanical | P1        | Documented in §3.                                                                          |

**Cross-phase themes** (high-confidence — flagged by 2+ phases independently):

1. **Constraint enforcement is load-bearing.** CEO-2 + Eng-4 + DX-1/2/3.
2. **Frontmatter is the contract.** DX-1 + Eng-4 + CEO-1.
3. **Token-budget thinking.** Eng-7 + DX-1.

**Final review scores**

| Phase | Mode                | Findings | Auto-decided | Taste decisions | User challenges |
| ----- | ------------------- | -------- | ------------ | --------------- | --------------- |
| CEO   | SELECTIVE EXPANSION | 7        | 5            | 2               | 0               |
| Eng   | FULL_REVIEW         | 7        | 6            | 1               | 0               |
| DX    | DX POLISH           | 5        | 4            | 1               | 0               |
| Total |                     | **19**   | **15**       | **4**           | **0**           |

Per the founder's instruction ("do not ask me questions just make the necessary decisions"), all 4 taste decisions were auto-decided per principle. None of them were security/feasibility blockers — all preference calls within the locked direction.

**Status:** initiative APPROVED in autoplan auto-decide mode. Ready for /ship. Suggested next step after this PR lands: schedule PR 0 (measurement instrumentation) before any further skill changes.
