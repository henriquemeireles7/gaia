---
name: d-roadmap
description: "Extract project roadmaps from a reviewed strategy initiative. Mechanical, non-interactive. Triggers: 'd-roadmap', 'extract projects', 'create roadmaps', 'break down initiative'."
---

# d-roadmap — Extract Project Roadmaps

## What this does
Takes a reviewed initiative document.md and extracts each project into its own subfolder with a self-contained roadmap.md. Pure extraction — no new thinking. Makes each project independently executable by d-code or d-content.

## Pipeline
d-strategy → gstack reviews → **d-roadmap** → /ship (PR+merge)

## When to use
- After an initiative's document.md has been reviewed (CEO/eng/design reviews)
- The project breakdown in the document is stable
- Ready to move from strategy to execution

---

## Input
The user provides or you detect:
- Path to an initiative's `document.md` (e.g., `decisions/product/01-gtm/document.md`)

## Process

### Step 1: Read the Initiative
Read the initiative's `document.md` using the Read tool (not cat/bash).

Extract:
- Each project from the "## Projects" section
- The initiative's goal and constraint (context for each project)
- The decision log (relevant decisions carry forward)

### Step 2: Create Project Subfolders
For each project in the initiative:

```
decisions/{domain}/NN-name/
├── document.md          (the initiative — already exists)
├── future-work.md       (already exists)
├── project-name-1/
│   └── roadmap.md
├── project-name-2/
│   └── roadmap.md
└── ...
```

Folder naming: kebab-case, descriptive, no numbers (e.g., `decision-graph-schema/`, `free-course-funnel/`).

### Step 3: Write roadmap.md (per project)

```markdown
# {Project Title}

> Initiative: {NN-name}
> Domain: {product|ops|harness}
> Created: {YYYY-MM-DD}
> Status: ready

## Context
{1-2 paragraphs from initiative: what exists, why this project matters}

## Scope
{Exactly what's in and out. Be explicit about boundaries.}

## Deliverables

### 1. {Deliverable name}
- **What:** {1-2 sentences}
- **Files:** {expected file paths — CREATE or MODIFY}
- **Acceptance criteria:**
  - [ ] {testable criterion}
  - [ ] {testable criterion}

### 2. {Deliverable name}
...

## Dependencies
- **Requires:** {what must exist before this project starts}
- **Produces:** {what this project creates that others might need}

## Risks
- {risk}: {mitigation}

## Relevant Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| {from initiative decision log} | | |
```

### Step 4: Output Summary
```
Extracted N projects from {initiative}:

1. {project-name-1}/ — {1-line scope}
2. {project-name-2}/ — {1-line scope}
...

Each project has a self-contained roadmap.md ready for:
- d-code (implementation)
- d-content (content creation)

Start execution: read any project/roadmap.md → d-code or d-content
```

---

## Rules
- NEVER add new ideas — extract only what the document says
- NEVER modify the source document.md
- NEVER create code — roadmaps are specs, not implementations
- ALWAYS make each roadmap.md self-contained (an agent should be able to code from it cold)
- ALWAYS include acceptance criteria that are testable (not vague "works well")
- ALWAYS include file paths in deliverables (CREATE vs MODIFY)
- Status is "ready" — meaning ready for execution
- If the initiative document is vague on a project, flag it as an open question in the roadmap
- After saving, auto-commit and push (non-code doc)
