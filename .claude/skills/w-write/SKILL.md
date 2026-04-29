---
name: w-write
description: "Strategy → content. Type-routed writer (blog, handbook, methodology, social, clips) with adversarial voice review. Mode: fix. Tier: quick (skeleton) | standard (9 phases) | exhaustive (multi-cycle voice review). Triggers: 'w-write', 'write content', 'blog post', 'handbook entry', 'social post', 'create clips'. Voice: 'write a post', 'draft this', 'turn this into a blog'. After: w-initiative. Artifact: content/<type>/<lang>/<slug>.{mdx,md}."
---

# w-write — Strategy to Content

## What this does

Takes a strategy document or initiative and produces polished content. Routes to per-type rules
for blog posts, handbook entries, methodology docs, social posts, and video clips.
Professional writer phases with adversarial voice.md compliance review.

## Pipeline

w-initiative → **w-write** (for content projects) or w-code (for code projects)

## When to use

- A project's roadmap.md specifies content deliverables (not code)
- The founder wants a blog post, social content, handbook entry, etc.
- Content needs to be created from strategy docs

---

## Input

The user provides:

- **type** (required): `blog` | `handbook` | `methodology` | `social` | `clips`
- **source** (optional): path to strategy doc or initiative to draw from

## Before Starting

1. Read `decisions/voice.md` — CRITICAL, always loaded
2. Read the per-type rule file: `.claude/skills/w-write/rules-{type}.md`
3. Read the source strategy document (if provided)
4. Read `decisions/company.md` — product context, ICP, positioning

---

## Process

### Phase 1: Research

- Read the source document thoroughly
- Identify the key insights, stories, frameworks worth surfacing
- Note the target audience (from company.md ICP)
- Check existing content to avoid duplication: `ls content/`

### Phase 2: Keywords & SEO (blog and handbook only)

- Identify primary keyword and 3-5 secondary keywords
- Check existing concept pages for internal linking opportunities
- Plan the URL slug

### Phase 3: Title

- Write 5 title options
- Pick the one that would make the ICP stop scrolling
- Apply voice.md Rule 5: questions that stop the scroll

### Phase 4: Outline

- Create section-by-section outline
- Each section gets a purpose: what the reader should feel/know/do after

### Phase 5: Subtitles with TODOs

- Write all subtitles/headings
- Under each, write a TODO describing what goes there
- This creates the skeleton before the draft

### Phase 6: Full Draft

- Write the complete content following the outline
- Apply ALL voice.md rules (12 rules)
- Follow per-type rule file guidelines
- Include engagement techniques: open loops, pattern interrupts, questions that stop

### Phase 7: Adversarial Voice Review

Launch a subagent to review the draft against voice.md:

The review checks:

1. Every sentence against Rule 1 (thinking, not finished thinking)
2. Rhythm variation (Rule 2)
3. Story-first structure (Rule 3)
4. Specificity (Rule 4)
5. Questions that stop (Rule 5)
6. All 12 rules compliance

For each violation found:

- Quote the offending text
- Name the rule violated
- Suggest a rewrite

### Phase 8: Revision (max 2 cycles)

- Fix all violations from the voice review
- Re-run voice review
- If still failing after 2 cycles, add to `decisions/humantasks.md`:
  ```
  - [ ] Review and polish: {content title} — voice compliance issues after 2 AI revision cycles
  ```

### Phase 9: Save & Commit

Place content in the appropriate location:

- Blog: `content/blog/en/{slug}.mdx`
- Handbook: `content/handbook/en/{slug}.mdx`
- Methodology: `content/methodology/en/{slug}.mdx`
- Social: `content/social/{platform}/{slug}.md`
- Clips: `content/clips/{slug}.md`

After saving, auto-commit and push (non-code content).

---

## Output

Mode: **fix** — the skill writes the content file (blog post, handbook entry, social post, clip outline) to disk after voice review. Returns the canonical structured report below.

```
=== CONTENT CREATED ===
Type: {type}
Title: {title}
File: {path}
Source: {strategy doc path}
Voice review: PASS (cycle {1|2}) | ESCALATED to humantasks.md
Word count: {N}
```

---

## Failure modes

When the skill cannot complete:

- **Voice review fails after 2 revision cycles** — escalate to `decisions/humantasks.md` with the current draft + the rule violations remaining. Don't ship a draft that fails the rules.
- **Source strategy doc is missing or empty** — abort. Tell the user to point at a real source (initiative file, brief, etc.). Don't fabricate strategy.
- **Type argument missing** — abort and ask for type. Don't assume blog.
- **Tier is `quick` and the per-type rule file demands phases beyond skeleton** — drop to `standard`, log the upgrade. Don't ship a quick-tier file that violates the type's contract.

In all escalation cases, the report block still gets written with the partial state, the cycle count, and the path of the in-progress draft (if any) so a human can pick up where the skill left off.

## Rules

- NEVER write without reading voice.md first
- NEVER skip the adversarial voice review (Phase 7)
- NEVER exceed 2 revision cycles — escalate to humantasks.md
- ALWAYS load the per-type rule file for the content type
- ALWAYS use the Indy Test: would a real human write this way?
- Content status is always "draft" — human reviews before "published"
- Content is MDX format (.mdx extension) for blog/handbook/methodology
- Social and clips use plain markdown (.md)
- No AI-sounding language: no "delve", "crucial", "landscape", "leverage", "robust"
- Specific over general, always (Rule 4)
- Start with the story, not the principle (Rule 3)
