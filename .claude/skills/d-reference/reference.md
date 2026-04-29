# References — How we write reference files

> Status: Reference (the meta-reference: how to write the others)
> Last verified: April 2026
> Scope: Conventions for every file in `.gaia/reference/` — shape, loading, enforcement, lifecycle
> Paired with: `code.md` (the constitution shape), `methodology.md` (the Constitutional Loop), `skills.md` (skill conventions), `ax.md` (agent experience)

---

## What this file is

References are the "loaded nouns" of the Reference–Rule–Skill (RRS) triad (see `methodology.md`). They tell the agent _what to do in a domain_ — consulted at the moment of action, not read on session start. This file is the meta-reference: the conventions every reference must follow.

Read `code.md` first for the original 4-part principle shape (we extend it to 5 here). Read `methodology.md` for the Constitutional Loop. Then this file.

---

## The 5-part principle shape (canonical)

Every numbered principle in any reference uses this exact shape:

1. **Title + one-paragraph description** — what the principle is, in plain language.
2. **Rules / Guidelines / Boundaries** — 2–4 bullet points. Imperative; answer "what specifically is allowed or forbidden."
3. **Enforcement** — name the mechanism (script, ast-grep, oxlint, hook, ci, tsc, or `pending: <target mechanism>`). Generic words like "reviewed" don't count.
4. **Anti-pattern** — runnable / copy-pasteable code or example showing the failure mode.
5. **Pattern** — runnable / copy-pasteable code showing the right shape.

This shape is how `d-reference` skill writes new references. It is also what `d-review` checks during reference reviews.

---

## The 8 reference principles

### 1. A reference is consulted, not taught

A reference is information-oriented and stable: the agent reads it during action to answer "is this still allowed? what's the right shape?" If the file has to explain itself or onboard a reader, it's a tutorial — move that content to a separate doc and shrink the reference.

**Rules / Guidelines / Boundaries:**

- Reference content is imperative and present-tense ("Use TypeBox at route boundaries"), not narrative ("Here's how you might think about validation…")
- A reference loaded mid-task delivers signal in <30 seconds of reading
- Tutorials and "getting started" content go in `README.md` or `dx.md`, not in references
- Reference length: prefer 200–500 lines; >800 means split

**Enforcement:** `d-review` voice/length check (planned `scripts/check-reference-shape.ts`); rule `references/voice-imperative` (pending — soft regex).

**Anti-pattern:**

```md
<!-- ❌ Reads like a textbook chapter — narrates instead of prescribes -->

## Database

When working with databases, you might wonder how to handle migrations.
This is a complex topic. There are many approaches. In Gaia we tend to…
```

**Pattern:**

```md
<!-- ✅ Imperative; present tense; bullets answer specific questions -->

## 3. Migrations are forward-only

Every schema change is additive within one deploy.

- Generate via `bunx drizzle-kit generate` — never write SQL by hand
- Idempotent: re-running the migration journal is a no-op
- Breaking changes: expand → backfill → contract across ≥2 deploys
```

---

### 2. Every principle has the 5-part shape

Title + description → 2–4 rules → enforcement → anti-pattern → pattern. No exceptions. The shape is what makes references mechanically reviewable, what makes `d-reference` writable, and what gives the agent a predictable place to find each part.

**Rules / Guidelines / Boundaries:**

- Rules/Guidelines bullets MUST be 2–4 (count enforced); each is imperative
- Anti-pattern + Pattern MUST be runnable code, valid JSON/YAML, or a verifiable example — NOT narrative prose
- Enforcement MUST name a mechanism kind (`script`, `ast-grep`, `hook`, `oxlint`, `tsc`, `ci`, `pending`)
- A `pending` enforcement MUST name its target mechanism (not "TBD")

**Enforcement:** `scripts/check-reference-shape.ts` (planned) — parses each `### N.` heading and validates structure presence + bullet count + enforcement-mechanism string format.

**Anti-pattern:**

```md
<!-- ❌ Missing rules bullets; enforcement is vague -->

### 7. Rate limits

Rate limit public endpoints. Be careful.

**Enforcement:** Reviewed.
```

**Pattern:**

```md
<!-- ✅ Full 5-part shape -->

### 7. Rate limits on public endpoints

Every public endpoint applies rate-limit middleware before any handler logic.

**Rules / Guidelines / Boundaries:**

- Use `publicRoute()` wrapper (composes rate-limit + headers)
- Limit defaults: 60 req/min/IP for unauthenticated, 600 req/min/user for authenticated
- Higher-cost endpoints (AI, payments) override to a tighter limit per route
- Bypass exists ONLY for `/health` and webhook routes (signature-verified)

**Enforcement:** rule `security/rate-limit-on-public` (mechanism: ast-grep `security-rate-limit-on-public`).

**Anti-pattern:** [code]

**Pattern:** [code]
```

---

### 3. Every reference principle maps 1:1 to a `rules.ts` entry

Cross-link to `methodology.md` §2. A reference principle without a `rules.ts` entry (even pending) is aspirational — agent has no signal it's checked. A `rules.ts` entry without a reference is inscrutable. Both are debt.

**Rules / Guidelines / Boundaries:**

- Adding a principle to a reference requires adding a `rules.ts` entry in the SAME PR
- Pending entries name their target mechanism in the `note:` field (e.g. `"ast-grep rule X (planned)"`)
- Pending → enforced cycle time SLO: 14 days (per `methodology.md` §2)
- `bun run rules:coverage` lists pending entries; CI surfaces on every PR

**Enforcement:** `scripts/rules-coverage.ts` (existing); planned `scripts/check-reference-rule-mapping.ts` walks reference files and confirms each principle has a `rules.ts` entry.

**Anti-pattern:**

```ts
// ❌ Reference declares "audit logs on every mutation" but rules.ts has no entry
// agent gets no enforcement signal; "rule" is aspirational
```

**Pattern:**

```ts
// ✅ Reference principle in security.md, paired with rules.ts entry:
{
  id: 'security/audit-on-mutation',
  reference: 'security',
  description: 'Every mutation route writes an audit log entry.',
  tier: 'lint',
  mechanism: { kind: 'pending', note: 'ast-grep rule require-audit-on-mutation (planned)' },
}
```

---

### 4. References load by path; never all-at-once

Loading every reference for every edit blows context. The `domain-context` hook reads the file path of the edit and loads the matching reference(s). Mapping convention is documented and stable.

**Rules / Guidelines / Boundaries:**

- Path-to-reference mapping lives in `.claude/hooks/domain-context.ts`
- Editing `apps/api/server/**` or `packages/{adapters,auth,security,workflows}/**` loads `backend.md`
- Editing `apps/web/src/**` loads `frontend.md`
- Editing `packages/db/**` loads `database.md`
- Editing inside a `features/<x>/` folder loads `features/<x>.md` (per principle #5) PLUS the relevant root-level reference

**Enforcement:** Hook implementation in `.claude/hooks/domain-context.ts`; rule `harness/auto-load-references` (existing).

**Anti-pattern:**

```sh
# ❌ Agent reading every reference at session start — context blowout
$ for f in .gaia/reference/*.md; do cat "$f"; done   # 25× cost on every conversation
```

**Pattern:**

```ts
// ✅ domain-context.ts — path → reference mapping
const RULES = [
  { match: /^apps\/api\/server\//, refs: ['backend.md'] },
  { match: /^apps\/web\/src\//, refs: ['frontend.md'] },
  { match: /^packages\/db\//, refs: ['database.md'] },
  { match: /^apps\/api\/features\/(\w+)\//, refs: ['backend.md', 'features/$1.md'] },
]
```

---

### 5. Per-feature references live with the feature

A reference dedicated to one feature (CMS, admin panel, billing flow) is loaded ONLY when the agent edits that feature. Cross-feature, foundational references (`code`, `backend`, `security`, …) live at the reference root.

**Rules / Guidelines / Boundaries:**

- Per-feature reference path: `.gaia/reference/features/<feature>.md`
- Backend code-folder rules live in `apps/api/features/<feature>/CLAUDE.md` (different surface)
- The two surfaces don't duplicate: feature reference = product / domain principles; code-folder CLAUDE.md = code-level conventions
- A feature reference auto-loads via the `features/<feature>.md` rule in `domain-context.ts`

**Enforcement:** Convention encoded in `domain-context.ts`; rule `references/feature-scope` (pending — script that walks `apps/api/features/<x>/` and verifies a matching `features/<x>.md` exists if the feature has a product-level reference).

**Anti-pattern:**

```sh
# ❌ Feature reference at root with all the others — bloat + always-loaded
.gaia/reference/
├── cms.md           # only relevant when editing CMS code
├── admin.md         # only relevant when editing admin
├── billing.md       # only relevant when editing billing
└── (everything always loads, regardless of edit location)
```

**Pattern:**

```sh
# ✅ Feature references in features/, scoped loading
.gaia/reference/
├── code.md          # cross-cutting; loaded broadly
├── backend.md
├── frontend.md
└── features/
    ├── cms.md       # loaded only when editing apps/{api,web}/...features/cms/*
    └── billing.md   # loaded only when editing apps/{api,web}/...features/billing/*
```

---

### 6. Adversarial review precedes a 10x rewrite

New reference files (and major rewrites) go through a panel of 6 world-class specialists per principle. Each specialist comments on constraint / problem / suggestion. The panel's conclusions inform a "10x version" of each principle. The review is visible in the PR — traceability for why principles got their shape.

**Rules / Guidelines / Boundaries:**

- Each principle gets a one-line comment from each of 6 specialists
- Specialists picked for fit (12-factor → Wiggins; AI safety → Anthropic; etc.)
- Conclusion paragraph synthesizes; 10x version is the rewrite
- The review writes itself into the PR description / conversation thread

**Enforcement:** Encoded in `d-reference` skill (`.claude/skills/d-reference/SKILL.md`). The skill IS the review process; reviewer reads the skill output before approving the PR.

**Anti-pattern:**

```md
<!-- ❌ Solo author writes 10 principles — no opposition tested -->

I think we should always X.
I think we should also Y.
(no review; principles ship as-written)
```

**Pattern:**

```md
<!-- ✅ Panel review per principle; conclusion → rewrite -->

## Principle 3: Migrations are forward-only

| Specialist | Comment                                       |
| ---------- | --------------------------------------------- |
| Wiggins    | Add expand-then-contract for breaking changes |
| Majors     | Forward-only or reversible? Define.           |
| ...        | ...                                           |

**Conclusion:** ...

**10x version:** "Schema changes are additive and run before code..."
```

---

### 7. References declare a `Last verified` date; staleness >180 days is debt

References rot silently. The `Last verified` field in the header makes rot visible. The `d-health` quarterly audit picks up stale references and surfaces them; either the reference is re-verified (date bumps) or it's revised.

**Rules / Guidelines / Boundaries:**

- Header MUST include `> Last verified: <Month YYYY>`
- 180-day window: anything older is "stale" debt
- `d-health` audit runs quarterly and lists stale references
- Re-verification = read the reference, confirm code still matches, bump the date

**Enforcement:** rule `references/staleness` (mechanism: pending — `scripts/check-reference-staleness.ts`).

**Anti-pattern:**

```md
<!-- ❌ No Last verified — rot is invisible -->

# Backend

> Status: Reference
> Scope: ...

(written 2 years ago; refers to deleted modules; no one knows)
```

**Pattern:**

```md
<!-- ✅ Last verified surfaced; quarterly re-check -->

# Backend

> Status: Reference
> Last verified: April 2026
> Scope: ...
```

---

### 8. References are imperative-prescriptive

Every numbered principle uses imperative present tense ("Use X", "Validate at edges", "Pin the model"). Avoid descriptive prose ("X is used here"). The agent extracts action from references; passive voice loses signal.

**Rules / Guidelines / Boundaries:**

- Use imperative verb in present tense for principle titles
- Bullets are imperative ("Validate", "Block", "Generate"), not descriptive ("Should be validated")
- Avoid hedge words: "tend to", "usually", "in most cases", "you might want to"
- Code examples in anti-pattern/pattern carry their own evidence; minimize prose around them

**Enforcement:** rule `references/voice-imperative` (mechanism: pending — soft regex flagging hedge words in reference files; advisory).

**Anti-pattern:**

```md
<!-- ❌ Hedge words; descriptive instead of prescriptive -->

### 5. Performance considerations

In most cases, you might want to consider adding indexes to commonly queried columns.
There are several patterns that tend to work well in practice...
```

**Pattern:**

```md
<!-- ✅ Imperative; present-tense; specific -->

### 5. Index every foreign key and queried column

Indexes on FK and predicates are mandatory for routes serving lists.

- Add index in the `pgTable` definition (`(table) => [index('x_idx').on(...)]`)
- Run EXPLAIN on production-shaped data; cost > 10× table size = missing index
- ...
```

---

## Folder structure (v1)

```
.gaia/reference/
├── (current 22 root-level references — code.md, methodology.md, etc.)
├── product/                  # product-thinking; loaded for product surfaces
│   ├── onboarding.md
│   ├── retention.md
│   └── (future: pricing.md, acquisition.md, legal.md)
├── features/                 # per-feature; scoped loading by file path
│   └── <feature>.md          # added as features ship
└── references.md             # THIS file — the meta
```

**When to add a folder:** when ≥3 references share a kind. `product/` is justified by 2 + 3 deferred candidates. `features/` is justified by the per-feature scoping rule.

**Migration of existing files:** explicitly deferred. Path changes break links. v2 may regroup once the patterns settle.

---

## Workflow — how to add a reference

This is what `d-reference` skill executes step-by-step.

1. **Trigger.** Identify a domain with ≥3 cross-cutting concerns or a product feature with shippable principles.
2. **Inputs.** User input + your research + Anthropic / world-class specialist knowledge for that domain.
3. **Extract candidate principles.** Aim for 8–12. Each principle is one sentence, imperative voice.
4. **Adversarial review per principle.** Panel of 6 specialists picked for fit. Each gives a one-line comment (constraint, problem, or suggestion). Conclusion synthesizes.
5. **Write 10x version.** Per principle, in the 5-part shape: description + 2–4 rules + enforcement + anti-pattern + pattern.
6. **Add `rules.ts` entries.** One per principle, even if pending. Name the target mechanism in pending notes.
7. **Update folder structure / domain-context hook.** If the new reference is feature-scoped, add the path mapping.
8. **Run `bun run check`.** Format, types, scripts. Fix any failures.
9. **Update `MANIFEST.md`** if the file location is new.
10. **Open the PR.** The adversarial review goes in the PR body / conversation. Reviewer reads it before approving.

---

## Enforcement mapping

| Principle                                  | Mechanism                                    | rules.ts entry                        |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------- |
| 1. Consulted, not taught                   | `d-review` voice check (planned)             | _pending: references/voice-consulted_ |
| 2. 5-part shape                            | `scripts/check-reference-shape.ts` (planned) | `references/principle-shape`          |
| 3. 1:1 with `rules.ts`                     | `rules-coverage` + planned mapping check     | `references/principle-has-rule`       |
| 4. Path-scoped loading                     | `.claude/hooks/domain-context.ts`            | `harness/auto-load-references`        |
| 5. Per-feature references with the feature | `domain-context.ts` + planned check          | `references/feature-scope`            |
| 6. Adversarial review                      | `d-reference` skill                          | `references/adversarial-review`       |
| 7. Last verified                           | Planned `check-reference-staleness.ts`       | `references/staleness`                |
| 8. Imperative-prescriptive                 | Planned soft-regex check                     | `references/voice-imperative`         |

---

## Cross-references

- The Constitutional Loop: `methodology.md`
- Constitution shape: `code.md`
- Skill conventions: `skills.md`
- Path-loading hook: `.claude/hooks/domain-context.ts`
- Coverage report: `bun run rules:coverage`
- Diátaxis docs framework: https://diataxis.fr/

---

## Decisions log

| Date       | Decision                                                          | Rationale                                                                                                                           |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Adopt 5-part principle shape (extends code.md's 4-part)           | Adding 2–4 rules-bullets between description and enforcement gives the agent a quick-scan answer to "what specifically is allowed". |
| 2026-04-28 | Folder structure: `product/`, `features/`; existing files at root | Minimal disruption; introduces the folder pattern for new content; future migrations can regroup.                                   |
| 2026-04-28 | Adversarial review (6 specialists) before any new reference       | Prevents single-author blind spots; codified in `d-reference` skill so the workflow is reproducible.                                |
| 2026-04-28 | Per-feature references load by path; live in `features/<x>.md`    | Loading 25 refs per edit is a context-cost bug. Path-scoped loading is the moat.                                                    |
| 2026-04-28 | `Last verified` field mandatory; 180-day staleness window         | Doc rot is invisible without dates; 180 days is liberal for a v1 audit cadence.                                                     |

_Update this log when reference conventions change. Reviewers test new references against this file before merging._
