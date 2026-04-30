// cli/src/errors/catalog.ts — the CLI error catalog (AD-AP-12 + AD-AP-16).
//
// Per the standalone-publishable rule (cli/CLAUDE.md), the CLI maintains its
// own catalog rather than reaching into @gaia/errors. Code namespaces are
// disjoint (cli uses E1xxx-E4xxx; apps/api uses string-named codes from
// packages/errors/index.ts).
//
// Every error a verb can surface MUST have a catalog entry. The completeness
// test (cli/test/errors.catalog.test.ts) walks the codebase looking for
// `E\d{4}_[A-Z_]+` literals and confirms each has a row here.

export type ErrorEntry = {
  code: string
  /** What happened (one sentence). */
  cause: string
  /** Concrete fix (one sentence + optional command). */
  fix: string
  /** Where to read more. */
  docsUrl: string
  /** Next command to run after applying the fix. */
  nextCommand: string
}

const REPO = 'https://github.com/henriquemeireles7/gaia'

export const CATALOG: ReadonlyArray<ErrorEntry> = [
  // ───── E0xxx — dispatcher
  {
    code: 'E0001_VERB_NOT_IMPLEMENTED',
    cause: 'The verb is registered but its implementation has not landed yet.',
    fix: 'Track progress on the linked issue or wait for the next release.',
    docsUrl: `${REPO}/issues`,
    nextCommand: 'bun gaia --help',
  },
  {
    code: 'E0002_UNKNOWN_VERB',
    cause: 'Verb name does not match any registered command.',
    fix: 'Run `bun gaia --help` to see the verb list.',
    docsUrl: `${REPO}#quick-start`,
    nextCommand: 'bun gaia --help',
  },
  {
    code: 'E0003_SMOKE_NO_URL',
    cause: '`bun gaia smoke` requires a `--url=<base-url>` flag.',
    fix: 'Pass --url with the live deploy URL, e.g. --url=https://your-app.up.railway.app.',
    docsUrl: `${REPO}/blob/master/docs/cli.md#bun-gaia-smoke---url--url`,
    nextCommand: 'bun gaia smoke --url=https://your-app.up.railway.app',
  },
  {
    code: 'E0099_INTERNAL',
    cause: 'Internal CLI error — an exception escaped the dispatcher.',
    fix: 'File an issue with the stack trace and the command you ran.',
    docsUrl: `${REPO}/issues/new`,
    nextCommand: 'bun gaia --version  # then file an issue',
  },

  // ───── E1xxx — preflight (cli/src/preflight.ts)
  {
    code: 'E1001',
    cause: 'Bun runtime is missing or below the required version (≥1.2).',
    fix: 'Install or upgrade Bun: `curl -fsSL https://bun.sh/install | bash`',
    docsUrl: 'https://bun.sh/docs/installation',
    nextCommand: 'bun create gaia@latest <project-slug>',
  },
  {
    code: 'E1002',
    cause: 'Gaia v1 supports macOS and Linux only — Windows is not supported.',
    fix: 'Use WSL2 (Windows Subsystem for Linux). Native Windows support is tracked for v1.1.',
    docsUrl: 'https://learn.microsoft.com/windows/wsl/install',
    nextCommand: 'wsl --install && bun create gaia@latest <project-slug>',
  },
  {
    code: 'E1003',
    cause: 'The target directory already exists and --force was not passed.',
    fix: 'Pick a different name OR pass --force to overwrite (refuses to overwrite without --yes).',
    docsUrl: `${REPO}#faq`,
    nextCommand: 'bun create gaia@latest <different-slug>',
  },
  {
    code: 'E1004',
    cause: 'Cannot write to the parent directory.',
    fix: 'Run from a directory you own (e.g. ~/code/), not /tmp or a system path.',
    docsUrl: `${REPO}#faq`,
    nextCommand: 'cd ~/code && bun create gaia@latest <project-slug>',
  },
  {
    code: 'E1005_INVALID_SLUG',
    cause:
      'Project slug must be lowercase letters / digits / dashes (3-40 chars), starting with a letter.',
    fix: 'Pick a slug like `weekend-saas` or `myapp-2`. Avoid spaces, uppercase, leading dashes/digits.',
    docsUrl: `${REPO}#quick-start`,
    nextCommand: 'bun create gaia@latest <valid-slug>',
  },
  {
    code: 'E1099_INTERNAL_CREATE',
    cause: 'Internal scaffolder error — an exception escaped `bun create gaia@latest`.',
    fix: 'Capture the stderr output and file an issue. Try a different target directory if the error mentions filesystem.',
    docsUrl: `${REPO}/issues/new`,
    nextCommand: 'bun create gaia@latest <new-slug>',
  },

  // ───── E2xxx — verify-keys (cli/src/providers/*)
  {
    code: 'E2001_POLAR_EMPTY',
    cause: 'POLAR_ACCESS_TOKEN is empty in .env.local.',
    fix: 'Create a token at https://polar.sh/dashboard → Settings → Access Tokens, paste into .env.local.',
    docsUrl: 'https://docs.polar.sh/api-reference/access-tokens',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2002_POLAR_INVALID',
    cause: 'Polar rejected the token (HTTP 401/403).',
    fix: 'Token may be revoked or for a different organization. Generate a new one.',
    docsUrl: 'https://docs.polar.sh/api-reference/access-tokens',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2003_POLAR_HTTP',
    cause: 'Polar API returned an unexpected HTTP status (5xx, 429, etc).',
    fix: 'Polar may be having an outage or rate-limiting you. Retry in 60s; if persistent, check Polar status page.',
    docsUrl: 'https://status.polar.sh',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2004_POLAR_NETWORK',
    cause: 'Could not reach api.polar.sh (DNS / network / TLS failure).',
    fix: 'Check connectivity. If on a corporate VPN, allowlist api.polar.sh.',
    docsUrl: `${REPO}#faq`,
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2005_RESEND_EMPTY',
    cause: 'RESEND_API_KEY is empty in .env.local.',
    fix: 'Create a key at https://resend.com/api-keys, paste into .env.local.',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2006_RESEND_SHAPE',
    cause: 'RESEND_API_KEY does not start with the expected `re_` prefix.',
    fix: 'Resend API keys begin with `re_`. Re-copy from https://resend.com/api-keys.',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2007_RESEND_INVALID',
    cause: 'Resend rejected the API key (HTTP 401/403).',
    fix: 'Key may be revoked. Generate a new one at https://resend.com/api-keys.',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2008_RESEND_HTTP',
    cause: 'Resend API returned an unexpected HTTP status.',
    fix: 'Retry; if persistent, check https://status.resend.com.',
    docsUrl: 'https://status.resend.com',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2009_RESEND_NETWORK',
    cause: 'Could not reach api.resend.com (DNS / network / TLS failure).',
    fix: 'Check connectivity. If on a corporate VPN, allowlist api.resend.com.',
    docsUrl: `${REPO}#faq`,
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2010_NEON_EMPTY',
    cause: 'DATABASE_URL is empty in .env.local.',
    fix: 'Copy the connection string from https://console.neon.tech, paste into .env.local.',
    docsUrl: 'https://neon.tech/docs/connect/connect-from-any-app',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2011_NEON_SHAPE',
    cause: 'DATABASE_URL is not a postgres:// or postgresql:// URL.',
    fix: 'Re-copy the Neon connection string — it must start with postgres:// or postgresql://.',
    docsUrl: 'https://neon.tech/docs/connect/connect-from-any-app',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2012_NEON_PARSE',
    cause: 'DATABASE_URL is malformed (cannot be parsed as a URL).',
    fix: 'Re-copy the connection string from https://console.neon.tech — preserve special characters in the password.',
    docsUrl: 'https://neon.tech/docs/connect/connect-from-any-app',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2013_RAILWAY_EMPTY',
    cause: 'RAILWAY_TOKEN is empty in .env.local.',
    fix: 'Run `railway login`, then copy the token from `railway whoami --json` into .env.local.',
    docsUrl: 'https://docs.railway.com/reference/cli-api',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2014_RAILWAY_INVALID',
    cause: 'Railway rejected the token (HTTP 401/403).',
    fix: 'Token may be revoked. Run `railway login` to refresh.',
    docsUrl: 'https://docs.railway.com/reference/cli-api',
    nextCommand: 'railway login && bun gaia verify-keys',
  },
  {
    code: 'E2015_RAILWAY_HTTP',
    cause: 'Railway GraphQL API returned an unexpected HTTP status.',
    fix: 'Retry; if persistent, check https://status.railway.app.',
    docsUrl: 'https://status.railway.app',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2016_RAILWAY_GRAPHQL',
    cause: 'Railway GraphQL returned errors in the response body.',
    fix: 'Inspect the error JSON. If it mentions auth, run `railway login`. If quota, check the Railway dashboard.',
    docsUrl: 'https://docs.railway.com/reference/cli-api',
    nextCommand: 'bun gaia verify-keys',
  },
  {
    code: 'E2017_RAILWAY_NETWORK',
    cause: 'Could not reach backboard.railway.app (DNS / network / TLS failure).',
    fix: 'Check connectivity. If on a corporate VPN, allowlist *.railway.app.',
    docsUrl: `${REPO}#faq`,
    nextCommand: 'bun gaia verify-keys',
  },

  // ───── E3xxx — deploy (cli/src/deploy/classifier.ts)
  {
    code: 'E3001_DEPLOY_TYPECHECK',
    cause: 'TypeScript typecheck failed during deploy build.',
    fix: 'Run `bun run check:types` locally, fix the reported errors, recommit.',
    docsUrl: `${REPO}#what-if-the-deploy-breaks`,
    nextCommand: 'bun run check:types && bun gaia deploy',
  },
  {
    code: 'E3002_DEPLOY_ENV',
    cause: 'Boot panic on Railway — a required env var is missing or malformed.',
    fix: 'Set the missing var via `railway variables set <NAME>=<value>`, redeploy.',
    docsUrl: 'https://docs.railway.com/reference/variables',
    nextCommand: 'bun gaia deploy',
  },
  {
    code: 'E3003_DEPLOY_MIGRATION',
    cause: 'Drizzle migration error during deploy boot.',
    fix: 'Roll back via Neon branch parent, fix schema in packages/db/schema.ts, retry.',
    docsUrl: 'https://orm.drizzle.team/docs/migrations',
    nextCommand: 'bun run db:generate && bun gaia deploy',
  },
  {
    code: 'E3004_DEPLOY_LOCKFILE',
    cause: 'bun.lock is out of sync with package.json (frozen-lockfile install failed).',
    fix: 'Run `bun install`, commit the updated bun.lock, redeploy.',
    docsUrl: 'https://bun.sh/docs/install/lockfile',
    nextCommand:
      'bun install && git add bun.lock && git commit -m "chore: refresh lockfile" && bun gaia deploy',
  },
  {
    code: 'E3005_DEPLOY_NEON_RACE',
    cause: 'Cold Neon database connection race during migrate.',
    fix: 'Sleep 5s and retry; the connection retry loop in apps/api/scripts/migrate.ts handles transient races.',
    docsUrl: 'https://neon.tech/docs/connect/connection-pooling',
    nextCommand: 'bun gaia deploy',
  },
  {
    code: 'E3006_DEPLOY_POLAR_WEBHOOK',
    cause: 'Polar webhook signature mismatch — POLAR_WEBHOOK_SECRET is wrong or rotated.',
    fix: 'Re-copy the webhook secret from Polar dashboard → Webhooks. Update Railway env var, redeploy.',
    docsUrl: 'https://docs.polar.sh/webhooks',
    nextCommand: 'railway variables set POLAR_WEBHOOK_SECRET=... && bun gaia deploy',
  },
  {
    code: 'E3007_DEPLOY_RESEND_DOMAIN',
    cause: 'Resend domain DNS has not propagated yet (soft warning, not blocking per F-10).',
    fix: 'Wait for DNS to propagate (≤4hr). The deploy continued; emails may not send until verified.',
    docsUrl: 'https://resend.com/docs/dashboard/domains/introduction',
    nextCommand: 'bun gaia smoke --url=<your-deploy-url>',
  },
  {
    code: 'E3098_DEPLOY_RUNNER_PENDING',
    cause:
      'Railway runner is not wired in this build — the standalone-publishable @gaia/cli ships in a future PR.',
    fix: 'Run `railway up` directly until the runner integration ships.',
    docsUrl: `${REPO}#what-if-the-deploy-breaks`,
    nextCommand: 'railway up',
  },
  {
    code: 'E3099_DEPLOY_UNKNOWN',
    cause: 'Deploy failed with a class d-fail does not yet recognize.',
    fix: 'Check the last 20 lines of Railway logs at the dashboard URL emitted in the error. The full log is at .gaia/last-deploy-failure.log.',
    docsUrl: `${REPO}/issues`,
    nextCommand: 'bun gaia status  # see the captured failure artifact',
  },

  // ───── E4xxx — smoke (cli/src/smoke/assertions.ts)
  {
    code: 'E4001_SMOKE_AUTH_NO_COOKIE',
    cause: '/auth/sign-up/email returned no Set-Cookie — auth is not wired.',
    fix: 'Verify packages/auth/index.ts is mounted in apps/api/server/app.ts.',
    docsUrl: 'https://www.better-auth.com/docs/installation',
    nextCommand: 'bun gaia smoke',
  },
  {
    code: 'E4002_SMOKE_AUTH_COOKIE_FLAGS',
    cause: 'Session cookie is missing HttpOnly / Secure / SameSite flags.',
    fix: 'Set Better Auth cookie options: { secure: true, httpOnly: true, sameSite: "lax" }.',
    docsUrl: 'https://www.better-auth.com/docs/concepts/cookies',
    nextCommand: 'bun gaia smoke',
  },
  {
    code: 'E4003_SMOKE_AUTH_NETWORK',
    cause: 'Could not reach the auth endpoint at all — DNS, network, or wrong --url.',
    fix: 'Verify the URL is correct: `curl -I <your-url>/health`.',
    docsUrl: `${REPO}/blob/master/docs/cli.md`,
    nextCommand: 'bun gaia smoke --url=<correct-url>',
  },
  {
    code: 'E4004_SMOKE_POLAR_WEBHOOK_AUTH',
    cause:
      '/webhooks/polar rejected the smoke request — signature verification is enforced (good!).',
    fix: 'No fix needed if returning 401/403 — that confirms verifyWebhook is working.',
    docsUrl: 'https://docs.polar.sh/webhooks',
    nextCommand: 'bun gaia smoke',
  },
  {
    code: 'E4005_SMOKE_POLAR_WEBHOOK_HTTP',
    cause: '/webhooks/polar returned a non-2xx status that is NOT 401/403.',
    fix: 'Check Railway logs for the webhook handler. The route may have crashed before verifying the signature.',
    docsUrl: `${REPO}/blob/master/packages/adapters/payments.ts`,
    nextCommand: 'bun gaia smoke --verbose',
  },
  {
    code: 'E4006_SMOKE_POLAR_WEBHOOK_NETWORK',
    cause: 'Could not reach /webhooks/polar at the deploy URL.',
    fix: 'Confirm the URL is reachable and the webhook route is mounted.',
    docsUrl: `${REPO}/blob/master/apps/api/CLAUDE.md`,
    nextCommand: 'bun gaia smoke --url=<correct-url>',
  },
  {
    code: 'E4007_SMOKE_DASHBOARD_HTTP',
    cause: 'GET / returned non-2xx — app is reachable but the route returned an error.',
    fix: 'Check Railway logs and apps/web/src/routes/index.tsx for runtime errors.',
    docsUrl: `${REPO}/blob/master/apps/web/CLAUDE.md`,
    nextCommand: 'bun gaia smoke --verbose',
  },
  {
    code: 'E4008_SMOKE_DASHBOARD_NETWORK',
    cause: 'Could not reach the dashboard root at the deploy URL.',
    fix: 'Confirm the URL is reachable: `curl -I <your-url>/`.',
    docsUrl: `${REPO}/blob/master/docs/cli.md`,
    nextCommand: 'bun gaia smoke --url=<correct-url>',
  },
  {
    code: 'E4009_SMOKE_HEALTH',
    cause: '/health or /health/ready did not return 200 — app may not have booted cleanly.',
    fix: 'Confirm apps/api/server/app.ts mounts both /health and /health/ready routes.',
    docsUrl: `${REPO}/blob/master/apps/api/CLAUDE.md`,
    nextCommand: 'bun gaia smoke',
  },
  {
    code: 'E4010_SMOKE_HEALTH_NETWORK',
    cause: 'Could not reach /health endpoints at the deploy URL.',
    fix: 'Confirm the deploy URL is correct and the API service is up.',
    docsUrl: `${REPO}/blob/master/docs/cli.md`,
    nextCommand: 'bun gaia smoke --url=<correct-url>',
  },
]

export function findEntry(code: string): ErrorEntry | undefined {
  // Allow exact match OR prefix match (E1001 finds E1001_*).
  const exact = CATALOG.find((e) => e.code === code)
  if (exact) return exact
  return CATALOG.find((e) => e.code.startsWith(`${code}_`) || e.code.split('_')[0] === code)
}

export function listCodes(): readonly string[] {
  return CATALOG.map((e) => e.code)
}
