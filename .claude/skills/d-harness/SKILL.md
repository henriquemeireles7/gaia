---
name: d-harness
description: "Improve the harness based on errors. Analyzes build failures, production errors, and bugs to create prevention rules in CLAUDE.md, hooks, configs, or scripts. Triggers: 'd-harness', 'harness improve', 'learn from error', 'prevent this', 'why did this break'."
---

# d-harness — Error → Prevention Feedback Loop

## What this does
When an error happens (build failure, production crash, bug, deploy failure), this skill
analyzes the root cause and encodes a prevention rule into the harness so it never happens
again. The rule goes into the right layer: hook (deterministic), CLAUDE.md (judgment),
config file, or script.

## When to use
- After a build/deploy failure
- After a production error
- After finding a bug that should have been caught
- After a PR conflict that could have been prevented
- Anytime something breaks and you think "the harness should have caught this"

## Input
The user provides one of:
- A build log or error message
- A stack trace
- A bug description
- A deploy failure screenshot
- A description of what went wrong

## The Loop: Error → Classify → Encode → Verify

### Step 1: Classify the Error
Classify the error manually using these rules:
- Machine-checkable pattern → **hook** (deterministic enforcement)
- Judgment-required pattern → **CLAUDE.md** (advisory guidance)
- Config mismatch → **config file** (biome.json, tsconfig, railway.toml, Dockerfile)
- Complex multi-file check → **script** (harden-check.ts or new script)
- Strategic/architectural → **universal file** (decisions/*.md)

### Step 2: Check for Existing Rules
Search the harness layers for existing prevention rules. Check:
- All CLAUDE.md files (root + folders)
- All hook scripts in .claude/hooks/
- Config files (biome.json, tsconfig.json, railway.toml)
- Universal files (decisions/*.md)
- harden-check.ts patterns

Possible outcomes:
- **Rule exists but failed** → The rule is there but wasn't enforced. Fix the enforcement mechanism.
- **Rule exists but incomplete** → The rule covers a subset. Extend it.
- **No rule exists** → Create a new one.

### Step 3: Encode the Prevention Rule

Based on the classification layer:

#### Layer: Hook (deterministic, machine-checkable)
Create or update a hook in `.claude/hooks/`:
```ts
// .claude/hooks/my-check.ts
// Read stdin JSON for context, check the condition, exit non-zero to block
```
Register it in `.claude/settings.json` under the appropriate event:
- `PreToolUse` → block before the action happens
- `PostToolUse` → warn/fix after the action
- `Stop` → batch check when agent finishes

#### Layer: CLAUDE.md (judgment-based)
Add a Critical Rule to the appropriate folder's CLAUDE.md:
```markdown
## Critical Rules
- NEVER [the thing that caused the error] — [why: what broke]
- ALWAYS [the prevention pattern] — [what it prevents]
```

If it's a root-level concern, add to root CLAUDE.md.
If it's folder-specific, add to that folder's CLAUDE.md.

#### Layer: Config file
Update the relevant config:
- `biome.json` → lint/format rules
- `tsconfig.json` → type checking strictness
- `railway.toml` → deploy settings
- `Dockerfile` → build/runtime configuration

#### Layer: Script (complex check)
Add a check to `platform/scripts/harden-check.ts` or create a new script:
- Add the pattern to the `PATTERNS` array in harden-check.ts
- Or create a new script in `.claude/skills/d-harness/scripts/` for skill-specific checks

#### Layer: Universal file
Update the relevant `decisions/*.md` file:
- `deploy.md` → deploy/infra rules
- `code.md` → coding patterns
- `harness.md` → harness architecture
- `health.md` → security/performance findings

### Step 4: Verify the Rule
Manually verify:
- The rule file exists and is syntactically valid
- The rule would have caught the original error
- The rule doesn't conflict with existing rules
- If it's a hook, it's registered in settings.json

### Step 5: Document the Learning
Append to `decisions/health.md` under "## Incident Log":
```markdown
### [Date] — [Brief description]
- **Error**: [what happened]
- **Root cause**: [why]
- **Prevention**: [what rule was added, where]
- **Layer**: [hook|claude-md|config|script|universal-file]
```

## Rules
- NEVER add a rule without understanding the root cause first
- NEVER add a CLAUDE.md rule when a hook would work (prefer deterministic over advisory)
- NEVER add duplicate rules — always check existing rules first (Step 2)
- ALWAYS verify the rule would have caught the error (Step 4)
- ALWAYS document the learning in health.md (Step 5)
- Keep rules specific — "NEVER do X because Y" not "be careful with X"
- One error = one rule. Don't over-generalize from a single incident.
- If recurrence risk is "low" (true one-off), skip rule creation — just fix and document

## Error Taxonomy (for classification)

### Build errors
- Lockfile out of sync (package.json changed, lockfile not regenerated)
- Missing dependency in Docker runtime stage
- TypeScript compilation errors
- Biome lint/format failures
- Missing environment variables

### Deploy errors
- Railway pre-deploy command fails (missing files in container)
- Health check timeout (app doesn't start)
- Migration failure (schema mismatch)
- Config mismatch (railway.toml vs Dockerfile)

### Runtime errors
- Unhandled exceptions (missing error boundaries)
- Auth/permission bypass
- Data validation gap (missing Zod schema)
- N+1 query performance

### Logic errors
- Wrong business logic (calculation, state machine)
- Race condition
- Edge case not handled

### Config errors
- Wrong file in .gitignore
- Biome rule too strict/lenient
- tsconfig path alias broken

## Mandatory Output
```
=== HARNESS IMPROVEMENT ===
Error: [brief description]
Classification: [category] / [severity] / [recurrence]
Layer: [hook|claude-md|config|script|universal-file]
Action: [created|updated|extended] [file path]
Rule: [the specific rule added]
Verified: [yes/no — would it have caught the original error?]
```
