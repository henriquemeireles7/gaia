// cli/src/telemetry.ts — anonymized first-run events (F-9 + AD-AP-8).
//
// Privacy invariants:
//   1. Allowlist-based: every field outside TELEMETRY_ALLOWLIST is stripped.
//   2. machine_id_hash = sha256(hostname + uid + 'gaia-cli-v1'). The raw values
//      never leave the local process.
//   3. Three-tier opt-out: GAIA_TELEMETRY=off env, --no-telemetry flag,
//      ~/.gaia/config.json { telemetry: false }.
//   4. No paths, no project slugs, no env values, no IPs (PostHog
//      `disable_geoip: true` and we never set $ip).
//
// The PR 3 implementation buffers events in-memory and prints them when
// --verbose. The PostHog client wires up in PR 11 with the production write key.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { hostname, userInfo } from 'node:os'
import { join } from 'node:path'

// IMPORTANT: keep this list in sync with `.gaia/protocols/cli.ts:TELEMETRY_ALLOWLIST`.
// Both must be byte-equal — drift gate is `scripts/check-typebox-derivation.ts`
// (TODO: extend that script to assert array equality between the two locations).
const TELEMETRY_ALLOWLIST = [
  'verb',
  'cli_version',
  'duration_ms',
  'exit_code',
  'error_class',
  'error_code',
  'attempt',
  'os',
  'bun_version',
  'machine_id_hash',
] as const

type AllowedField = (typeof TELEMETRY_ALLOWLIST)[number]

export type TelemetryEventName =
  | 'cli.create.start'
  | 'cli.verb.start'
  | 'cli.verb.complete'
  | 'cli.verb.error'
  | 'cli.first_run'
  | 'cli.ttfd'

export type TelemetryEvent = {
  event: TelemetryEventName
  properties: Partial<Record<AllowedField, unknown>>
  ts: string
}

export type TelemetryConfig = {
  /** Honors GAIA_TELEMETRY=off env var. */
  envOverride: string | undefined
  /** Honors --no-telemetry flag. */
  flagOverride: boolean
  /** Honors persistent ~/.gaia/config.json { telemetry: false }. */
  configPath: string
}

const FALLBACK_CONFIG: TelemetryConfig = {
  envOverride: process.env.GAIA_TELEMETRY,
  flagOverride: false,
  configPath: join(userInfo().homedir ?? '/tmp', '.gaia', 'config.json'),
}

export function isEnabled(config: Partial<TelemetryConfig> = {}): boolean {
  const c = { ...FALLBACK_CONFIG, ...config }
  if (c.envOverride === 'off' || c.envOverride === '0' || c.envOverride === 'false') return false
  if (c.flagOverride) return false
  if (existsSync(c.configPath)) {
    try {
      const raw = readFileSync(c.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as { telemetry?: boolean }
      if (parsed.telemetry === false) return false
    } catch {
      /* malformed config — default to enabled, no crash */
    }
  }
  return true
}

/**
 * Compute the anonymized machine ID. Stable per machine + user, but irreversible.
 * Salt prevents cross-app correlation if other tools use the same approach.
 */
export function machineIdHash(): string {
  const ui = userInfo()
  const raw = `${hostname()}|${ui.uid ?? ui.username ?? 'unknown'}|gaia-cli-v1`
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

/**
 * Strip anything not in the allowlist. Pure — does not mutate input.
 */
export function sanitize(
  properties: Record<string, unknown>,
): Partial<Record<AllowedField, unknown>> {
  const out: Partial<Record<AllowedField, unknown>> = {}
  for (const key of TELEMETRY_ALLOWLIST) {
    if (key in properties) out[key] = properties[key]
  }
  return out
}

export type TelemetryClient = {
  enabled: boolean
  buffer: TelemetryEvent[]
  capture: (event: TelemetryEventName, properties?: Record<string, unknown>) => void
  flush: () => Promise<void>
}

export function createClient(config: Partial<TelemetryConfig> = {}): TelemetryClient {
  const enabled = isEnabled(config)
  const buffer: TelemetryEvent[] = []

  return {
    enabled,
    buffer,
    capture(event, properties = {}) {
      if (!enabled) return
      buffer.push({
        event,
        properties: sanitize({ ...properties, machine_id_hash: machineIdHash() }),
        ts: new Date().toISOString(),
      })
    },
    async flush() {
      // PR 3 implementation: no-op (buffered locally only).
      // PR 11 wires posthog-node with the production write key.
      buffer.length = 0
      return Promise.resolve()
    },
  }
}
