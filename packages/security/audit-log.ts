// packages/security/audit-log.ts — append-only audit trail for mutations.
//
// Vision §Backend-9: "every mutation logs: who, what, when, state diff."
// Vision §Architecture-13: "every agent action produces a structured log
// entry."
//
// v1: writes to packages/db/schema.ts:webhook_events provider='audit'.
// v2: dedicated audit_log table with proper indexes once volume warrants.
//
// Usage:
//   await auditLog({
//     userId: user.id,
//     action: 'user.password.changed',
//     subject: user.id,
//     before: { ... },
//     after: { ... },
//   })

import { db } from '@gaia/db'
import { webhookEvents } from '@gaia/db/schema'

export type AuditEntry = {
  /** Who performed the action — user id or 'system'. */
  userId: string | 'system'
  /** Dotted action name: feature.entity.verb (e.g. user.password.changed). */
  action: string
  /** What the action acted on — typically an entity id. */
  subject: string
  /** Optional before/after snapshot for state diffs. */
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  await db.insert(webhookEvents).values({
    provider: 'audit' as const,
    externalEventId: `audit-${Date.now()}-${crypto.randomUUID()}`,
    eventType: entry.action,
  })
  // v2: actually persist before/after diff in a dedicated table.
}
