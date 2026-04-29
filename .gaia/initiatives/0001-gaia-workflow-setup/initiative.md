---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: Collapsing Gaia's methodology to three meta-concepts (skill, reference, rules) with 1:1 skill↔reference pairing and fractal CLAUDE.md replacing the flat reference folder reduces context-load cost per task by ≥40% and removes the workflow re-decisions that taxed prior initiatives.
falsifier: After 0001 ships, 0002 + 0003 still spend >20% of their hours on "where does this principle live?" or "what does the agent load?" type questions. Window: through 0003 ship-date.
measurement: { metric: "% time on workflow questions vs feature work in 0002+0003 commits", source: "git log + commit message tagging", baseline: "~30% inferred from prior autoplan rounds", threshold: "<20%", window_days: 60, verdict: "TBD" }
status: in-progress
---

# Initiative 0001 — Gaia Workflow Setup

## 1. Context / Research

Today's state: 22 root-level references, 10+ d-\* skills, no skill↔reference pairing convention, `domain-context` hook only loads on file edit. Skills inline `Read .gaia/reference/<x>.md` in Phase 0 (no auto-load on Skill invocation). methodology.md, harness.md, workflow.md cover overlapping ground. ax.md and skills.md duplicate. Pre-launch: zero users — refactor is unconstrained by backwards compatibility.

Founder's mental model (locked 2026-04-28):

- Three concepts: **skill, reference, rules**. Three meta-skills (`d-skill`, `d-reference`, `d-rules`). 1:1 skill↔reference pairing.
- References live INSIDE skill folders (`<skill>/reference.md`). Old `.gaia/reference/` folder dissolves.
- Folder-scoped principles become **fractal CLAUDE.md** (apps/api/CLAUDE.md replaces backend.md, etc.).
- No projects layer (d-roadmap deleted). Initiative = one file end-to-end.
- No d-onboard, no d-gaia. Audit skills (d-security, d-ai, d-ax, d-ux, d-observability, d-dx) replace cross-cutting refs.

## 2. Strategy

**Problem**: methodology drifts because there's no closed triad. Same principle ends up in 3 places, none authoritative.

**Approach** (chosen): close the Skill ↔ Reference ↔ Rules triad. 1:1 pairing. Fractal CLAUDE.md for folder-scoped principles. Audit skills for cross-cutting concerns.

**Cap table** (what 0001 ships v1.0):

| Surface         | Ships v1.0                                                              | Capped                         |
| --------------- | ----------------------------------------------------------------------- | ------------------------------ |
| Renames         | d-strategy → d-initiative; d-tdd → d-code                               | (no aliases)                   |
| Deletes         | d-roadmap, d-harness                                                    | —                              |
| Meta-skills     | d-rules (NEW), d-reference (already), d-skill (already)                 | —                              |
| Config/ops      | d-infra (NEW), d-deploy (NEW)                                           | d-onboard (rejected)           |
| Audit skills    | d-security, d-ai, d-ax, d-ux, d-observability, d-dx                     | d-performance (defers to 0003) |
| Hooks           | skill-reference (NEW); domain-context (rewrite to walk fractal tree)    | —                              |
| Reference moves | 18 files migrated (12 into skills, 6 into fractal CLAUDE.md, 1 deleted) | vision.md + product/ preserved |

**Preserved** (per founder round-3): `.gaia/vision.md`, `.gaia/reference/product/onboarding.md`, `.gaia/reference/product/retention.md`. No `content/` folder.

## 3. Implementation

**Order of operations** (so nothing breaks mid-refactor):

1. Scaffold new skill folders WITH reference.md siblings before deleting any old reference (PR 1, PR 7).
2. Migrate content per-domain (PRs 2, 8, 9).
3. Rename d-strategy and d-tdd, delete d-roadmap and d-harness (PRs 3, 4, 5).
4. Create fractal CLAUDE.md (PR 10).
5. Update hooks (PR 11).
6. Cleanup `.gaia/reference/` (PR 12).
7. Index + initiative folders (PRs 13, 14).
8. rules.ts schema (PR 15).
9. Resolver updates (PR 16).
10. Fresh-eyes review (PR 17).

**Risks**:

1. Content loss during move. Mitigation: every reference moves intact; new homes are append-only on first pass; never delete-before-write.
2. `rules.ts` references break (the `reference: 'backend'` field becomes meaningless). Mitigation: `ReferenceDomain` → `SkillDomain` (PR 15) ties to new skill names.
3. Hook regression. Mitigation: keep both hooks parallel for one commit, then remove the old logic (PR 11).
4. Skill rename breaks any skill that calls another by name. Mitigation: grep for old names; update every call site (no aliases). Done in PRs 3, 4, 5.

## 4. PR Breakdown

| PR  | Title                                                                | Files (high-level)                                                                                                                         | Status          |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 0   | pre-refactor cleanup (vision v7, drop unused scaffolding)            | .gaia/MANIFEST.md, audit/, memory/, conductor.ts, ADRs, scripts/check-manifest.ts, package.json                                            | **#34 ✅ open** |
| 1   | three meta-skill folders + reference.md siblings                     | .claude/skills/d-rules/{SKILL.md,reference.md}; d-reference/reference.md; d-skill/reference.md                                             | **#35 ✅ open** |
| 2   | merge methodology+harness+workflow → d-rules/reference.md            | .claude/skills/d-rules/reference.md (merged content); delete originals                                                                     | pending         |
| 3   | rename d-strategy → d-initiative                                     | folder rename + cross-refs                                                                                                                 | **#36 ✅ open** |
| 4   | rename d-tdd → d-code                                                | folder rename + cross-refs                                                                                                                 | **#37 ✅ open** |
| 5   | delete d-roadmap and d-harness                                       | folders removed + cross-refs purged                                                                                                        | **#38 ✅ open** |
| 6   | d-rules SKILL.md content + rules.ts entries                          | .claude/skills/d-rules/SKILL.md (phases); .gaia/rules.ts (entries per principle)                                                           | pending         |
| 7   | create 8 new skills with reference.md siblings                       | d-infra, d-deploy, d-security, d-ai, d-ax, d-ux, d-observability, d-dx (16 files)                                                          | pending         |
| 8   | migrate audit-skill ref content (security/ai/ax/ux/observability/dx) | move 6 source .md → audit-skill reference.md; delete originals                                                                             | pending         |
| 9   | migrate workflow + authoring ref content                             | code+testing+errors → d-code; deployment → d-deploy; references → d-reference; skills+ax → d-skill; voice → d-content; commands.md deleted | pending         |
| 10  | fractal CLAUDE.md (9 folders)                                        | apps/, apps/api/, apps/web/, apps/web/ui/, packages/, packages/db/, packages/auth/, packages/security/, packages/adapters/                 | pending         |
| 11  | domain-context hook + skill-reference hook                           | .claude/hooks/domain-context.ts (rewrite); .claude/hooks/skill-reference.ts (NEW)                                                          | pending         |
| 12  | clean up .gaia/reference/ (preserve product/ + vision)               | delete migrated root-level refs; preserve product/onboarding.md, retention.md, vision.md                                                   | pending         |
| 13  | replace roadmap.md with initiatives/CLAUDE.md index                  | thin index file replaces flat roadmap                                                                                                      | **#39 ✅ open** |
| 14  | create 5 initiative folders, archive existing                        | 0001 (full text) + 0002-0005 (stubs) + \_archive/\* (this PR)                                                                              | **THIS PR**     |
| 15  | rules.ts schema: ReferenceDomain → SkillDomain                       | rename type + values + every rule entry                                                                                                    | pending         |
| 16  | update root CLAUDE.md and .gaia/CLAUDE.md resolvers                  | reflect skill ↔ reference + fractal CLAUDE.md tree                                                                                         | pending         |
| 17  | fresh-eyes review                                                    | read-only audit; grep for deleted-name strings; should be 0                                                                                | pending         |

## 5. Decision Audit Trail

| ID   | Decision                                                                                                                                        | Source                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| F-1  | Three meta-concepts: skill, reference, rules. 1:1 skill↔reference pairing.                                                                      | Founder 2026-04-28 mid-plan rebake |
| F-2  | References live INSIDE skill folders (`<skill>/reference.md`).                                                                                  | Founder 2026-04-28                 |
| F-3  | Old reference folder dissolves: most refs move into a skill, the rest become fractal `CLAUDE.md` files.                                         | Founder 2026-04-28                 |
| F-4  | `d-strategy` → `d-initiative`; `d-tdd` → `d-code`; `d-roadmap` deleted; `d-harness` deleted (folds into `d-rules`).                             | Founder 2026-04-28                 |
| F-5  | No projects layer. d-initiative produces ONE file with research + strategy + implementation + PR breakdown.                                     | Founder 2026-04-28                 |
| F-6  | No `d-onboard`. Onboarding via CLI verbs only (changes 0002 scope).                                                                             | Founder 2026-04-28                 |
| F-7  | No `d-gaia`. Methodology = three meta-skills.                                                                                                   | Founder 2026-04-28                 |
| F-8  | Three new skills create: `d-infra`, `d-deploy`, `d-security` (and `d-performance` if scope allows).                                             | Founder 2026-04-28                 |
| F-9  | `vision.md` **preserved** (used later); `roadmap.md` deleted (replaced by folder ordering + thin index).                                        | Founder 2026-04-28 round 3         |
| F-10 | Initiative folder names use 4-digit prefix: `0001-`, `0002-`, …                                                                                 | Founder 2026-04-28                 |
| F-11 | The repo IS the SaaS template. No separate `template/` folder. CLI clones repo (default) or `--bare` for methodology only.                      | Founder 2026-04-28                 |
| F-12 | Pre-launch: no backwards compatibility, no aliases, no shims. Refactor cleanly.                                                                 | Founder 2026-04-28                 |
| F-13 | `ai`, `ax`, `ux`, `observability`, `dx` all become audit skills (same shape as `d-security`), all ship in 0001. `d-performance` defers to 0003. | Founder 2026-04-28 round 3         |
| F-14 | `.gaia/reference/product/onboarding.md` and `retention.md` **preserved** at current path (used later).                                          | Founder 2026-04-28 round 3         |
| F-15 | No `content/` folder. Reverses the earlier draft that planned `content/CLAUDE.md`.                                                              | Founder 2026-04-28 round 3         |
