// .gaia/rules.ts — single policy source (vision §H9)
//
// One file consumed by Claude Code hooks, CI workflows, editor
// integrations, and optional pre-commit hooks. Drift is structurally
// impossible because there is exactly one source.
//
// Each rule maps to a `skill` (the owner: an h-/w-/a- skill, a fractal
// CLAUDE.md folder, or a preserved product reference) and a `mechanism`
// describing where enforcement lives. Mechanisms with `kind: 'pending'`
// are aspirational — the rule is documented but not yet enforced.
//
// Schema renamed from ReferenceDomain → SkillDomain in Initiative 0001;
// skill prefix re-categorized in Initiative 0011 (h- harness, w- workflow,
// a- audit).

export type SkillDomain =
  // Workflow (w-*) — does the work
  | 'w-code'
  | 'w-write'
  | 'w-deploy'
  | 'w-infra'
  | 'w-initiative'
  | 'w-review'
  | 'w-debug'
  // Audit (a-*) — scores the work
  | 'a-health'
  | 'a-security'
  | 'a-ai'
  | 'a-ax'
  | 'a-ux'
  | 'a-observability'
  | 'a-dx'
  | 'a-perf'
  // Harness (h-*) — meta-authoring of the SRR triad
  | 'h-rules'
  | 'h-reference'
  | 'h-skill'
  // Fractal CLAUDE.md folders
  | 'apps/api'
  | 'apps/web'
  | 'packages/db'
  | 'packages/ui'
  | 'packages/auth'
  | 'packages/security'
  | 'packages/adapters'
  // Preserved product references
  | 'product/onboarding'
  | 'product/retention'

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

export type Mechanism =
  | { kind: 'pending'; note: string }
  | { kind: 'hook'; hook: string }
  | { kind: 'script'; script: string }
  | { kind: 'oxlint'; rule: string }
  | { kind: 'ast-grep'; rule: string }
  | { kind: 'tsc' }
  | { kind: 'ci'; job: string }
  /** LLM-judgment heuristic, executed by a skill (e.g. /review). Not deterministic. */
  | { kind: 'review'; skill: string; heuristic: string }
  /** Genuinely unmechanizable; documented only. Reason is mandatory. */
  | { kind: 'advisory'; reason: string }

export type Rule = {
  /** Stable identifier — used in hook output and CI logs. */
  id: string
  /** Skill or folder owning this rule. */
  skill: SkillDomain
  /** One-line summary. */
  description: string
  /** Tier in the escalation hierarchy (vision §5). */
  tier: RuleTier
  /** Where enforcement lives. `pending` means documented but not enforced. */
  mechanism: Mechanism
  /** Optional blocked patterns/paths consumed by hooks. */
  blocked?: readonly string[]
}

// ============================================================
// Rules organized by reference domain. Keep this list flat — one
// entry per (reference × concern).
// ============================================================

export const rules: readonly Rule[] = [
  // ─── code.md (the constitution itself) ───────────────────────
  {
    id: 'code/run-check-before-commit',
    skill: 'w-code',
    description: '`bun run check` (lint + typecheck + harden + test) must pass before any commit.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/pre-commit-check.ts' },
  },
  {
    id: 'code/no-as-any',
    skill: 'w-code',
    description: '`as any` is banned in feature/service code; types must be earned.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'typescript/no-explicit-any' },
  },
  {
    id: 'code/agents-duplicate-humans-extract',
    skill: 'w-code',
    description:
      'Agents do not invent abstractions. Humans extract after 3+ occurrences with shared change reason.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'w-review',
      heuristic: '.claude/skills/w-review/heuristics/check-agents-duplicate.ts',
    },
  },

  // ─── backend.md ───────────────────────────────────────────────
  {
    id: 'backend/route-typebox-required',
    skill: 'apps/api',
    description:
      'Every Elysia route with body/query/params must declare a TypeBox schema for each.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-route-typebox-required' },
  },
  {
    id: 'backend/route-response-schema-required',
    skill: 'apps/api',
    description: 'Every route declares response schemas keyed by status code.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-route-response-schema-required' },
  },
  {
    id: 'backend/protected-by-default',
    skill: 'apps/api',
    description:
      'Every Elysia plugin in features/*/routes.ts composes either protectedRoute or publicRoute.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-protected-by-default' },
  },

  // ─── database.md ──────────────────────────────────────────────
  {
    id: 'database/no-sql-interpolation',
    skill: 'packages/db',
    description: 'No SQL via string interpolation — use Drizzle query builder.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/migrations-versioned',
    skill: 'packages/db',
    description: 'Schema changes go through drizzle-kit generate; manual SQL never edits live DB.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-migrations.ts' },
  },

  // ─── testing.md ───────────────────────────────────────────────
  {
    id: 'testing/colocated-tests',
    skill: 'w-code',
    description: 'Tests live next to source: foo.ts → foo.test.ts in same folder.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tests-exist.ts' },
  },
  // testing/integration-uses-eden-treaty defined further below in
  // the additions section (single source of truth for this id).

  // ─── errors.md ────────────────────────────────────────────────
  {
    id: 'errors/no-throw-literal',
    skill: 'w-code',
    description:
      'Throwing string literals is banned (`throw "fail"`); throw `new AppError("CODE")` instead.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-throw-literal' },
  },

  // ─── security.md ──────────────────────────────────────────────
  {
    id: 'security/protect-config',
    skill: 'a-security',
    description: 'Block edits to locked config files unless explicitly authorized.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-config.ts' },
    blocked: ['tsconfig.json', '.oxlintrc.json', '.oxfmtrc.json', 'sgconfig.yml'],
  },
  {
    id: 'security/no-secrets-committed',
    skill: 'a-security',
    description: 'Block .env and *.key/*.pem files from being staged or committed.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.env', '*.key', '*.pem'],
  },
  {
    id: 'security/no-dangerous-shell',
    skill: 'a-security',
    description:
      'Block destructive shell commands (rm -rf, force-push, git reset --hard, etc.) at PreToolUse.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/block-dangerous.ts' },
  },
  {
    id: 'security/no-raw-env',
    skill: 'a-security',
    description:
      'Code outside packages/config/env.ts must not read process.env directly. Import `env` instead.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-hardcoded-secrets',
    skill: 'a-security',
    description: 'Block hardcoded production secrets matching common provider prefixes.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-eval',
    skill: 'a-security',
    description: 'eval() and new Function() are banned in shipped code.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-log-secrets',
    skill: 'a-security',
    description: 'console calls must not log password/secret/token/apiKey/auth_token variables.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── observability.md ────────────────────────────────────────
  {
    id: 'observability/no-console-log-in-prod',
    skill: 'a-observability',
    description: 'console.log in shipped code is a smell — use the structured logger.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/warn-console-log.ts' },
  },
  {
    id: 'observability/init-at-boot',
    skill: 'a-observability',
    description: 'apps/api/server/app.ts must call initObservability(env) before listen().',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-observability-init.ts' },
  },

  // ─── harness.md ──────────────────────────────────────────────
  {
    id: 'harness/security-harden-gate',
    skill: 'h-rules',
    description: 'Mechanical security validations gate every commit (env, secrets, eval, SQL).',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/harden-gate.ts' },
  },
  {
    id: 'harness/auto-load-references',
    skill: 'h-rules',
    description:
      'Editing a file in domain X advises the agent to read .gaia/reference/<X>.md first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/permissions-immutable',
    skill: 'h-rules',
    description:
      '.gaia/protocols/permissions.md and delegation.md cannot be modified by hook or skill.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.gaia/protocols/permissions.md', '.gaia/protocols/delegation.md'],
  },
  {
    id: 'harness/manifest-coverage',
    skill: 'h-rules',
    description: '.gaia/MANIFEST.md lists every folder with a CLAUDE.md and vice versa.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-manifest.ts' },
  },
  {
    id: 'code/knip-gate-production',
    skill: 'w-code',
    description:
      'Dead code / unused dependencies fail CI. Knip runs as a gate (not advisory) on every PR.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'dead-code' },
  },

  // ─── commands.md ─────────────────────────────────────────────
  {
    id: 'commands/use-bun-not-npm',
    skill: 'h-rules',
    description: 'Bun is the package manager and runtime; npm/pnpm/yarn invocations are wrong.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── code.md (additions) ─────────────────────────────────────
  {
    id: 'code/named-errors-no-bare-throw',
    skill: 'w-code',
    description:
      'Feature/service code must not `throw new Error(...)` — use AppError from @gaia/errors.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-no-throw-new-error-in-features' },
  },
  {
    id: 'code/one-schema-many-consumers',
    skill: 'w-code',
    description:
      'Shapes flow from one source (Drizzle schema → drizzle-typebox → Eden Treaty types). No manual `type Foo = {...}` paralleling a schema.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-one-schema-many-consumers' },
  },

  // ─── backend.md (additions) ──────────────────────────────────
  {
    id: 'backend/no-hono-imports',
    skill: 'apps/api',
    description: 'Hono is the legacy stack; new code must not import from `hono` or `@hono/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-elysia-in-adapters',
    skill: 'apps/api',
    description:
      'Adapters (packages/adapters/) are framework-independent — no imports from `elysia` or `@elysiajs/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    skill: 'apps/api',
    description:
      'Feature code must not import vendor SDKs directly — go through @gaia/adapters/<capability>.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-vendor-sdk-in-features' },
  },
  {
    id: 'backend/no-sibling-feature-imports',
    skill: 'apps/api',
    description:
      'Features in apps/api/features/<X>/ must not import from sibling feature folders. Cross-feature reuse is via @gaia/<package> promotion.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-sibling-feature-imports' },
  },

  // ─── frontend.md ─────────────────────────────────────────────
  {
    id: 'frontend/no-direct-fetch-in-routes',
    skill: 'apps/web',
    description:
      'apps/web/src/routes/** must not call `fetch()` directly — use the typed Eden Treaty client from ~/lib/api.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-vendor-sdk-on-client',
    skill: 'apps/web',
    description:
      'apps/web/** must not import vendor SDKs (Polar, Stripe, Resend, Anthropic). Vendor calls go server-side via Eden Treaty.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-hardcoded-colors',
    skill: 'apps/web',
    description: 'apps/web/** must not embed hex/rgb colors — read from the design tokens.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/routes-call-pass-render-only',
    skill: 'apps/web',
    description:
      'Route components do three things: call (service/resource/signal), pass (props), render (JSX). No business logic in routes.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'frontend-routes-call-pass-render-only' },
  },

  // ─── database.md (additions) ─────────────────────────────────
  {
    id: 'database/no-raw-pg-bypass',
    skill: 'packages/db',
    description:
      'Direct `postgres` driver imports are restricted to packages/db/. Everywhere else uses Drizzle via @gaia/db.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/typebox-derivation-mandatory',
    skill: 'packages/db',
    description:
      'TypeBox schemas for tables must derive from Drizzle (drizzle-typebox createSelectSchema / createInsertSchema).',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-typebox-derivation.ts' },
  },
  {
    id: 'database/audit-columns-required',
    skill: 'packages/db',
    description:
      'Every Drizzle table (`pgTable(...)`) declares `createdAt`. Mutable tables also declare `updatedAt` (judgment-tier, /review).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'database-audit-columns-required' },
  },

  // ─── testing.md (additions) ──────────────────────────────────
  {
    id: 'testing/no-test-only',
    skill: 'w-code',
    description:
      '`it.only` / `describe.only` / `test.only` must not be committed — they hide skipped tests.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'testing/integration-uses-eden-treaty',
    skill: 'w-code',
    description:
      '*.integration.test.ts uses Eden Treaty (treaty(app)) against the live app instance.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-integration-treaty.ts' },
  },

  // ─── errors.md (additions) ───────────────────────────────────
  {
    id: 'errors/no-leak-secrets-in-messages',
    skill: 'w-code',
    description:
      'Error messages must not interpolate password/secret/token/api_key into user-visible strings.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'errors/no-bare-catch',
    skill: 'w-code',
    description:
      '`catch` blocks must rethrow, handle a specific error type, or call a typed handler.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-empty' },
  },

  // ─── security.md (additions) ─────────────────────────────────
  {
    id: 'security/cve-scan-ci',
    skill: 'a-security',
    description: 'osv-scanner runs on every PR; high/critical CVEs block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'deps' },
  },
  {
    id: 'security/secret-scan-ci',
    skill: 'a-security',
    description: 'gitleaks runs on every PR; committed secrets block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'secrets' },
  },
  {
    id: 'security/csrf-on-mutations',
    skill: 'a-security',
    description:
      'POST/PUT/PATCH/DELETE routes apply CSRF middleware (better-auth provides it on protectedRoute).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'security-csrf-on-mutations' },
  },
  {
    id: 'security/rate-limit-on-public',
    skill: 'a-security',
    description: 'Public routes apply rate-limit middleware (publicRoute composes it).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'security-rate-limit-on-public' },
  },

  // ─── observability.md (additions) ────────────────────────────
  {
    id: 'observability/no-pii-in-logs',
    skill: 'a-observability',
    description:
      'Logger calls must not log objects keyed `password|secret|token|email` — redact first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── tokens.md ───────────────────────────────────────────────
  {
    id: 'tokens/single-source',
    skill: 'packages/ui',
    description:
      'CSS variables are generated from packages/ui/tokens.ts. packages/ui/styles.css must equal what scripts/generate-tokens-css.ts emits.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tokens-sync.ts' },
  },

  // ─── ax.md ───────────────────────────────────────────────────
  {
    id: 'ax/skill-md-frontmatter',
    skill: 'h-skill',
    description: 'Every SKILL.md ships with YAML frontmatter declaring `name:` and `description:`.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },

  // ─── voice.md ────────────────────────────────────────────────
  {
    id: 'voice/no-marketing-vocabulary',
    skill: 'w-write',
    description:
      'Avoid marketing buzzwords (revolutionize, seamless, leverage, unlock, cutting-edge) in content/ and root README.md.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-marketing-vocab.ts' },
  },

  // ─── workflow.md ─────────────────────────────────────────────
  {
    id: 'workflow/initiative-frontmatter-required',
    skill: 'h-rules',
    description:
      'Initiative .md files in .gaia/initiatives/*/ declare parent, hypothesis, and measurement fields.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },
  {
    id: 'workflow/project-touches-required',
    skill: 'h-rules',
    description: 'Project .md files declare `touches:` (files/modules) and `depends_on:` arrays.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },

  // ─── dx.md ───────────────────────────────────────────────────
  {
    id: 'dx/stdout-data-stderr-narration',
    skill: 'a-dx',
    description:
      'CLI scripts print data to stdout and narration to stderr — enables piping without corruption.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-cli-stdout.ts' },
  },

  // ─── references.md (the meta-reference) ──────────────────────
  {
    id: 'references/voice-consulted',
    skill: 'h-reference',
    description:
      'References are imperative and consulted-during-action; tutorial-style narration belongs in dx.md or README.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-voice.ts' },
  },
  {
    id: 'references/principle-shape',
    skill: 'h-reference',
    description:
      'Every numbered reference principle has the 5-part shape: title+description, 2-4 rules bullets, enforcement, anti-pattern, pattern.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-shape.ts' },
  },
  {
    id: 'references/principle-has-rule',
    skill: 'h-reference',
    description:
      'Every reference principle maps 1:1 to a rules.ts entry (even pending). Reference principles without a rule are aspirational.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-rule-mapping.ts' },
  },
  {
    id: 'references/feature-scope',
    skill: 'h-reference',
    description:
      'Per-feature references live at .gaia/reference/features/<feature>.md and load only when editing that feature.',
    tier: 'architecture',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'references/adversarial-review',
    skill: 'h-reference',
    description:
      'New reference files (or major rewrites) include a 6-specialist adversarial review per principle in the PR.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'w-review',
      heuristic: '.claude/skills/w-review/heuristics/check-adversarial-review.ts',
    },
  },
  {
    id: 'references/staleness',
    skill: 'h-reference',
    description:
      'References declare a Last verified date; >180 days without re-verification is debt, surfaced by a-health.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-staleness.ts' },
  },
  {
    id: 'references/voice-imperative',
    skill: 'h-reference',
    description:
      'Reference principles use imperative present tense; avoid hedge words ("tend to", "usually", "you might want to").',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-voice.ts' },
  },

  // ─── product/onboarding.md ───────────────────────────────────
  {
    id: 'onboarding/ttv-budget',
    skill: 'product/onboarding',
    description:
      "Time-to-first-value ≤60 seconds (p50). Don't gate first value behind email verification.",
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.claude/skills/a-health/checks/check-ttv-budget.ts' },
  },
  {
    id: 'onboarding/activation-defined-once',
    skill: 'product/onboarding',
    description:
      'Exactly one trackActivation() function in packages/adapters/analytics.ts; no ad-hoc track("activation"|"activated"|...) calls.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-activation-defined-once.ts' },
  },
  {
    id: 'onboarding/no-tour-modals',
    skill: 'product/onboarding',
    description:
      'No modal-tour libraries (shepherd.js, intro.js, react-joyride). Empty states are the onboarding surface.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'onboarding/progressive-disclosure',
    skill: 'product/onboarding',
    description:
      'New users see ≤5 nav items; advanced features appear after activation. Settings reveal sections progressively.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/checks/check-progressive-disclosure.ts',
    },
  },
  {
    id: 'onboarding/persist-anonymous',
    skill: 'product/onboarding',
    description:
      'Anonymous user work persists across signup boundary via localStorage / IndexedDB; signup form rehydrates state.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/checks/check-persist-anonymous.ts',
    },
  },
  {
    id: 'onboarding/silent-first-failure',
    skill: 'product/onboarding',
    description:
      "Onboarding routes don't render Alert(error); failures absorbed silently and retried in background.",
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/checks/check-silent-failure.ts',
    },
  },
  {
    id: 'onboarding/funnel-events',
    skill: 'product/onboarding',
    description:
      'Required events: visit, signup_start, signup_complete, activation. Each step tracked independently.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-funnel-events.ts' },
  },
  {
    id: 'onboarding/email-on-signup',
    skill: 'product/onboarding',
    description:
      'First transactional email sent within 5 minutes; better-auth sendOnSignUp:true; sendVerificationEmail wired.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-email-on-signup.ts' },
  },

  // ─── product/retention.md ────────────────────────────────────
  {
    id: 'retention/dau-wau-floor',
    skill: 'product/retention',
    description: 'DAU/WAU ratio target ≥40%. Sub-40% sustained four weeks signals weak retention.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.claude/skills/a-health/checks/check-dau-wau.ts' },
  },
  {
    id: 'retention/notification-quality',
    skill: 'product/retention',
    description:
      'Notifications carry user-requested value; ≤3/week email, ≤1/day push. Each has granular unsubscribe.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/checks/check-notification-quality.ts',
    },
  },
  {
    id: 'retention/state-machine',
    skill: 'product/retention',
    description:
      'Users have engagement_state enum (active|dormant|churned); recomputed nightly; messaging gated on state.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-engagement-state.ts' },
  },
  {
    id: 'retention/click-to-cancel',
    skill: 'product/retention',
    description:
      'Cancel button visible from /billing in ≤2 clicks. Polar customer portal handles the actual cancel.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/checks/check-click-to-cancel.ts',
    },
  },
  {
    id: 'retention/haircut-offered',
    skill: 'product/retention',
    description: 'Cancel flow surfaces tier-down + pause options BEFORE confirming cancellation.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.claude/skills/a-health/checks/check-haircut.ts' },
  },
  {
    id: 'retention/cohort-dashboards',
    skill: 'product/retention',
    description:
      'Cohort retention dashboards exist for week-1, week-4, week-12 in PostHog (or equivalent).',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-posthog-dashboards.ts' },
  },
  {
    id: 'retention/dunning-configured',
    skill: 'product/retention',
    description:
      'Failed payments trigger dunning (≥3 retries over 14 days); subscription.past_due gives 7-day grace before cancel.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-dunning.ts' },
  },
  {
    id: 'retention/usage-tiers',
    skill: 'product/retention',
    description:
      'users.usage_tier enum (light|middle|power); tier_promoted analytics event fires on transitions.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-usage-tiers.ts' },
  },

  // ─── deployment.md (gaps from previous PR) ───────────────────
  {
    id: 'deployment/promote-digest',
    skill: 'w-deploy',
    description: 'Image deploys reference content-addressable digests, not floating tags.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'digest-deploy' },
  },
  {
    id: 'deployment/preview-env-per-pr',
    skill: 'w-deploy',
    description: 'Every PR opens a preview deployment + preview database (Neon branch).',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'preview-env' },
  },
  {
    id: 'deployment/three-health-checks',
    skill: 'w-deploy',
    description:
      'Three endpoints: /health (liveness), /health/ready (readiness), post-deploy synthetic test.',
    tier: 'lint',
    mechanism: { kind: 'ci', job: 'health-routes' },
  },
  {
    id: 'deployment/rollback-mttr',
    skill: 'w-deploy',
    description: '≤5 minute rollback MTTR; previous image digest reachable; runbook exists.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'rollback-runbook' },
  },
  {
    id: 'deployment/ttfd-30min',
    skill: 'w-deploy',
    description: 'New operator reaches green /health/ready in ≤30 minutes from clone.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/first-deploy-audit.ts' },
  },

  // ─── methodology.md (constitutional loop principles) ─────────
  {
    id: 'methodology/constitutional-loop',
    skill: 'h-rules',
    description:
      'Every concern has up to three forms (Reference, Rule, Skill). A concern in only one substrate is debt.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/rules-coverage.ts' },
  },
  {
    id: 'methodology/principle-rule-mapping',
    skill: 'h-rules',
    description:
      'Every reference principle maps 1:1 to rules.ts entries. Pending → enforced cycle SLO 14 days.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-reference-rule-mapping.ts' },
  },
  {
    id: 'methodology/hooks-deterministic',
    skill: 'h-rules',
    description:
      'Hooks execute <100ms, no LLM calls, fail-closed. Judgment goes in CLAUDE.mds, not hooks.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-hook-determinism.ts' },
  },
  {
    id: 'methodology/memory-decay',
    skill: 'h-rules',
    description: 'memory/episodic/ entries older than 90 days without re-trigger are archived.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'memory-decay' },
  },
  {
    id: 'harness/skill-reference-pairing',
    skill: 'h-rules',
    description:
      'Every skill has exactly one reference.md sibling. The skill-reference hook auto-loads it on Skill invocation; fails closed if absent.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },
  {
    id: 'harness/auto-load-fractal-claude',
    skill: 'h-rules',
    description:
      'Editing a file walks the folder tree from edit target to repo root, loading every CLAUDE.md found. Folder-scoped principles live in fractal CLAUDE.md, not skill folders.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/adr-numbering',
    skill: 'h-rules',
    description:
      'ADRs at .gaia/adrs/NNNN-<title>.md use append-only numbering; superseded ADRs stay with status updated, never deleted.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'scripts/check-adr-numbering.ts (planned)' },
  },

  // ─── ai.md (gaps from previous PR) ───────────────────────────
  {
    id: 'ai/prompts-as-constants',
    skill: 'a-ai',
    description:
      'System prompts are TypeScript constants in apps/api/server/<feature>/prompts.ts; no inline strings.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-prompts-as-constants' },
  },
  {
    id: 'ai/bounded-calls',
    skill: 'a-ai',
    description:
      'Every complete() call provides maxTokens; output structure pinned via JSON mode or tool-use.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-bounded-calls' },
  },
  {
    id: 'ai/model-pinned',
    skill: 'a-ai',
    description:
      'Model identity is a named constant (MODELS.<feature>); no string literals scattered.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-model-pinned' },
  },
  {
    id: 'ai/cache-hit-target',
    skill: 'a-ai',
    description: 'Per-feature cache-hit rate target ≥30%; alerts when sustained below.',
    tier: 'architecture',
    mechanism: {
      kind: 'advisory',
      reason:
        'Cache-hit rate is a runtime metric — not catchable at commit. Configure Axiom alert at <30% rolling 24h on apps/api/features/*/cache_hit gauge.',
    },
  },
  {
    id: 'ai/stream-cancel',
    skill: 'a-ai',
    description: 'Streaming routes propagate AbortSignal upstream and set X-Accel-Buffering: no.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-stream-cancel' },
  },
  {
    id: 'observability/ai-trace-tags',
    skill: 'a-observability',
    description:
      'Every AI call emits a trace span with tags: model, tokens (in/out/cache), latency, cost, tool_use_count, error_class.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/w-review/heuristics/check-ai-trace-tags.ts',
    },
  },
  {
    id: 'ai/tool-loop-bounded',
    skill: 'a-ai',
    description:
      'Tool-use loops bounded (max depth 10, max same-tool retries 3). Audit log on every tool call.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-tool-loop-bounded' },
  },

  // ─── skills.md (gaps from previous PR) ───────────────────────
  {
    id: 'skills/output-mode-required',
    skill: 'h-skill',
    description:
      'Every SKILL.md ends with an Output section naming its mode (fix, report, or question).',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },
  {
    id: 'skills/cold-start-safe',
    skill: 'h-skill',
    description:
      'Skills run from a cold start; no "as I mentioned" assumptions; references-by-path for shared content.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },
  {
    id: 'skills/numbered-phases',
    skill: 'h-skill',
    description: 'Skills with non-trivial work use ## Phase N: headers (sequential by default).',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },
  {
    id: 'skills/sandwich-gates',
    skill: 'h-skill',
    description:
      'Skills mutating files have an identical pre-condition (Phase 0) and final-gate phase running the same check.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/w-review/heuristics/check-sandwich-gates.ts',
    },
  },
  {
    id: 'skills/typed-output',
    skill: 'h-skill',
    description:
      'Skill output: one mode per line (fix, report, or question). Reports include numeric confidence.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },
  {
    id: 'skills/sibling-layout',
    skill: 'h-skill',
    description:
      'Sibling files typed by location: <skill>/scripts/* for code, <skill>/templates/* for inputs, <skill>/rules-*.md for sub-instructions.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },

  // ─── a-health/reference.md (audit-orchestration principles) ──────────────
  {
    id: 'health/dispatch-not-reaudit',
    skill: 'a-health',
    description:
      'a-health dispatches sibling a-* audits; SKILL.md must not contain checklists that re-implement a sibling audit.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'check-no-duplication.ts (planned) — greps SKILL.md for sibling-owned principle phrases',
    },
  },
  {
    id: 'health/composite-score-formula',
    skill: 'a-health',
    description:
      'Composite score is a 12-axis vector + scalar; weights live in a-health/reference.md and sum to 1.0.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'check-score-formula.ts (planned) — asserts weights sum 1.0 and match aggregate-scores.ts',
    },
  },
  {
    id: 'health/trend-required',
    skill: 'a-health',
    description:
      'Every audit appends a row to the prior .gaia/audits/a-health/<YYYY-MM-DD>.md ## Audit History; missing history surfaces as P0.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/trend.ts',
    },
  },
  {
    id: 'health/worst-file-leaderboard',
    skill: 'a-health',
    description:
      'The audit report ranks top 5 worst files cross-audit; files in ≥3 audits get systemic-debt tag.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/worst-files.ts',
    },
  },
  {
    id: 'health/coverage-drift',
    skill: 'a-health',
    description:
      'Pending rules.ts entries past the 14-day SLO surface as P1 in the audit fix plan.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/rules-coverage.ts' },
  },
  {
    id: 'health/skip-intelligence',
    skill: 'a-health',
    description:
      'An axis with prior ≥9.5 AND zero changed files in scope reuses prior score with (skipped) annotation; --force overrides.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'aggregate-scores.ts respects skip rule and stamps git SHA + tool versions',
    },
  },
  {
    id: 'health/report-only',
    skill: 'a-health',
    description: 'a-health is report-only; only files under .gaia/audits/a-health/ may be written.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'Phase 4 sandwich gate compares git diff --name-only to allowed-writes whitelist',
    },
  },
  {
    id: 'health/partial-report-fallback',
    skill: 'a-health',
    description:
      'Sub-audit failure marks its axis error and the audit completes; partial report beats no report.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'aggregate-scores.ts wraps each Skill(a-*) call in try/catch; emits axis: "error" on failure',
    },
  },
  {
    id: 'health/continuous-pulse',
    skill: 'a-health',
    description:
      'Stop hook fires quick-pulse.ts after sessions touching ≥10 files; appends one row to .gaia/audits/a-health/pulse.jsonl.',
    tier: 'hook',
    mechanism: {
      kind: 'hook',
      hook: '.claude/skills/a-health/scripts/quick-pulse.ts',
    },
  },
  {
    id: 'health/duplication-budget',
    skill: 'a-health',
    description:
      'check-duplication detects ≥3 occurrences of 5-line normalized shingles across distinct files; budget threshold drives the duplication axis.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/check-duplication.ts',
    },
  },
  {
    id: 'health/self-audit',
    skill: 'a-health',
    description:
      'a-ax audits a-health on the standard quarterly cadence; a-health does not get a free pass.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'a-ax',
      heuristic: 'a-ax sweep includes .claude/skills/a-health/SKILL.md and reference.md',
    },
  },
  // ─── packages/adapters/CLAUDE.md ──────────────────────────────
  // Stub coverage — the canonical 10 patterns deserve full rules; emit via
  // /h-rules. These three pin the highest-leverage invariants.
  {
    id: 'adapters/no-vendor-sdk-outside-package',
    skill: 'packages/adapters',
    description:
      'Vendor SDK imports (resend, @polar-sh/sdk, @anthropic-ai/sdk, posthog-node) are allowed only in packages/adapters/.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule scoped by file path; emit via /h-rules' },
  },
  {
    id: 'adapters/provider-error-on-failure',
    skill: 'packages/adapters',
    description:
      'Every public adapter function wraps its vendor call in try/catch and throws ProviderError on failure.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'ast-grep on packages/adapters/*.ts; emit via /h-rules' },
  },
  {
    id: 'adapters/no-fetch-outside-adapters',
    skill: 'packages/adapters',
    description:
      'Plain fetch() / Bun.fetch() forbidden outside packages/adapters/ — user-driven URLs go through safeFetch.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule; SSRF defense (security #11)' },
  },

  // ─── packages/auth/CLAUDE.md ──────────────────────────────────
  {
    id: 'auth/single-entry-point',
    skill: 'packages/auth',
    description:
      "import * from 'better-auth' (and better-auth/*) is allowed only in packages/auth/.",
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule scoped by file path' },
  },
  {
    id: 'auth/get-session-only',
    skill: 'packages/auth',
    description:
      'auth.api.getSession is the only API for session lookups — no manual cookie parsing or db.query.sessions reads outside packages/auth/.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on routes; advisory in /w-review' },
  },
  {
    id: 'auth/argon2id-passwords',
    skill: 'packages/auth',
    description:
      'Passwords hash with Bun.password.hash(pw, "argon2id"). bcrypt and sha-* are banned.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule; harden-check could enforce' },
  },

  // ─── packages/security/CLAUDE.md ──────────────────────────────
  // Many security rules already live under skill: 'a-security' (audit
  // surface). These are the runtime-primitive rules whose home is the
  // package itself, distinct from the audit skill.
  {
    id: 'security/protected-by-default',
    skill: 'packages/security',
    description:
      'Every Elysia plugin in apps/api/server/features/ composes either protectedRoute or publicRoute.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-protected-by-default' },
  },
  {
    id: 'security/uniform-auth-errors',
    skill: 'packages/security',
    description:
      'Auth failures surface a single client-facing code; differentiation lives only in logs (no USER_NOT_FOUND vs WRONG_PASSWORD on the wire).',
    tier: 'architecture',
    mechanism: { kind: 'review', skill: 'w-review', heuristic: 'auth-error-uniformity' },
  },
  {
    id: 'security/security-headers-applied',
    skill: 'packages/security',
    description:
      'Every Elysia response goes through applySecurityHeaders (composed by protectedRoute/publicRoute and the app onBeforeHandle hook).',
    tier: 'test',
    mechanism: {
      kind: 'pending',
      note: 'integration test asserts CSP/HSTS/X-Frame on every route',
    },
  },
  {
    id: 'security/audit-on-mutation',
    skill: 'packages/security',
    description:
      'Every POST/PUT/PATCH/DELETE in apps/api/server/ produces an audit log entry via @gaia/security/audit-log.',
    tier: 'test',
    mechanism: { kind: 'pending', note: 'integration test sweeps registered routes' },
  },
  {
    id: 'security/ownership-on-resource-routes',
    skill: 'packages/security',
    description:
      "Resource routes (`/x/:id`) filter the query by ownership AND call `requireOwnership(...)`. Returns 404 (not 403) when the row exists but isn't owned.",
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL: db.query.*.findFirst with single eq() on id flags as BOLA risk; security integration test sweeps every /:id route',
    },
  },
  {
    id: 'security/typebox-at-boundary',
    skill: 'packages/security',
    description:
      'POST/PUT/PATCH routes declare a TypeBox `body` schema; `sql.raw()` is banned outside migrations; `Bun.spawn` rejects variable as first array element; default request-body cap 1MB.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-route-typebox-required' },
  },
  {
    id: 'security/rate-limit-tiered',
    skill: 'packages/security',
    description:
      'Each business flow (signup, login, password reset, checkout) has a flow-level limit on top of endpoint-level limits. New routes inside a known flow require an entry in `packages/security/rate-limits.ts`.',
    tier: 'test',
    mechanism: {
      kind: 'pending',
      note: 'integration test: 11 logins → 11th 429; 4 password resets per email → 4th 429',
    },
  },
  {
    id: 'security/session-hardening',
    skill: 'packages/security',
    description:
      'Login sets HttpOnly + Secure (prod) + SameSite=Lax cookies; password change revokes prior sessions; argon2id hashes; expiresIn ≤ 7d. ADR required to relax any of these.',
    tier: 'test',
    mechanism: {
      kind: 'pending',
      note: 'integration test inspects Set-Cookie + post-password-change session reuse returns 401',
    },
  },
  {
    id: 'security/csrf-multi-layer',
    skill: 'packages/security',
    description:
      'Mutations cannot use GET; cross-origin POST without trusted Origin returns 403; Better Auth `disableCSRFCheck` is never `true`; `trustedOrigins` has no wildcards.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'lint: .get handlers may not call db.insert/update/delete or adapter mutations; integration test for Origin allowlist',
    },
  },
  {
    id: 'security/cors-explicit-allowlist',
    skill: 'packages/security',
    description:
      'CORS uses an explicit literal-string allowlist — `origin: "*"`, `origin: true`, regex patterns, and reflect-origin functions are banned. `credentials: true` requires matching named origins.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint custom rule on @elysiajs/cors options object' },
  },
  {
    id: 'security/secrets-discipline',
    skill: 'packages/security',
    description:
      'Secrets never in code, URL params, client bundles, logs, or error responses. process.env reads only in packages/config/env.ts; gitleaks pre-commit + CI; bundle scan rejects high-entropy strings.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/ssrf-safefetch',
    skill: 'packages/security',
    description:
      'fetch() and Bun.fetch() forbidden outside packages/adapters/ and packages/testing/. User-driven URLs go through `safeFetch` which blocks private CIDRs, localhost, and link-local (169.254.0.0/16) including DNS rebinding.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'oxlint scoped by file path; security integration test asserts 169.254.169.254 / localhost / 10.0.0.1 / file:// all rejected',
    },
  },
  {
    id: 'security/llm-untrust-layered',
    skill: 'packages/security',
    description:
      'LLM output never feeds db.update/insert/delete without a HUMAN_APPROVED intermediary; never passed to innerHTML/dangerouslySetInnerHTML; chat-view CSP restricts img-src to self+data:; system prompts and external content separated by tags; output validated against a TypeBox schema.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'oxlint custom rule on llm.* return types reaching db.* or innerHTML; injection test suite required',
    },
  },
  {
    id: 'security/no-error-leakage',
    skill: 'packages/security',
    description:
      'Production error responses contain { code, message, traceId } only — never stack traces, cause chains, env, or file paths. Unknown errors wrap into INTERNAL_ERROR; never forwarded raw.',
    tier: 'test',
    mechanism: {
      kind: 'pending',
      note: 'integration test: trigger unknown error in NODE_ENV=production, assert response body has no `stack`/`cause`/path/env',
    },
  },
  {
    id: 'security/supply-chain-scans',
    skill: 'packages/security',
    description:
      'CI runs gitleaks + osv-scanner + semgrep + Socket.dev + CodeQL on every PR; `bun install --frozen-lockfile`; 7-day cool-off on new dep versions; ignore-scripts where feasible; license scan blocks GPL/AGPL.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'security-scans' },
  },
] as const

export type RuleId = (typeof rules)[number]['id']

export function findRule(id: string): Rule | undefined {
  return rules.find((r) => r.id === id)
}

export function rulesForSkill(skill: SkillDomain): readonly Rule[] {
  return rules.filter((r) => r.skill === skill)
}

export function rulesByMechanism(kind: Mechanism['kind']): readonly Rule[] {
  return rules.filter((r) => r.mechanism.kind === kind)
}

/**
 * Return all blocked patterns for a given rule id. Hooks that need a
 * shared blocklist (e.g. protect-config, protect-files) read from here
 * instead of hardcoding paths — vision §H9.
 */
export function blockedFor(id: string): readonly string[] {
  return findRule(id)?.blocked ?? []
}

/**
 * Skill domains the harness has at least one enforced mechanism for.
 * Used by /review and audit reporting to show the enforcement coverage
 * of the constitution.
 */
export function enforcedSkills(): readonly SkillDomain[] {
  const set = new Set<SkillDomain>()
  for (const r of rules) {
    if (r.mechanism.kind !== 'pending') set.add(r.skill)
  }
  return [...set]
}
