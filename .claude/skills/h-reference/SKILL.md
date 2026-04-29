---
name: h-reference
description: 'Author or rewrite a reference.md file (skill-scoped or product-scoped). Adversarial-review per principle, then 5-part shape rewrite, then add rules.ts entries. Mode: fix. Triggers: "h-reference", "write a reference", "rewrite reference", "create new reference", "audit reference". Artifact: .claude/skills/<skill>/reference.md or .gaia/reference/<area>/<doc>.md.'
---

# h-reference — Author / rewrite a reference file

## Quick Reference

- `/h-reference <name>` — author a new reference at `.gaia/reference/<name>.md` (or `product/<name>.md` / `features/<name>.md`)
- `/h-reference rewrite <path>` — adversarial rewrite of an existing reference

## What this does

Implements the workflow defined in `.gaia/reference/references.md`. The skill enforces: 6-specialist adversarial review per principle, the 5-part shape (description + 2-4 rules-bullets + enforcement + anti-pattern + pattern), and a `rules.ts` entry per principle. The skill IS the formalization of how Gaia evolves its constitution.

This is fix mode — the skill writes the file. Output: the new file + `rules.ts` entries + a panel review pasted into the PR body.

## When to run

- Adding a new reference (domain coverage gap, new feature reference, new product surface)
- Major rewrite of an existing reference (adversarial pass identified ≥2 broken principles)
- After `bun run rules:coverage` shows a domain has no rules.ts entries (orphan reference)

---

## Phase 0: Pre-condition (`bun run check`)

```sh
bun run check
```

Must pass before any work. If failing, stop — fix that first.

Then read, in this order:

1. `.gaia/reference/code.md` — original 4-part principle shape
2. `.gaia/reference/references.md` — meta (5-part shape, folder structure, workflow)
3. `.gaia/reference/methodology.md` — Constitutional Loop + RRS triad
4. The reference being rewritten (if rewrite mode)

Cold-start guarantee: even if the agent has prior context, re-reading these gates the work.

---

## Phase 1: Scope + folder placement

Decide what kind of reference this is:

- **Cross-cutting technical** (backend, frontend, security, …) → `.gaia/reference/<name>.md` (root)
- **Product-thinking** (onboarding, retention, pricing, …) → `.gaia/reference/product/<name>.md`
- **Per-feature** (a specific feature like CMS, admin, billing) → `.gaia/reference/features/<name>.md`

Confirm with one line back to the user:

```
Authoring: .gaia/reference/<placement>/<name>.md
Domain: <one sentence>
Loaded by: <which path patterns trigger auto-load via domain-context.ts>
```

If folder doesn't exist, create it.

---

## Phase 2: Extract candidate principles

Aim for **8–12 principles**. Sources, in priority order:

1. User input + the conversation context
2. Code evidence (read the relevant code files; what patterns recur?)
3. World-class specialist knowledge for the domain (research mentally, name the figures)
4. OWASP / W3C / standards bodies if applicable

Each candidate principle:

- One sentence
- Imperative present tense ("Pin the model per feature")
- States WHAT to do, not WHY (why goes in the description later)

Write the candidate list to working memory as a numbered list. Don't ship; this is intermediate.

---

## Phase 3: Adversarial review (the panel)

For each candidate principle: pick a **panel of 6 world-class specialists** for the domain. Each gives a one-line comment (constraint / problem / suggestion). Then a **conclusion paragraph** that synthesizes.

Examples of panels:

| Domain         | Specialist set                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| deployment     | Adam Wiggins (12-factor) · Charity Majors (SRE) · Will Larson · Jez Humble (CD) · Camille Fournier · Tanya Reilly |
| AI features    | Sarah Constantin · Anthropic safety eng · Hamel Husain · Eugene Yan · Simon Willison · Chip Huyen                 |
| onboarding     | Stewart Butterfield · Lenny Rachitsky · Andrew Chen · Ryan Singer · Wes Bos · Dan Wolchonok                       |
| retention      | Sean Ellis · Casey Winters · Andrew Chen · Itamar Gilad · Rahul Vohra · Dan Olsen                                 |
| any new domain | Pick 6 by recognized expertise in that field. State why each was picked.                                          |

Format the review **visibly** (in chat output / PR body):

```
### P1. <principle title>

| Specialist | Comment |
| --- | --- |
| Name      | One-line comment |
| ...       | ...              |

**Conclusion:** <one paragraph synthesizing>

**10x version:** "<rewritten principle title + one-sentence description>"
```

Skip principles whose 10x version is identical to the original — those didn't need review (rare).

---

## Phase 4: Write the 10x file (the 5-part shape)

For each principle (use the exact format below):

```md
### N. <Imperative title>

<One-paragraph description. What the principle is, in plain language.
Why it matters, briefly. Reference adjacent docs by path if helpful.>

**Rules / Guidelines / Boundaries:**

- <Imperative bullet 1>
- <Imperative bullet 2>
- <Imperative bullet 3 (optional, max 4)>

**Enforcement:** <name the mechanism: rule `<id>` (kind: script/ast-grep/hook/oxlint/tsc/ci) — one-line description>; OR `pending: <target mechanism>` if not yet enforced.

**Anti-pattern:**

\`\`\`<lang>
// ❌ <one-line caption>
<runnable code or copy-pasteable example>
\`\`\`

**Pattern:**

\`\`\`<lang>
// ✅ <one-line caption>
<runnable code>
\`\`\`

---
```

Header block (every reference):

```md
# <Title> — <Tagline>

> Status: Reference
> Last verified: <Month YYYY>
> Scope: <one-line scope statement>
> Paired with: `references.md` (shape), `<adjacent>.md` (`<role>`), ...
```

Closing sections (every reference):

- `## Enforcement mapping` — table of principle → mechanism → rules.ts id
- `## Cross-references` — bullets with paths and external links
- `## Decisions log` — dated table; add an entry for any locked decision

---

## Phase 5: Add `rules.ts` entries (1:1 mapping)

For EACH principle, append an entry to `.gaia/rules.ts`:

```ts
{
  id: '<reference>/<principle-slug>',
  reference: '<reference-domain>',
  description: '<one sentence describing the principle>',
  tier: 'lint' | 'architecture' | 'hook' | 'test',
  mechanism: { kind: 'pending', note: '<target mechanism, e.g. ast-grep rule X (planned)>' },
}
```

If the `SkillDomain` type doesn't include this skill or folder yet, extend the union type at the top of `rules.ts`.

If you can ship a real mechanism today (script, hook, oxlint, ast-grep), do it in this phase and update the entry. The pending → enforced cycle SLO is 14 days per `h-rules/reference.md` principle 2.

---

## Phase 6: Wire scoped loading (if applicable)

If the new reference is per-feature or has a specific path domain, update `.claude/hooks/domain-context.ts`:

1. Add a Rule entry mapping the path test to the reference
2. Run a quick mental test: if I'm editing `<typical file in domain>`, would this rule fire?

For per-feature references (`features/<x>.md`), the existing `featureRefFor()` helper in domain-context.ts handles path-derivation automatically — no edit needed.

---

## Phase 7: Update MANIFEST and resolvers

If the file location is new (e.g., first file in a new folder):

1. `.gaia/MANIFEST.md` — add to the index
2. Root `CLAUDE.md` — add to the docs resolver table
3. `.gaia/CLAUDE.md` — add to the routing table; bump the count ("21 reference files" → N+1)

---

## Phase 8: Final gate (`bun run check`)

```sh
bun run check
```

This runs:

- `oxlint` + `oxfmt` (style)
- `ast-grep scan` (architectural rules)
- `tsc --noEmit` (types — confirms `SkillDomain` extension)
- `bun packages/security/harden-check.ts` (security)
- `bun scripts/check-reference-shape.ts` (this skill's enforcement)
- All other check:scripts

If `check-reference-shape.ts` fails on the new file, fix the missing parts. The skill is incomplete until this gate is green.

Then:

```sh
bun run rules:coverage
```

The new principles appear in the pending list. That's expected — they're tracked.

---

## Output

Mode: **fix** — the skill writes a new (or rewritten) `.gaia/reference/*.md` file plus matching `rules.ts` entries, then verifies the check pipeline. Two artifacts, posted to the PR body:

1. **The adversarial review** (Phase 3) for every principle — visible to reviewers.
2. **The diff summary** — one line per principle, naming the rules.ts id created.

```
=== D-REFERENCE: <path> ===

Adversarial reviews: 8 principles, 6 specialists each
rules.ts entries added: 8 (all pending; cycle SLO 14 days)
Folder placement: .gaia/reference/product/onboarding.md
Auto-load: domain-context.ts rule for /onboard|signup|login/
Check pipeline: green
Last verified: April 2026
```

---

## Rules

- ALWAYS read `.gaia/reference/references.md` and `code.md` before authoring (Phase 0)
- NEVER skip the adversarial review (Phase 3) — it's the moat
- NEVER ship a principle without a `rules.ts` entry (Phase 5) — even pending
- ALWAYS use the 5-part shape per principle (Phase 4) — `check-reference-shape.ts` enforces
- NEVER auto-fix the agent's review (the user picks the panel; the agent surfaces conclusions, doesn't manufacture them)
- ALWAYS run `bun run check` as the final gate (Phase 8) — sandwich pattern from `skills.md`

## Failure modes

- **5-part shape can't be applied** to existing prose (e.g. principle has no enforceable mechanism) — write as an aspirational entry with `mechanism: { kind: 'pending' }` and flag for follow-up. Don't fabricate enforcement.
- **`scripts/check-reference-shape.ts` red after rewrite** — revert; report which principle failed which part.
- **`rules.ts` insertion conflicts** (two skills claim same rule id) — abort and ask which owns it. Don't silently overwrite.
