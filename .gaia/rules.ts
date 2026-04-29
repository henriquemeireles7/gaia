// .gaia/rules.ts — single policy source (vision §H9)
//
// One file consumed by Claude Code hooks, CI workflows, editor
// integrations, and optional pre-commit hooks. Drift is structurally
// impossible because there is exactly one source.
//
// Each rule maps to a `reference` domain (one of the constitution files
// in .gaia/reference/) and a `mechanism` describing where enforcement
// lives. Mechanisms with `kind: 'pending'` are aspirational — the rule
// is documented but not yet enforced. v1 ships with at least one
// mechanism per reference file (vision §Open-Specs-4); the rest are
// tracked here so the gap is visible.

export type ReferenceDomain =
  | 'code'
  | 'backend'
  | 'frontend'
  | 'database'
  | 'testing'
  | 'errors'
  | 'security'
  | 'observability'
  | 'commands'
  | 'design'
  | 'tokens'
  | 'ux'
  | 'dx'
  | 'ax'
  | 'voice'
  | 'workflow'
  | 'harness'
  | 'deployment'
  | 'methodology'
  | 'ai'
  | 'skills'
  | 'references'
  | 'onboarding'
  | 'retention'

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

export type Mechanism =
  | { kind: 'pending'; note: string }
  | { kind: 'hook'; hook: string }
  | { kind: 'script'; script: string }
  | { kind: 'oxlint'; rule: string }
  | { kind: 'ast-grep'; rule: string }
  | { kind: 'tsc' }
  | { kind: 'ci'; job: string }

export type Rule = {
  /** Stable identifier — used in hook output and CI logs. */
  id: string
  /** Reference file this rule enforces. */
  reference: ReferenceDomain
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
    reference: 'code',
    description: '`bun run check` (lint + typecheck + harden + test) must pass before any commit.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/pre-commit-check.ts' },
  },
  {
    id: 'code/no-as-any',
    reference: 'code',
    description: '`as any` is banned in feature/service code; types must be earned.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'typescript/no-explicit-any' },
  },
  {
    id: 'code/agents-duplicate-humans-extract',
    reference: 'code',
    description:
      'Agents do not invent abstractions. Humans extract after 3+ occurrences with shared change reason.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: '/review heuristic flags agent-invented abstractions' },
  },

  // ─── backend.md ───────────────────────────────────────────────
  {
    id: 'backend/route-typebox-required',
    reference: 'backend',
    description:
      'Every Elysia route with body/query/params must declare a TypeBox schema for each.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule require-route-schema (planned)',
    },
  },
  {
    id: 'backend/route-response-schema-required',
    reference: 'backend',
    description: 'Every route declares response schemas keyed by status code.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule require-route-response (planned)',
    },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    reference: 'backend',
    description: 'Feature code must not import vendor SDKs directly; go through packages/adapters.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule no-vendor-import-in-features (planned)',
    },
  },
  {
    id: 'backend/protected-by-default',
    reference: 'backend',
    description:
      'Every Elysia plugin in features/*/routes.ts composes either protectedRoute or publicRoute.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-route-wrapper (planned)' },
  },

  // ─── database.md ──────────────────────────────────────────────
  {
    id: 'database/no-sql-interpolation',
    reference: 'database',
    description: 'No SQL via string interpolation — use Drizzle query builder.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/migrations-versioned',
    reference: 'database',
    description: 'Schema changes go through drizzle-kit generate; manual SQL never edits live DB.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'documented in database.md' },
  },

  // ─── testing.md ───────────────────────────────────────────────
  {
    id: 'testing/colocated-tests',
    reference: 'testing',
    description: 'Tests live next to source: foo.ts → foo.test.ts in same folder.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tests-exist.ts' },
  },
  // testing/integration-uses-eden-treaty defined further below in
  // the additions section (single source of truth for this id).

  // ─── errors.md ────────────────────────────────────────────────
  {
    id: 'errors/no-throw-literal',
    reference: 'errors',
    description:
      'Throwing string literals is banned (`throw "fail"`); throw `new AppError("CODE")` instead.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-throw-literal' },
  },
  {
    id: 'errors/no-bare-catch',
    reference: 'errors',
    description:
      '`catch` blocks must either re-throw, call a typed handler, or check a specific error type.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'Oxlint no-bare-catch (planned)' },
  },

  // ─── security.md ──────────────────────────────────────────────
  {
    id: 'security/protect-config',
    reference: 'security',
    description: 'Block edits to locked config files unless explicitly authorized.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-config.ts' },
    blocked: ['tsconfig.json', '.oxlintrc.json', '.oxfmtrc.json', 'sgconfig.yml'],
  },
  {
    id: 'security/no-secrets-committed',
    reference: 'security',
    description: 'Block .env and *.key/*.pem files from being staged or committed.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.env', '*.key', '*.pem'],
  },
  {
    id: 'security/no-dangerous-shell',
    reference: 'security',
    description:
      'Block destructive shell commands (rm -rf, force-push, git reset --hard, etc.) at PreToolUse.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/block-dangerous.ts' },
  },
  {
    id: 'security/no-raw-env',
    reference: 'security',
    description:
      'Code outside packages/config/env.ts must not read process.env directly. Import `env` instead.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-hardcoded-secrets',
    reference: 'security',
    description: 'Block hardcoded production secrets matching common provider prefixes.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-eval',
    reference: 'security',
    description: 'eval() and new Function() are banned in shipped code.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-log-secrets',
    reference: 'security',
    description: 'console calls must not log password/secret/token/apiKey/auth_token variables.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── observability.md ────────────────────────────────────────
  {
    id: 'observability/no-console-log-in-prod',
    reference: 'observability',
    description: 'console.log in shipped code is a smell — use the structured logger.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/warn-console-log.ts' },
  },
  {
    id: 'observability/init-at-boot',
    reference: 'observability',
    description: 'apps/api/server/app.ts must call initObservability(env) before listen().',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-observability-init.ts' },
  },

  // ─── harness.md ──────────────────────────────────────────────
  {
    id: 'harness/security-harden-gate',
    reference: 'harness',
    description: 'Mechanical security validations gate every commit (env, secrets, eval, SQL).',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/harden-gate.ts' },
  },
  {
    id: 'harness/auto-load-references',
    reference: 'harness',
    description:
      'Editing a file in domain X advises the agent to read .gaia/reference/<X>.md first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/permissions-immutable',
    reference: 'harness',
    description:
      '.gaia/protocols/permissions.md and delegation.md cannot be modified by hook or skill.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.gaia/protocols/permissions.md', '.gaia/protocols/delegation.md'],
  },
  {
    id: 'code/knip-gate-production',
    reference: 'code',
    description:
      'Dead code / unused dependencies fail CI. Knip runs as a gate (not advisory) on every PR.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'dead-code' },
  },

  // ─── commands.md ─────────────────────────────────────────────
  {
    id: 'commands/use-bun-not-npm',
    reference: 'commands',
    description: 'Bun is the package manager and runtime; npm/pnpm/yarn invocations are wrong.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── code.md (additions) ─────────────────────────────────────
  {
    id: 'code/named-errors-no-bare-throw',
    reference: 'code',
    description:
      'Feature/service code must not `throw new Error(...)` — use AppError from @gaia/errors.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-no-throw-new-error-in-features' },
  },
  {
    id: 'code/one-schema-many-consumers',
    reference: 'code',
    description:
      'Shapes flow from one source (Drizzle schema → drizzle-typebox → Eden Treaty types). No manual `type Foo = {...}` paralleling a schema.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule detect-manual-shape-types-paralleling-schema',
    },
  },

  // ─── backend.md (additions) ──────────────────────────────────
  {
    id: 'backend/no-hono-imports',
    reference: 'backend',
    description: 'Hono is the legacy stack; new code must not import from `hono` or `@hono/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-elysia-in-adapters',
    reference: 'backend',
    description:
      'Adapters (packages/adapters/) are framework-independent — no imports from `elysia` or `@elysiajs/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    reference: 'backend',
    description:
      'Feature code must not import vendor SDKs directly — go through @gaia/adapters/<capability>.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-vendor-sdk-in-features' },
  },
  {
    id: 'backend/no-sibling-feature-imports',
    reference: 'backend',
    description:
      'Features in apps/api/features/<X>/ must not import from sibling feature folders. Cross-feature reuse is via @gaia/<package> promotion.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-sibling-feature-imports' },
  },

  // ─── frontend.md ─────────────────────────────────────────────
  {
    id: 'frontend/no-direct-fetch-in-routes',
    reference: 'frontend',
    description:
      'apps/web/src/routes/** must not call `fetch()` directly — use the typed Eden Treaty client from ~/lib/api.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-vendor-sdk-on-client',
    reference: 'frontend',
    description:
      'apps/web/** must not import vendor SDKs (Polar, Stripe, Resend, Anthropic). Vendor calls go server-side via Eden Treaty.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-hardcoded-colors',
    reference: 'frontend',
    description: 'apps/web/** must not embed hex/rgb colors — read from the design tokens.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/routes-call-pass-render-only',
    reference: 'frontend',
    description:
      'Route components do three things: call (service/resource/signal), pass (props), render (JSX). No business logic in routes.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL route-operations rule' },
  },

  // ─── database.md (additions) ─────────────────────────────────
  {
    id: 'database/no-raw-pg-bypass',
    reference: 'database',
    description:
      'Direct `postgres` driver imports are restricted to packages/db/. Everywhere else uses Drizzle via @gaia/db.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/typebox-derivation-mandatory',
    reference: 'database',
    description:
      'TypeBox schemas for tables must derive from Drizzle (drizzle-typebox createSelectSchema / createInsertSchema).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-drizzle-typebox' },
  },
  {
    id: 'database/audit-columns-required',
    reference: 'database',
    description:
      'Every Drizzle table (`pgTable(...)`) declares `createdAt`. Mutable tables also declare `updatedAt` (judgment-tier, /review).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'database-audit-columns-required' },
  },

  // ─── testing.md (additions) ──────────────────────────────────
  {
    id: 'testing/no-test-only',
    reference: 'testing',
    description:
      '`it.only` / `describe.only` / `test.only` must not be committed — they hide skipped tests.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'testing/integration-uses-eden-treaty',
    reference: 'testing',
    description:
      '*.integration.test.ts uses Eden Treaty (treaty(app)) against the live app instance.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-integration-treaty.ts' },
  },

  // ─── errors.md (additions) ───────────────────────────────────
  {
    id: 'errors/no-leak-secrets-in-messages',
    reference: 'errors',
    description:
      'Error messages must not interpolate password/secret/token/api_key into user-visible strings.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'errors/no-bare-catch',
    reference: 'errors',
    description:
      '`catch` blocks must rethrow, handle a specific error type, or call a typed handler.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-empty' },
  },

  // ─── security.md (additions) ─────────────────────────────────
  {
    id: 'security/cve-scan-ci',
    reference: 'security',
    description: 'osv-scanner runs on every PR; high/critical CVEs block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'deps' },
  },
  {
    id: 'security/secret-scan-ci',
    reference: 'security',
    description: 'gitleaks runs on every PR; committed secrets block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'secrets' },
  },
  {
    id: 'security/csrf-on-mutations',
    reference: 'security',
    description:
      'POST/PUT/PATCH/DELETE routes apply CSRF middleware (better-auth provides it on protectedRoute).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-csrf-on-mutation' },
  },
  {
    id: 'security/rate-limit-on-public',
    reference: 'security',
    description: 'Public routes apply rate-limit middleware (publicRoute composes it).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-rate-limit-on-public' },
  },

  // ─── observability.md (additions) ────────────────────────────
  {
    id: 'observability/no-pii-in-logs',
    reference: 'observability',
    description:
      'Logger calls must not log objects keyed `password|secret|token|email` — redact first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── tokens.md ───────────────────────────────────────────────
  {
    id: 'tokens/single-source',
    reference: 'tokens',
    description:
      'CSS variables are generated from packages/ui/tokens.ts. packages/ui/styles.css must equal what scripts/generate-tokens-css.ts emits.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tokens-sync.ts' },
  },

  // ─── ax.md ───────────────────────────────────────────────────
  {
    id: 'ax/skill-md-frontmatter',
    reference: 'ax',
    description: 'Every SKILL.md ships with YAML frontmatter declaring `name:` and `description:`.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },

  // ─── voice.md ────────────────────────────────────────────────
  {
    id: 'voice/no-marketing-vocabulary',
    reference: 'voice',
    description:
      'Avoid marketing buzzwords (revolutionize, seamless, leverage, unlock, cutting-edge) in content/ and root README.md.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-marketing-vocab.ts' },
  },

  // ─── workflow.md ─────────────────────────────────────────────
  {
    id: 'workflow/initiative-frontmatter-required',
    reference: 'workflow',
    description:
      'Initiative .md files in .gaia/initiatives/*/ declare parent, hypothesis, and measurement fields.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },
  {
    id: 'workflow/project-touches-required',
    reference: 'workflow',
    description: 'Project .md files declare `touches:` (files/modules) and `depends_on:` arrays.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },

  // ─── dx.md ───────────────────────────────────────────────────
  {
    id: 'dx/stdout-data-stderr-narration',
    reference: 'dx',
    description:
      'CLI scripts print data to stdout and narration to stderr — enables piping without corruption.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-cli-stdout.ts' },
  },

  // ─── references.md (the meta-reference) ──────────────────────
  {
    id: 'references/voice-consulted',
    reference: 'references',
    description:
      'References are imperative and consulted-during-action; tutorial-style narration belongs in dx.md or README.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'soft regex flagging hedge words in reference files' },
  },
  {
    id: 'references/principle-shape',
    reference: 'references',
    description:
      'Every numbered reference principle has the 5-part shape: title+description, 2-4 rules bullets, enforcement, anti-pattern, pattern.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-reference-shape.ts' },
  },
  {
    id: 'references/principle-has-rule',
    reference: 'references',
    description:
      'Every reference principle maps 1:1 to a rules.ts entry (even pending). Reference principles without a rule are aspirational.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'scripts/check-reference-rule-mapping.ts walks ref files' },
  },
  {
    id: 'references/feature-scope',
    reference: 'references',
    description:
      'Per-feature references live at .gaia/reference/features/<feature>.md and load only when editing that feature.',
    tier: 'architecture',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'references/adversarial-review',
    reference: 'references',
    description:
      'New reference files (or major rewrites) include a 6-specialist adversarial review per principle in the PR.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'codified in d-reference skill; reviewer checks PR body' },
  },
  {
    id: 'references/staleness',
    reference: 'references',
    description:
      'References declare a Last verified date; >180 days without re-verification is debt, surfaced by d-health.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'scripts/check-reference-staleness.ts' },
  },
  {
    id: 'references/voice-imperative',
    reference: 'references',
    description:
      'Reference principles use imperative present tense; avoid hedge words ("tend to", "usually", "you might want to").',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'soft regex; advisory only' },
  },

  // ─── product/onboarding.md ───────────────────────────────────
  {
    id: 'onboarding/ttv-budget',
    reference: 'onboarding',
    description:
      "Time-to-first-value ≤60 seconds (p50). Don't gate first value behind email verification.",
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-health analytics check (PostHog activation latency)' },
  },
  {
    id: 'onboarding/activation-defined-once',
    reference: 'onboarding',
    description:
      'Exactly one trackActivation() function in packages/adapters/analytics.ts; no ad-hoc track("activation"|"activated"|...) calls.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep: track(...) with activation literals' },
  },
  {
    id: 'onboarding/no-tour-modals',
    reference: 'onboarding',
    description:
      'No modal-tour libraries (shepherd.js, intro.js, react-joyride). Empty states are the onboarding surface.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'harden-check pattern: imports of tour libs' },
  },
  {
    id: 'onboarding/progressive-disclosure',
    reference: 'onboarding',
    description:
      'New users see ≤5 nav items; advanced features appear after activation. Settings reveal sections progressively.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review heuristic; nav items count' },
  },
  {
    id: 'onboarding/persist-anonymous',
    reference: 'onboarding',
    description:
      'Anonymous user work persists across signup boundary via localStorage / IndexedDB; signup form rehydrates state.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review check on signup routes' },
  },
  {
    id: 'onboarding/silent-first-failure',
    reference: 'onboarding',
    description:
      "Onboarding routes don't render Alert(error); failures absorbed silently and retried in background.",
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review on /signup, /onboarding/*' },
  },
  {
    id: 'onboarding/funnel-events',
    reference: 'onboarding',
    description:
      'Required events: visit, signup_start, signup_complete, activation. Each step tracked independently.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'script scans signup + onboarding routes for required track() calls',
    },
  },
  {
    id: 'onboarding/email-on-signup',
    reference: 'onboarding',
    description:
      'First transactional email sent within 5 minutes; better-auth sendOnSignUp:true; sendVerificationEmail wired.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on packages/auth/index.ts' },
  },

  // ─── product/retention.md ────────────────────────────────────
  {
    id: 'retention/dau-wau-floor',
    reference: 'retention',
    description: 'DAU/WAU ratio target ≥40%. Sub-40% sustained four weeks signals weak retention.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-health audit reads PostHog' },
  },
  {
    id: 'retention/notification-quality',
    reference: 'retention',
    description:
      'Notifications carry user-requested value; ≤3/week email, ≤1/day push. Each has granular unsubscribe.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review template scan + opens-rate floor' },
  },
  {
    id: 'retention/state-machine',
    reference: 'retention',
    description:
      'Users have engagement_state enum (active|dormant|churned); recomputed nightly; messaging gated on state.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'schema check + ast-grep on email-send call sites' },
  },
  {
    id: 'retention/click-to-cancel',
    reference: 'retention',
    description:
      'Cancel button visible from /billing in ≤2 clicks. Polar customer portal handles the actual cancel.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review checks /billing surfaces cancel link' },
  },
  {
    id: 'retention/haircut-offered',
    reference: 'retention',
    description: 'Cancel flow surfaces tier-down + pause options BEFORE confirming cancellation.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'd-review checks cancel-flow component' },
  },
  {
    id: 'retention/cohort-dashboards',
    reference: 'retention',
    description:
      'Cohort retention dashboards exist for week-1, week-4, week-12 in PostHog (or equivalent).',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'script verifies dashboards exist' },
  },
  {
    id: 'retention/dunning-configured',
    reference: 'retention',
    description:
      'Failed payments trigger dunning (≥3 retries over 14 days); subscription.past_due gives 7-day grace before cancel.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'script checks billing webhook handler' },
  },
  {
    id: 'retention/usage-tiers',
    reference: 'retention',
    description:
      'users.usage_tier enum (light|middle|power); tier_promoted analytics event fires on transitions.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'schema check + analytics event check' },
  },

  // ─── deployment.md (gaps from previous PR) ───────────────────
  {
    id: 'deployment/promote-digest',
    reference: 'deployment',
    description: 'Image deploys reference content-addressable digests, not floating tags.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'CI workflow inspection script' },
  },
  {
    id: 'deployment/preview-env-per-pr',
    reference: 'deployment',
    description: 'Every PR opens a preview deployment + preview database (Neon branch).',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'CI workflow check' },
  },
  {
    id: 'deployment/three-health-checks',
    reference: 'deployment',
    description:
      'Three endpoints: /health (liveness), /health/ready (readiness), post-deploy synthetic test.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on app.ts for both routes' },
  },
  {
    id: 'deployment/rollback-mttr',
    reference: 'deployment',
    description: '≤5 minute rollback MTTR; previous image digest reachable; runbook exists.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'platform-level (Railway promote)' },
  },
  {
    id: 'deployment/ttfd-30min',
    reference: 'deployment',
    description: 'New operator reaches green /health/ready in ≤30 minutes from clone.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'quarterly audit + scripts/first-deploy.ts' },
  },

  // ─── methodology.md (constitutional loop principles) ─────────
  {
    id: 'methodology/constitutional-loop',
    reference: 'methodology',
    description:
      'Every concern has up to three forms (Reference, Rule, Skill). A concern in only one substrate is debt.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/rules-coverage.ts' },
  },
  {
    id: 'methodology/principle-rule-mapping',
    reference: 'methodology',
    description:
      'Every reference principle maps 1:1 to rules.ts entries. Pending → enforced cycle SLO 14 days.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'scripts/check-reference-rule-mapping.ts' },
  },
  {
    id: 'methodology/hooks-deterministic',
    reference: 'methodology',
    description:
      'Hooks execute <100ms, no LLM calls, fail-closed. Judgment goes in CLAUDE.mds, not hooks.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'code review; no LLM-call detection in hooks' },
  },
  // ─── ai.md (gaps from previous PR) ───────────────────────────
  {
    id: 'ai/prompts-as-constants',
    reference: 'ai',
    description:
      'System prompts are TypeScript constants in apps/api/server/<feature>/prompts.ts; no inline strings.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep: complete({ system: stringLiteral })' },
  },
  {
    id: 'ai/bounded-calls',
    reference: 'ai',
    description:
      'Every complete() call provides maxTokens; output structure pinned via JSON mode or tool-use.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep + adapter signature requires maxTokens' },
  },
  {
    id: 'ai/model-pinned',
    reference: 'ai',
    description:
      'Model identity is a named constant (MODELS.<feature>); no string literals scattered.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on complete() callers' },
  },
  {
    id: 'ai/cache-hit-target',
    reference: 'ai',
    description: 'Per-feature cache-hit rate target ≥30%; alerts when sustained below.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'OTel + Axiom dashboard alert' },
  },
  {
    id: 'ai/stream-cancel',
    reference: 'ai',
    description: 'Streaming routes propagate AbortSignal upstream and set X-Accel-Buffering: no.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on streaming routes' },
  },
  {
    id: 'observability/ai-trace-tags',
    reference: 'observability',
    description:
      'Every AI call emits a trace span with tags: model, tokens (in/out/cache), latency, cost, tool_use_count, error_class.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'adapter wraps every call; review' },
  },
  {
    id: 'ai/tool-loop-bounded',
    reference: 'ai',
    description:
      'Tool-use loops bounded (max depth 10, max same-tool retries 3). Audit log on every tool call.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'code review; planned ast-grep on tool-dispatch sites' },
  },

  // ─── skills.md (gaps from previous PR) ───────────────────────
  {
    id: 'skills/output-mode-required',
    reference: 'skills',
    description:
      'Every SKILL.md ends with an Output section naming its mode (fix, report, or question).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'check-skills.ts extension to verify Output section' },
  },
  {
    id: 'skills/cold-start-safe',
    reference: 'skills',
    description:
      'Skills run from a cold start; no "as I mentioned" assumptions; references-by-path for shared content.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'scripts/check-skill-cold-start.ts' },
  },
  {
    id: 'skills/numbered-phases',
    reference: 'skills',
    description: 'Skills with non-trivial work use ## Phase N: headers (sequential by default).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'scripts/check-skill-phases.ts' },
  },
  {
    id: 'skills/sandwich-gates',
    reference: 'skills',
    description:
      'Skills mutating files have an identical pre-condition (Phase 0) and final-gate phase running the same check.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'code review' },
  },
  {
    id: 'skills/typed-output',
    reference: 'skills',
    description:
      'Skill output: one mode per line (fix, report, or question). Reports include numeric confidence.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'output-section linter' },
  },
  {
    id: 'skills/sibling-layout',
    reference: 'skills',
    description:
      'Sibling files typed by location: <skill>/scripts/* for code, <skill>/templates/* for inputs, <skill>/rules-*.md for sub-instructions.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'check-skills.ts extension' },
  },
] as const

export type RuleId = (typeof rules)[number]['id']

export function findRule(id: string): Rule | undefined {
  return rules.find((r) => r.id === id)
}

export function rulesForReference(ref: ReferenceDomain): readonly Rule[] {
  return rules.filter((r) => r.reference === ref)
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
 * Reference domains the harness has at least one enforced mechanism for.
 * Used by /review and audit reporting to show the enforcement coverage
 * of the constitution.
 */
export function enforcedReferences(): readonly ReferenceDomain[] {
  const set = new Set<ReferenceDomain>()
  for (const r of rules) {
    if (r.mechanism.kind !== 'pending') set.add(r.reference)
  }
  return [...set]
}
