// cli/src/deploy/classifier.ts — d-fail failure-class taxonomy (AD-AP-5).
//
// Reads Railway log output, classifies into one of 7 known classes (or
// surfaced-cleanly for everything else). Each class maps to a recovery hint
// the deploy verb passes to the d-fail skill subprocess.

export type FailureClass =
  | 'typecheck'
  | 'env-var'
  | 'migration'
  | 'lockfile-drift'
  | 'drizzle-race'
  | 'polar-webhook-sig'
  | 'resend-domain-pending'
  | 'surfaced-cleanly'

export type ClassifiedFailure = {
  class: FailureClass
  /** Human-readable summary for the narrator. */
  summary: string
  /** Recovery hint passed to d-fail subprocess. */
  hint: string
  /**
   * Per F-10: when true, the failure is recorded as a warning but the deploy
   * verb continues (e.g. resend-domain-pending counts as TTFD success).
   */
  ttfd_blocking: boolean
  /** Stripe-shaped error code consumable by `bun gaia explain` (PR 7). */
  errorCode: string
}

type ClassifierRule = {
  class: FailureClass
  pattern: RegExp
  summary: string
  hint: string
  ttfd_blocking: boolean
  errorCode: string
}

const RULES: readonly ClassifierRule[] = [
  {
    class: 'typecheck',
    // Anchored to tsc's actual output format (`error TS####:` or `TS####:` after
    // a path:line:col). Plain `TS\d{4}` was matching benign tokens (RT-8).
    pattern: /\berror TS\d{4}:|\bTS\d{4}:|tsgo.*error|typecheck failed/i,
    summary: 'TypeScript typecheck error in build',
    hint: 'd-fail/typecheck: re-run `bun run check:types`, surface the diff, fix in source, recommit',
    ttfd_blocking: true,
    errorCode: 'E3001_DEPLOY_TYPECHECK',
  },
  {
    class: 'env-var',
    // Anchored to severity markers (#38 / RT-25). Plain `missing.{0,20}env` was
    // matching benign warnings like 'missing dev env (using fallback)'. We now
    // require the leading `Invalid environment variables` (the canonical
    // packages/config/env.ts panic), explicit "Missing required env(ironment) variable",
    // or `process.env.X is undefined` shapes.
    pattern:
      /Invalid environment variables|Missing required environment variable|Missing required env var|process\.env\.[A-Z_]+ is undefined/i,
    summary: 'Boot panic — missing or malformed env var',
    hint: 'd-fail/env-var: identify missing key, prompt user to set via `railway variables set`',
    ttfd_blocking: true,
    errorCode: 'E3002_DEPLOY_ENV',
  },
  {
    class: 'migration',
    pattern: /drizzle.{0,80}error|migration failed|relation.{0,40}does not exist/i,
    summary: 'Drizzle migration error in deploy log',
    hint: 'd-fail/migration: roll back via Neon branch parent, fix schema, retry',
    ttfd_blocking: true,
    errorCode: 'E3003_DEPLOY_MIGRATION',
  },
  {
    class: 'lockfile-drift',
    pattern: /lockfile.*out.of.date|frozen-lockfile|Bun lockfile.*outdated/i,
    summary: 'bun.lock out of sync with package.json',
    hint: 'd-fail/lockfile-drift: run `bun install`, commit lockfile, redeploy',
    ttfd_blocking: true,
    errorCode: 'E3004_DEPLOY_LOCKFILE',
  },
  {
    class: 'drizzle-race',
    pattern: /could not connect.{0,40}(neon|cold start)|ECONNREFUSED.*5432.*first/i,
    summary: 'Cold Neon DB connection race during migrate',
    hint: 'd-fail/drizzle-race: sleep 5s, retry once; if persists 3× escalate',
    ttfd_blocking: true,
    errorCode: 'E3005_DEPLOY_NEON_RACE',
  },
  {
    class: 'polar-webhook-sig',
    pattern: /polar.{0,40}webhook.{0,40}(signature|secret)|invalid webhook signature/i,
    summary: 'Polar webhook signature mismatch',
    hint: 'd-fail/polar-webhook: rotate POLAR_WEBHOOK_SECRET, redeploy',
    ttfd_blocking: true,
    errorCode: 'E3006_DEPLOY_POLAR_WEBHOOK',
  },
  // F-10: domain-pending is a warning, not a fail.
  {
    class: 'resend-domain-pending',
    pattern: /resend.{0,40}domain.{0,30}(pending|not verified)/i,
    summary: 'Resend domain DNS not propagated yet',
    hint: 'd-fail/resend-domain: emit warning, proceed (counts as TTFD success per F-10)',
    ttfd_blocking: false,
    errorCode: 'E3007_DEPLOY_RESEND_DOMAIN',
  },
]

/**
 * Classify a Railway log excerpt. Returns the first matching rule, or a
 * "surfaced-cleanly" default for unmapped classes (Eng review HIGH-9 +
 * AD-AP-5 — every failure produces an actionable message, never a raw stack).
 */
export function classify(logExcerpt: string): ClassifiedFailure {
  for (const rule of RULES) {
    if (rule.pattern.test(logExcerpt)) {
      return {
        class: rule.class,
        summary: rule.summary,
        hint: rule.hint,
        ttfd_blocking: rule.ttfd_blocking,
        errorCode: rule.errorCode,
      }
    }
  }
  return {
    class: 'surfaced-cleanly',
    summary: 'Unmapped failure class — log excerpt did not match any known signal',
    hint: 'd-fail/surfaced-cleanly: print last 20 log lines + Railway dashboard link, exit 75',
    ttfd_blocking: true,
    errorCode: 'E3099_DEPLOY_UNKNOWN',
  }
}
