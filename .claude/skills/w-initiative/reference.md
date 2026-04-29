# Initiative — Reference

> Status: scaffolded — full 5-part principle shape lands when `w-initiative` runs in expansion mode (post-0001).
> Sibling skill: `w-initiative` (this folder's `SKILL.md`).

## What this is

How to author an `initiative.md` file under `.gaia/initiatives/NNNN-<slug>/`. Initiatives are the WHY/WHAT layer of the workflow loop — one file per bet, end-to-end (research → strategy → implementation → PR breakdown → audit trail).

## Required frontmatter

```yaml
---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: <one sentence — falsifiable>
falsifier: <what would prove this wrong, with date or numeric threshold>
measurement: { metric, source, baseline, threshold, window_days, verdict }
status: draft | approved | in-progress | shipped | killed
---
```

The `validate-artifacts.ts` script enforces `parent`, `hypothesis`, and `measurement` on every initiative. Missing fields fail `bun run check`.

## The 5 sections

1. **Context / Research** — data, prior sessions, named users, demand evidence, status quo, competitor analysis.
2. **Strategy** — problem, hypothesis, target user, narrowest wedge, constraints, premises (each with falsifier), approaches considered, recommended approach, cap table, abandonment ladder.
3. **Implementation** — architecture decisions, files-touched inventory, risks priority-ordered with mitigations, dependencies, out-of-scope explicit list.
4. **PR Breakdown** — table of PR rows (`w-code` reads this and codes PR by PR).
5. **Decision Audit Trail** — every changed line traces to a decision (founder, autoplan voice, AD-N mechanical).

## Workflow

```
w-initiative (Q&A → writes initiative.md with all 5 sections)
   ↓
gstack /autoplan (reviews end-to-end, appends AD-N to §5)
   ↓
w-code (reads §4, codes PR by PR)
```

## Cross-references

- Sibling skill: `.claude/skills/w-initiative/SKILL.md`
- Workflow loop: `.claude/skills/h-rules/reference.md` Part 4
- Initiatives index: `.gaia/initiatives/CLAUDE.md`
