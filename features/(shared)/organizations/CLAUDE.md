# organizations

## Purpose
Multi-tenancy: organization CRUD, membership management, and invitation system.
Enables team-based access where users belong to one or more organizations.

## Critical Rules
- NEVER allow org data access without membership verification
- NEVER expose organization IDs in user-facing URLs — use slugs
- ALWAYS normalize emails: `.toLowerCase().trim()` before comparison
- ALWAYS validate slugs against `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- NEVER allow removing/demoting the organization owner
- ALWAYS set invitation expiry (7 days default)

## Imports (use from other modules)
```ts
import { requireAuth } from '@/platform/auth/middleware'
import { requireOrg, requireOrgRole } from '@/platform/auth/org-middleware'
import { throwError } from '@/platform/errors'
import { success, created } from '@/platform/server/responses'
import type { AppEnv } from '@/platform/types'
import { db } from '@/platform/db/client'
import { organizations, memberships, invitations } from '@/platform/db/schema'
```

## Recipe: New org-scoped endpoint
```ts
orgRoutes.get('/resource', requireAuth, requireOrg, async (c) => {
  const org = c.get('org')
  const data = await db.query.myTable.findMany({
    where: eq(myTable.orgId, org.id),
  })
  return success(c, data)
})
```

## Verify
```sh
bun test features/\(shared\)/organizations/
```

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| queries.ts | createOrganization, getOrganizationBySlug, updateOrganization, deleteOrganization, getUserOrganizations, getOrgMembers, getMembership, removeMember, updateMemberRole, createInvitation, getInvitationByToken, getPendingInvitations, acceptInvitation, deleteInvitation |
| routes.ts | orgRoutes |

## Internal Dependencies
- platform/auth
- platform/db
- platform/errors
- platform/server
- platform/types

<!-- Generated: 2026-04-19T04:04:55.796Z -->
