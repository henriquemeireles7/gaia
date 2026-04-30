// .gaia/rules/folders/packages/security.ts — rules owned by `packages/security`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'packages/security' (the shard's path identifier).
//
// Many security rules also live under skill: 'a-security' (audit
// surface). These are the runtime-primitive rules whose home is the
// package itself, distinct from the audit skill.

import type { Rule } from '../../types'

export const skill = 'packages/security' as const

export const packagesSecurityRules = [
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
] as const satisfies readonly Rule[]
