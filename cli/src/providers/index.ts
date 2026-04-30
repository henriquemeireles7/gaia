// cli/src/providers/index.ts — verifier registry + .env.local parser.

import { existsSync, readFileSync } from 'node:fs'

import * as neon from './neon.ts'
import * as polar from './polar.ts'
import * as railway from './railway.ts'
import * as resend from './resend.ts'

import type { Fetcher, ProviderSetupInfo, VerifyResult } from './types.ts'

export type ProviderName = 'polar' | 'resend' | 'neon' | 'railway'

export const PROVIDERS: ReadonlyArray<{
  name: ProviderName
  envVar: string
  verify: (input: { token: string; fetcher?: Fetcher }) => Promise<VerifyResult>
  setupInfo: ProviderSetupInfo
}> = [
  { name: 'polar', envVar: 'POLAR_ACCESS_TOKEN', verify: polar.verify, setupInfo: polar.setupInfo },
  { name: 'resend', envVar: 'RESEND_API_KEY', verify: resend.verify, setupInfo: resend.setupInfo },
  { name: 'neon', envVar: 'DATABASE_URL', verify: neon.verify, setupInfo: neon.setupInfo },
  {
    name: 'railway',
    envVar: 'RAILWAY_TOKEN',
    verify: railway.verify,
    setupInfo: railway.setupInfo,
  },
]

export type EnvFile = Record<string, string>

/**
 * Minimal .env.local parser. Handles KEY=value, optional quoted values, comments.
 * Pragmatic — does NOT handle multi-line values, escape sequences, or interpolation.
 */
export function parseEnvFile(content: string): EnvFile {
  const result: EnvFile = {}
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) result[key] = value
  }
  return result
}

export function loadEnvFile(path: string): EnvFile {
  if (!existsSync(path)) return {}
  return parseEnvFile(readFileSync(path, 'utf-8'))
}

export type { Fetcher, ProviderSetupInfo, VerifyResult } from './types.ts'
