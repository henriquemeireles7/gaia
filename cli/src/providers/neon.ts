// cli/src/providers/neon.ts — Neon DATABASE_URL verification.
//
// Neon uses Postgres connection strings, not API tokens. Verifying = parsing
// the URL shape. A full live-connection check happens at first migrate.

import { failure, isEmptyToken } from './_shared.ts'
import type { ProviderSetupInfo, Verifier } from './types.ts'

const PLACEHOLDERS = ['YOUR_DATABASE_URL']

export const setupInfo: ProviderSetupInfo = {
  signupUrl: 'https://neon.tech/signup',
  tokenPath: 'https://console.neon.tech → Project → Connection String',
  description: 'Neon — serverless Postgres',
}

export const verify: Verifier = async ({ token }) => {
  if (isEmptyToken(token, PLACEHOLDERS))
    return failure('neon', 'E2010_NEON_EMPTY', 'DATABASE_URL is empty.')
  if (!/^postgres(?:ql)?:\/\//.test(token))
    return failure(
      'neon',
      'E2011_NEON_SHAPE',
      'DATABASE_URL must start with postgres:// or postgresql://.',
    )
  let url: URL
  try {
    url = new URL(token)
  } catch (cause) {
    return failure(
      'neon',
      'E2012_NEON_PARSE',
      `DATABASE_URL is malformed: ${(cause as Error).message}`,
    )
  }
  const warnings: string[] = []
  if (!url.hostname.includes('neon.tech')) {
    warnings.push(
      `DATABASE_URL host "${url.hostname}" is not a Neon endpoint — ok for non-Neon Postgres.`,
    )
  }
  if (!url.searchParams.get('sslmode')) {
    warnings.push('DATABASE_URL has no sslmode — recommended: sslmode=require for production.')
  }
  return Promise.resolve({
    ok: true,
    provider: 'neon',
    account_id: url.pathname.replace(/^\//, '') || undefined,
    scopes: ['postgres:read', 'postgres:write'],
    warnings,
    ttfd_blocking: false,
  })
}
