// scripts/_secret-patterns.ts — single source of truth for "what counts as a leaked secret".
//
// Used by:
//   - scripts/check-state-json-no-secrets.ts (CI gate scanning state.json files)
//   - scripts/e2e-fresh-clone.ts (E2E assertion #3 — AD-AP-18)
//
// Patterns are case-SENSITIVE: real secret prefixes are lowercase; env-var
// names (RAILWAY_TOKEN, POLAR_ACCESS_TOKEN) are uppercase. Case-sensitive
// matching avoids false positives on legitimate env-var names.

export const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  {
    name: 'Anthropic / Stripe / OpenAI',
    pattern: /\bsk-(?:ant|live|test|proj)-[A-Za-z0-9_-]{20,}/,
  },
  { name: 'Polar OAT/SAT/AT', pattern: /\bpolar_(?:oat|sat|at)_[A-Za-z0-9]{16,}/ },
  { name: 'Resend API key', pattern: /\bre_[A-Za-z0-9]{16,}/ },
  { name: 'Railway token', pattern: /\brailway_[A-Za-z0-9]{8,}/ },
  { name: 'Webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{16,}/ },
  { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]
