// .gaia/rules/skills/w-initiative.ts — rules owned by `w-initiative`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'w-initiative' (the shard's path identifier).
//
// Eight principles map 1:1 from .claude/skills/w-initiative/reference.md
// (per h-rules/reference.md §Part 5 §2). All ship as `pending` in the
// PR that introduced them; the follow-up PR extends
// .gaia/rules/checks/validate-artifacts.ts to enforce each and flips
// these from `pending` to `kind: 'script'`.

import type { Rule } from '../types'

export const skill = 'w-initiative' as const

export const wInitiativeRules = [
  {
    id: 'workflow/falsifier-required',
    skill: 'w-initiative',
    description:
      'Initiatives declare a falsifier with a numeric threshold and a window in days; "we\'ll know" is not a falsifier.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert frontmatter `falsifier:` field present and non-empty',
    },
  },
  {
    id: 'workflow/wave-alignment',
    skill: 'w-initiative',
    description:
      'Initiatives pin to a v5 wave (0a|0b|1|2|3|4|5) or mark themselves off-wave with one-sentence justification in §2.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert frontmatter `wave:` field present and one of {0a,0b,1,2,3,4,5,off-wave}',
    },
  },
  {
    id: 'workflow/cap-table-required',
    skill: 'w-initiative',
    description:
      "§2 of every initiative declares a Cap table with ≥3 rows in the Capped column — what's explicitly NOT shipping in v1.0.",
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert §2 contains a `| Surface | Ships v1.0 | Capped |` table with ≥3 rows',
    },
  },
  {
    id: 'workflow/abandonment-ladder-required',
    skill: 'w-initiative',
    description:
      '§2 of every initiative declares an Abandonment ladder with ≥1 row — the kill condition when the falsifier fires.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert §2 contains a `| Trigger | Next step |` table with ≥1 row',
    },
  },
  {
    id: 'workflow/decision-class-column',
    skill: 'w-initiative',
    description:
      '§6 Decision Audit Trail classifies every row as M (Mechanical), T (Taste), or UC (User Challenge); makes authority distribution auditable.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert §6 table has a Class column with values in {M,T,UC}',
    },
  },
  {
    id: 'workflow/measurement-wired',
    skill: 'w-initiative',
    description:
      'measurement.query is concrete and non-TBD for any initiative with status ∈ {approved, in-progress, shipped}; verdict step needs a real query.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert frontmatter `measurement.query` is non-empty and not literal "TBD" past `draft` status',
    },
  },
  {
    id: 'workflow/adversarial-review-recorded',
    skill: 'w-initiative',
    description:
      'Phase 3 panel review (6 specialists, 6 dimensions) lands inside §1.5 of initiative.md, not in PR comments — document carries its own provenance.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert §1.5 contains a `Panel:` heading with ≥6 specialist rows',
    },
  },
  {
    id: 'workflow/grounding-paths-echoed',
    skill: 'w-initiative',
    description:
      "§1 Context ends with a `Sources read` list of file paths Phase 0 loaded — readers can audit the agent's grounding.",
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: '.gaia/rules/checks/validate-artifacts.ts (planned) — assert §1 contains a `Sources read` heading with ≥3 path entries',
    },
  },
] as const satisfies readonly Rule[]
