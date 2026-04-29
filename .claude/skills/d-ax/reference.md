# AX — Agent Experience

> Status: Reference
> Last verified: April 2026
> Scope: Every surface an AI agent touches — skills, CLAUDE.md files, llms.txt, MCP servers, self-documenting outputs
> Paired with: `dx.md` (human developer experience), `code.md` (coding principles)

---

## What this file is

Gaia's agent-facing surfaces made explicit. The template is _agent-native first, humans second_ (VISION principle #15). This file defines how that shows up in skills, context files, discoverability signals, and output formats.

The single most novel file in the Gaia reference library. The Skills > MCP thesis lives here. The three-level progressive disclosure architecture lives here. The llms.txt generation pipeline lives here.

**The test:** can Claude Code — or Cursor, Copilot, Codex, or any future agent — be maximally productive in a Gaia codebase with minimal context spend? If the agent wastes tokens on boilerplate, re-deriving context, or searching for things that should be surfaced, AX fails.

---

## The agent's four surfaces

Agents interact with Gaia through exactly four surface types:

| Surface                                | What it is                                       | Primary reader                        |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| **Skills** (`.gaia/skills/*/SKILL.md`) | Executable workflows with progressive disclosure | Claude Code                           |
| **CLAUDE.md** (nested)                 | Contextual rules and conventions                 | Claude Code                           |
| **llms.txt + .md twins**               | Canonical doc tree for external agents           | Cursor, Copilot, Codex, ChatGPT, etc. |
| **MCP servers** (when used)            | External capability exposure                     | Any MCP-compatible client             |

Each surface has a job. Each has an anatomy. Each has a budget. Violating the budget is how agent-native frameworks fail.

---

## The 12 AX principles

### Interface architecture

**1. Skills are the primary agent interface.**
Every workflow Gaia supports is a skill. CLI is the mechanism (agents invoke CLI commands inside skills). MCP is for genuine external capabilities only. SKILL.md files are the contract between Gaia and the agent.

**2. Three-level progressive disclosure at every skill.**
Metadata (name + description, ~100 words, always loaded). SKILL.md body (loads on trigger, <500 lines). Bundled resources (scripts, references, assets — load on demand). Violating the token budget at any level wastes context.

**3. Descriptions are pushy on purpose.**
Claude under-triggers by default. Descriptions over-specify triggers — synonyms, edge cases, adjacent phrasings. "Also trigger when the user mentions X, Y, Z, even if they don't explicitly ask..." Under-triggered skills are zero-value, no matter how well-written the body.

### Design discipline

**4. Skills are context compression functions.**
Every sentence must eliminate a category of failure. If a sentence doesn't prevent failure, cut it. Quality = bad-output-eliminated / tokens-spent.

**5. State machines, not essays.**
Define entry, process, exit for each step. Agent always knows: where am I, what's next, how do I know this step is done. Essays force the agent to infer workflow; state machines let the agent execute it.

**6. Constraints over instructions.**
"Must fit on one page" beats "be concise." Constraints hold under variation; instructions break. Every requirement stated as a constraint the agent can verify.

**7. Tool choreography is specified.**
Every step names its tool, inputs, and sequence. "Use web_search before design. Use web_fetch for full articles. Use code_execution for math." Don't leave tool choice to the agent's mood.

**8. Output format is shown with templates, not described.**
Placeholders + structure. Agents with templates produce dramatically more consistent results than agents told "write a good document." Show the shape; don't describe it.

### Quality

**9. Skills encode taste, not just process.**
Mediocre skills describe steps; great skills encode the specific quality bar — what to emphasize, what to cut, when the output is done. Taste is what separates "produced" from "excellent."

**10. Every skill justifies its existence.**
If the agent produces ≈ same output without the skill, the skill has no value. Before writing: "what specific failure does this prevent that the base model wouldn't prevent on its own?" If no answer, don't build.

### Composition

**11. Skills compose, don't overlap.**
One skill, one job. Declare dependencies, inputs, outputs. Suggest next skill at exit. The pipeline is discoverable — agents can navigate `skill A → skill B → skill C` without the human narrating.

**12. llms.txt + `.md` twins complete the external loop.**
Every doc page has a `.md` twin. `/llms.txt` at root links the canonical reference tree. `/llms-full.txt` ships the concatenated corpus. External agents (Cursor, Copilot, Codex, ChatGPT) read these directly — no HTML, no JavaScript, no slop.

---

## Skills — the primary surface

### Why skills, not chat prompts

Chat prompts have three failure modes:

1. **Rediscovery cost** — every session re-derives workflow, context, quality bar
2. **Drift** — same prompt, different outputs across sessions
3. **Unverifiability** — "did the agent do it right?" has no answer

Skills solve all three:

1. **Written once, consulted always** — workflow is canonical
2. **Constraints hold** — same skill, same output shape
3. **Testable** — define what "done" looks like in verifiable terms

A Gaia codebase with 10 well-designed skills beats the same codebase with 1000 lines of prose CLAUDE.md, every time. The skill IS the workflow, not a description of it.

### SKILL.md anatomy

```
.gaia/skills/<skill-name>/
├── SKILL.md              # Required — frontmatter + body
├── references/           # Optional — deep references
│   ├── variant-a.md
│   └── variant-b.md
├── scripts/              # Optional — executable utilities
│   └── helper.ts
└── templates/            # Optional — output templates
    └── output.md.template
```

**SKILL.md structure:**

```markdown
---
name: <kebab-case-name>
description: <pushy description, ~100 words, includes what + when to trigger>
---

# <Skill Name>

## What this does

One-sentence value proposition.

## When to use this

<Bullet list of triggers — be aggressive, over-specify>

## Workflow

<State machine: steps with entry, process, exit>

## Output format

<Template with placeholders>

## Principles

<Constraints the output must satisfy>

## NOT this skill

<What the skill does NOT do, with pointers to correct skill>
```

### Description craft (the most important 100 words)

The description is the primary triggering mechanism. Metadata is always in context; body loads on trigger.

**Bad description:**

```yaml
description: Review a plan for developer experience.
```

Triggers: basically never.

**Good description:**

```yaml
description: Use this skill whenever the user wants to review a plan, spec, or design doc for developer experience issues — CLI design, API ergonomics, error messages, onboarding flow, docs quality. Triggers: "devex review", "dx review", "review the plan for DX", "check if this is easy to use", "what will developers feel when they try this", "audit the developer experience". Also trigger proactively when the user has a plan file and mentions shipping, releasing, or sharing with other developers.
```

Triggers: reliably. Over-specifies on purpose. Lists synonyms. Mentions proactive triggers.

### The 15-category skill quality framework

Every skill Gaia ships passes d-skill's 15-dimension audit (see `.gaia/skills/d-skill/SKILL.md`). Categories scored 1-5; anything below 3 requires fix before merge:

| #   | Category               | What it checks                                                |
| --- | ---------------------- | ------------------------------------------------------------- |
| 1   | Best Practices         | Progressive disclosure, pushy triggers, examples at ambiguity |
| 2   | First Principles       | State machine, constraints, taste encoding                    |
| 3   | Agent Experience       | Context budget, explicit decisions, tool choreography         |
| 4   | Human Experience       | Question timing, transparency, previews, confidence signals   |
| 5   | Gstack Patterns        | Adversarial review, three knowledge layers, exit suggestions  |
| 6   | Error Recovery         | Fallback chains, graceful degradation, input validation       |
| 7   | Cross-Skill Coherence  | Shared vocabulary, output schema, dependency declaration      |
| 8   | Iteration Intelligence | Decision log, failure library, override tracking              |
| 9   | Scope Discipline       | One skill one job, line budget, explicit NOT declarations     |
| 10  | Evaluability           | Before/after tests, consistency scoring, regression tests     |
| 11  | Workflow               | Linear gates, parallel awareness, human checkpoints           |
| 12  | Human-AI Interaction   | Question hierarchy, defaults, batching, show-don't-ask        |
| 13  | Templates              | Output templates, starter variants, checklists                |
| 14  | Resources              | Domain references, failure catalogs, examples                 |
| 15  | Scripts                | Deterministic helpers for repetitive tasks                    |

### Skills Gaia ships v1

```
.gaia/skills/
├── review/               # Full review pipeline (architecture + DX + design)
├── ship/                 # Production deployment with checks
├── scaffold/             # Generate feature/package/component slices
├── harness/              # Manage the agent harness itself
├── d-skill/              # Create + audit other skills (vendored from user)
├── d-meta/               # Design strategy docs with meta-templates
├── d-plan/               # Write strategy docs from meta-docs
├── migrate/              # Database migration workflow
└── retro/                # Post-session retrospective + decision log
```

Every skill has a one-job focus. Every skill declares what it does NOT do. Every skill suggests the next skill at exit.

---

## CLAUDE.md — contextual rules

### The nested strategy

CLAUDE.md files load automatically based on the current working directory. Gaia uses hierarchical loading:

```
gaia/
├── CLAUDE.md                           # Global: rules that apply everywhere
├── apps/
│   ├── web/CLAUDE.md                   # Frontend-specific: "pages do 3 things"
│   └── api/
│       ├── CLAUDE.md                   # Backend-specific: Elysia patterns
│       └── src/features/
│           ├── auth/CLAUDE.md          # Feature-local: auth conventions
│           └── billing/CLAUDE.md       # Feature-local: billing edge cases
└── packages/
    ├── db/CLAUDE.md                    # Migrations: safety rules
    ├── errors/CLAUDE.md                # Error codes: naming convention
    └── adapters/CLAUDE.md              # Adapters: one file per system
```

### When to create a CLAUDE.md

A folder gets its own CLAUDE.md **only** when it has rules that differ from global. Folders that inherit from root don't need one (see VISION architectural principle #6).

**Rule:** if you'd write "see root CLAUDE.md for conventions" as the only content, don't create the file. Missing CLAUDE.md means "inherits."

### CLAUDE.md structure

```markdown
# <Package/folder name>

## Local conventions

<Rules that differ from root or add to it>

## Patterns to follow

<Concrete examples, 2-3 max>

## Anti-patterns

<What to avoid, why>

## Where to look first

<Key files an agent should read to understand this folder>
```

**Budget:** <100 lines per file. Anything longer becomes a reference doc and gets linked.

### MANIFEST.md — the context map

At `docs/MANIFEST.md`:

```markdown
# CLAUDE.md Manifest

Lists which folders have local CLAUDE.md files and why.
Folders not listed here inherit from root CLAUDE.md.

| Path              | Why                                   | Last reviewed |
| ----------------- | ------------------------------------- | ------------- |
| apps/web          | Pages do 3 things rule                | 2026-04-19    |
| apps/api          | Elysia routes vs services             | 2026-04-19    |
| packages/db       | Migration safety                      | 2026-04-19    |
| packages/errors   | Named-error-only rule                 | 2026-04-19    |
| packages/adapters | Capability-named, one-file-per-system | 2026-04-19    |
```

Agents query MANIFEST.md to understand the context map. It's the dependency graph for rules.

---

## llms.txt — external agent discoverability

### The standard (2026)

llms.txt is an emerging community standard:

- Plain Markdown at `/llms.txt` at the site root
- Hierarchical: root links to section indexes
- `/llms-full.txt` ships the concatenated corpus for full-context ingestion
- Every doc page has a `.md` twin at `<path>.md`
- Consumed by Cursor, Copilot, Codex, ChatGPT, Claude (external), Perplexity

### Gaia's implementation

```
gaia-docs-site/
├── llms.txt                    # Hierarchical index
├── llms-full.txt               # Full corpus (concatenated)
├── reference/
│   ├── code.md                 # Human-facing docs (HTML-rendered)
│   ├── code.md.md              # Markdown twin for agents
│   ├── backend.md
│   ├── backend.md.md
│   └── ...
└── ...
```

Everything generated by `gaia llms-txt generate` — runs on every docs change.

### llms.txt content

```
# Gaia

> Rails for TypeScript, redesigned for a world where agents write the code.
> Opinionated open-source template for solo founders building production SaaS.

## Core principles
- [VISION](https://gaia.dev/vision.md): What Gaia is and why
- [code.md](https://gaia.dev/reference/code.md): The 10 coding principles
- [backend.md](https://gaia.dev/reference/backend.md): Elysia + Eden Treaty patterns
- [frontend.md](https://gaia.dev/reference/frontend.md): Solid + routing patterns

## Architecture decisions
- [ADR-0001](https://gaia.dev/adr/0001-bun-runtime.md): Bun as runtime
- [ADR-0002](https://gaia.dev/adr/0002-elysia-framework.md): Elysia over Express
- [ADR-0003](https://gaia.dev/adr/0003-solid-over-react.md): Solid over React
...

## Skills reference
- [skills/review](https://gaia.dev/skills/review.md)
- [skills/ship](https://gaia.dev/skills/ship.md)
...

## Runbooks
- [deploy](https://gaia.dev/runbook/deploy.md)
- [rollback](https://gaia.dev/runbook/rollback.md)
...
```

### Content tags for precision

Two HTML-comment tags control what appears in llms versions:

```markdown
<!-- llms-only -->

This paragraph only appears in the Markdown/llms version — not on the rendered HTML docs site. Use for context that helps agents but clutters human reading.

<!-- /llms-only -->

<!-- llms-ignore -->

This paragraph only appears on the HTML site. Use for marketing copy, navigation hints, anything agents don't need.

<!-- /llms-ignore -->
```

### Generation pipeline

```
docs/reference/*.md (source of truth)
       │
       ├── Human docs: rendered to HTML with Scalar
       │     ├── code.md → code.html
       │     ├── backend.md → backend.html
       │     └── ...
       │
       └── Agent docs: .md twins + llms.txt
             ├── code.md.md (markdown-only, processed tags)
             ├── llms.txt (hierarchical index)
             └── llms-full.txt (full concat)
```

Runs on:

- Every commit to docs/ (via CI)
- `gaia llms-txt generate` manually
- Post-docs-build hook

---

## MCP — capability, not procedure

### When to use MCP

Model Context Protocol is for exposing **external capabilities** to agents. Things the agent can't do through regular tools or skills.

**Good MCP use cases:**

- Private data access (internal databases, proprietary APIs)
- Real-time state (metrics, alerts, live logs)
- External system integration (Jira, Linear, Stripe live data)
- Enterprise auth patterns
- Anything that requires persistent credentials

**Bad MCP use cases:**

- Workflows (use skills — MCP servers can't progressively disclose)
- Documentation (use llms.txt + .md twins)
- Local operations (use CLI commands inside skills)
- Anything the agent can do with file reads + tool calls

### The distinction crystallized

| Dimension              | Skills                           | MCP                        |
| ---------------------- | -------------------------------- | -------------------------- |
| Purpose                | Procedures / workflows           | Capabilities / data access |
| Context cost           | Metadata always; body on trigger | Full schema always loaded  |
| Progressive disclosure | Yes (three levels)               | Limited                    |
| State                  | Stateless                        | Often stateful             |
| Installation           | File in repo                     | Server process             |
| Deployment             | Part of repo                     | Separate lifecycle         |
| When to pick           | "How to do X"                    | "Access to Y"              |

### Gaia's MCP policy

v1 template ships with **zero MCP servers**. The template is self-contained.

When users add MCP later (for their own business needs), we recommend:

- Keep MCP servers to 2-3 maximum per project
- Each MCP exposes one capability domain, not a grab-bag
- Context-heavy MCPs (schema >1000 tokens) should be used rarely
- Always check if a skill would work better before reaching for MCP

### Security note — MCP is code

- Snyk research (Feb 2026): ~37% of community skills/MCPs have security flaws
- MCP servers run with filesystem/network access the host grants
- Every MCP you install runs third-party code at LLM request
- Audit MCPs like you audit npm packages: source, maintainer, recent activity

---

## Self-documenting outputs

Agent outputs should be structured enough that **the next agent can pick up the work**.

### The pattern

Every long-running skill produces a structured artifact:

```markdown
# <Skill> Run — 2026-04-19T14:32:15Z

## Input

<What the skill was called with>

## Decisions

- [2026-04-19] Chose Option B because [reason]
- [2026-04-19] Deferred decision on X — see open questions

## Output

<The actual artifact>

## Open questions

- Q: Should we use pattern Y or Z? (blocking implementer)
- Q: Confirm the pricing of the X package

## Next steps

- Run `gaia scaffold feature billing` when decisions above are confirmed
- Review with `/review` after scaffolding
```

### Why this matters

Agents are replaced mid-task more often than they're not. Context windows limit, sessions end, users come back days later. If the previous agent's output is just a finished artifact with no trail, the next agent has to re-derive everything.

With structured outputs: the next agent reads the decisions log, the open questions, the next-step pointer — and picks up in 30 seconds.

### What goes in self-documenting outputs

- **Decisions made** — dated, rationalized, linked to principles
- **Open questions** — what's blocked, why, who decides
- **Next steps** — specific commands or skills to run
- **Dependencies** — what this output feeds into
- **Provenance** — which skill produced this, when, with what input

---

## Skills-as-code — security & review

### Skills are code that runs at LLM request

A SKILL.md isn't a document; it's an instruction set the agent executes. Treating it as prose leads to exactly the same vulnerabilities as treating untrusted scripts as prose.

**Risks:**

- Prompt injection through skill content (user-added skills especially)
- Credential exfiltration via tool choreography
- Silent privilege escalation
- Cross-skill contamination (bad skill poisons subsequent skills)

### Review process for skills

Every skill merged into Gaia main passes:

1. **Static audit** — 15-category framework, score ≥3 on each
2. **Tool use review** — any skill that invokes write/delete/external-call flagged for extra review
3. **Dependency check** — does the skill trust outputs from other skills/tools correctly
4. **Example runs** — adversarial prompts tried against the skill
5. **Escape-hatch check** — can the skill refuse gracefully when inputs are adversarial

### Skills that require extra scrutiny

- Any skill that calls `bash_tool` or `create_file`
- Any skill that modifies `.gaia/rules.ts` or hook definitions
- Any skill that reads environment variables
- Any skill that calls external APIs
- Any skill vendored from third-party sources

These get a second reviewer and explicit ADR entry.

---

## Token budget — the universal constraint

Every AX surface has a budget. Violating the budget is how frameworks fail.

| Surface                        | Budget           | Why                                              |
| ------------------------------ | ---------------- | ------------------------------------------------ |
| Skill metadata (always loaded) | ~100 words       | Multiplied by N skills; stays in context forever |
| SKILL.md body (on trigger)     | <500 lines       | Loads into working memory every invocation       |
| CLAUDE.md (root)               | <200 lines       | Loaded on every Claude Code session              |
| CLAUDE.md (nested)             | <100 lines       | Adds to session whenever scope includes it       |
| llms.txt                       | <500 lines       | External agents ingest whole file                |
| llms-full.txt                  | <50k tokens      | Token-efficient corpus, not full internet        |
| Reference files                | <1000 lines each | Loaded on explicit reference only                |

**Global rule:** if a surface exceeds budget, refactor — don't relax the budget. Usually refactoring means extracting to reference files, adding hierarchy, or cutting.

---

## The agent-readable manifest

At the root of every Gaia project: `.gaia/manifest.json`

```json
{
  "name": "my-gaia-app",
  "gaia_version": "1.2.0",
  "stack": {
    "runtime": "bun@1.2.0",
    "framework_backend": "elysia@1.4.0",
    "framework_frontend": "solidstart@1.8.0",
    "database": "neon",
    "auth": "better-auth"
  },
  "skills_installed": ["review", "ship", "scaffold", "harness", "d-skill"],
  "claude_md_files": [
    "CLAUDE.md",
    "apps/web/CLAUDE.md",
    "apps/api/CLAUDE.md",
    "packages/db/CLAUDE.md",
    "packages/errors/CLAUDE.md"
  ],
  "llms_txt_generated_at": "2026-04-19T14:32:15Z",
  "rules_checksum": "sha256:..."
}
```

Agents can:

- Check Gaia version compatibility
- See which skills are available without loading them
- Navigate CLAUDE.md structure before walking the tree
- Detect stale llms.txt or changed rules

This file is machine-generated (don't edit by hand). Regenerated on every `bun install` + every `gaia skills install/remove`.

---

## How an agent should navigate Gaia (the ideal path)

1. **Start:** agent opens the repo in Claude Code.
2. **Load:** Claude Code auto-loads root `CLAUDE.md` + any CLAUDE.md in the current directory.
3. **Discover:** read `.gaia/manifest.json` for the project map.
4. **Query:** "which skills are available?" → list skills from manifest.
5. **Trigger:** user request matches a skill description → skill fires.
6. **Execute:** skill runs as a state machine — each step logged.
7. **Output:** structured artifact with decisions log, open questions, next steps.
8. **Hand off:** next agent (or next session) reads the output and resumes.

External agents (Cursor, Copilot, Codex) bypass skills and use llms.txt + .md twins for context. Same information, different loading path.

---

## Anti-patterns — what Gaia explicitly rejects

| Anti-pattern                                                 | Why rejected                                           |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| Giant chat prompts instead of skills                         | Rediscovery cost; no versioning; no testability        |
| CLAUDE.md duplicating reference docs                         | Token waste; drift; two sources of truth               |
| Skills that do 3 different things                            | Triggering becomes unreliable; scope bloat             |
| Passive-voice descriptions ("This skill may be used for...") | Claude under-triggers; pushy voice required            |
| MCP servers for workflows                                    | Wrong tool; procedures belong in skills                |
| Hidden tools / magic behavior                                | Agent can't reason about what's possible               |
| Untyped output formats                                       | Next agent can't parse; chains break                   |
| Skills that silently fail                                    | Agent proceeds with corruption; always surface failure |
| Docs only on a website (no .md twins)                        | External agents can't parse HTML reliably              |
| Long CLAUDE.md files (>200 lines)                            | Token budget violation; extract to reference           |
| Skills without decisions logs                                | Un-resumable; context dies at session end              |

---

## The AX review checklist

Before any new skill, CLAUDE.md, or MCP server ships:

- [ ] Skill: passes d-skill 15-category audit, score ≥3 on each
- [ ] Skill: description is pushy, includes triggers + synonyms + adjacent phrasings
- [ ] Skill: SKILL.md body <500 lines; longer content in references/
- [ ] Skill: has explicit "NOT this skill" section
- [ ] Skill: suggests next skill at exit
- [ ] Skill: produces self-documenting output (decisions log + next steps)
- [ ] CLAUDE.md: <200 lines (root) or <100 lines (nested)
- [ ] CLAUDE.md: only present when rules differ from parent
- [ ] CLAUDE.md: entry added to MANIFEST.md
- [ ] llms.txt: regenerated after docs change
- [ ] .md twins: every public doc page has one
- [ ] MCP: genuinely needed (capability, not procedure)
- [ ] Tokens: surface fits within its budget
- [ ] Security: passes skills-as-code review

If any fails, the AX isn't shipped.

---

## Measuring AX

You can't improve what you don't measure.

### Key metrics

| Metric                     | What it tells you                                  | Target                  |
| -------------------------- | -------------------------------------------------- | ----------------------- |
| **Skill trigger rate**     | Skills firing when they should                     | >85% on test prompts    |
| **Skill token spend**      | Avg context consumed per skill run                 | Trending down over time |
| **Output consistency**     | Same prompt, 3 runs, structural similarity         | >80%                    |
| **Handoff success rate**   | Next agent picks up with no re-derivation          | >90%                    |
| **CLAUDE.md coverage**     | Folders with deviating rules that have CLAUDE.md   | 100%                    |
| **llms.txt freshness**     | Time since last docs-change regeneration           | <24h                    |
| **External agent success** | Cursor/Copilot produce correct code using llms.txt | Survey + logs           |

### How to measure

- **Skill evals** — each skill has a test set of prompts; run monthly; measure trigger + quality
- **Token logs** — Claude Code reports token spend per skill; track averages
- **Handoff tests** — pause mid-task, start fresh session, see if output is resumable
- **External agent dogfood** — try the same tasks in Cursor and Copilot; note where context fails

---

## Decisions log

| Date       | Decision                                                              | Rationale                                                                                                                             |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-02 | Skills are the primary agent interface (VISION principle #15 + #13)   | Chat prompts have rediscovery cost + drift + unverifiability. Skills solve all three.                                                 |
| 2026-04-02 | Three-level progressive disclosure (Anthropic skill-creator standard) | Token budget respect. Metadata + body + resources, loaded as needed.                                                                  |
| 2026-04-02 | CLAUDE.md only where local rules differ                               | Missing CLAUDE.md = inherits. MANIFEST.md maps which folders have local rules.                                                        |
| 2026-04-19 | 12 AX principles adopted                                              | Grounded in d-skill 15-category framework + Anthropic skill-creator + gstack + llms.txt state of art.                                 |
| 2026-04-19 | Skills > MCP as primary interface                                     | MCP is for capabilities (external data/systems). Skills are for procedures. Most agent-native needs are procedural.                   |
| 2026-04-19 | llms.txt + .md twins as external agent surface                        | External agents (Cursor, Copilot, Codex, ChatGPT) don't read HTML reliably. Markdown + llms.txt is the emerging standard.             |
| 2026-04-19 | Skills-as-code security review                                        | Snyk 2026 research: ~37% of community skills have security flaws. Skills run with LLM trust — they need the same scrutiny as scripts. |
| 2026-04-19 | Self-documenting output pattern                                       | Agents get replaced mid-task. Structured output with decisions log + next steps = resumable workflows.                                |
| 2026-04-19 | Zero MCP servers in v1 template                                       | Template self-contained. Users add MCPs for business-specific needs. Keep surface minimal.                                            |
| 2026-04-19 | Token budgets per surface                                             | Surfaces exceed budgets silently; drift kills frameworks. Explicit budgets force refactor, not relaxation.                            |
| 2026-04-19 | d-skill 15-category framework as merge gate                           | Every skill scored 1-5 per category. <3 requires fix. Ensures consistent quality across contributed skills.                           |

---

## Cross-references

- Skill-creation skill: `.gaia/skills/d-skill/SKILL.md`
- Global agent rules: `CLAUDE.md` (root)
- CLAUDE.md map: `docs/MANIFEST.md`
- External doc loop: `gaia llms-txt generate` (command reference in `commands.md`)
- Human counterpart: `docs/reference/dx.md`
- Coding principles the agent follows: `docs/reference/code.md`
- Architecture the agent navigates: VISION.md §Architecture
- Enforcement mechanism: `.gaia/rules.ts`

_AX is reviewed on every PR that touches skills, CLAUDE.md files, or llms.txt generation. Changes to principles or Skills-vs-MCP policy require an ADR._
