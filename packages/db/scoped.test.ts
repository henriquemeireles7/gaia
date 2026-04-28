import { describe, expect, it } from 'bun:test'
import type { SQL } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { withOrg, withOrgAnd } from './scoped'

// Test table for verifying SQL generation
const testTable = pgTable('test', {
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id').notNull(),
  name: text('name'),
})

/**
 * Recursively extract all param values from a Drizzle SQL object.
 * Handles nested queryChunks from and()/or() combinators.
 */
function extractParamValues(sql: SQL): unknown[] {
  const values: unknown[] = []
  for (const chunk of sql.getSQL().queryChunks) {
    if (typeof chunk === 'object' && chunk !== null) {
      if ('value' in chunk && !Array.isArray(chunk.value)) {
        values.push(chunk.value)
      }
      if ('queryChunks' in chunk) {
        values.push(...extractParamValues(chunk as SQL))
      }
    }
  }
  return values
}

describe('withOrg', () => {
  it('produces SQL containing the given org ID', () => {
    const result = withOrg(testTable.orgId, 'org-123')
    const params = extractParamValues(result)
    expect(params).toContain('org-123')
  })

  it('produces different SQL for different org IDs', () => {
    const params1 = extractParamValues(withOrg(testTable.orgId, 'org-aaa'))
    const params2 = extractParamValues(withOrg(testTable.orgId, 'org-bbb'))

    expect(params1).toContain('org-aaa')
    expect(params1).not.toContain('org-bbb')
    expect(params2).toContain('org-bbb')
    expect(params2).not.toContain('org-aaa')
  })
})

describe('withOrgAnd', () => {
  it('combines org filter with additional conditions', () => {
    const result = withOrgAnd(testTable.orgId, 'org-456', eq(testTable.name, 'test'))
    const params = extractParamValues(result)
    expect(params).toContain('org-456')
    expect(params).toContain('test')
  })

  it('includes the org ID alongside extra condition values', () => {
    const result = withOrgAnd(testTable.orgId, 'org-789', eq(testTable.name, 'foo'))
    const params = extractParamValues(result)
    expect(params).toContain('org-789')
    expect(params).toContain('foo')
    expect(params).toHaveLength(2)
  })
})
