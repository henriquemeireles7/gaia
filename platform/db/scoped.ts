import { and, eq, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

/**
 * Create an org-scoped WHERE clause for tables with an orgId column.
 * Use this to enforce tenant isolation at the query level.
 *
 * @example
 * const rows = await db
 *   .select()
 *   .from(subscriptions)
 *   .where(withOrg(subscriptions.orgId, orgId))
 */
export function withOrg(orgIdColumn: PgColumn, orgId: string): SQL {
  return eq(orgIdColumn, orgId)
}

/**
 * Combine org scoping with additional conditions.
 *
 * @example
 * const rows = await db
 *   .select()
 *   .from(subscriptions)
 *   .where(withOrgAnd(subscriptions.orgId, orgId, eq(subscriptions.status, 'active')))
 */
export function withOrgAnd(orgIdColumn: PgColumn, orgId: string, ...conditions: SQL[]): SQL {
  return and(eq(orgIdColumn, orgId), ...conditions)!
}
