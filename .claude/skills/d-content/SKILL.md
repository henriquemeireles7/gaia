---
name: d-content
description: "Strategy to content. One skill with type routing: blog, handbook, methodology, social, clips. Professional writer phases + adversarial voice review. Triggers: 'd-content', 'write content', 'blog post', 'handbook entry', 'social post', 'create clips'."
---

# d-content — Strategy to Content

## What this does
Takes a strategy document or initiative and produces polished content. Routes to per-type rules
for blog posts, handbook entries, methodology docs, social posts, and video clips.
Professional writer phases with adversarial voice.md compliance review.

## Pipeline
d-strategy → d-roadmap → **d-content** (for content projects) or d-code (for code projects)

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
2. Read the per-type rule file: `.claude/skills/d-content/rules-{type}.md`
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
