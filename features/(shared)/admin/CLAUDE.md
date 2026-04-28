# admin

## Purpose
Admin panel: dashboard stats, user management (list/detail/role/delete).
Protected by `requirePermission('admin')` — only admin-role users can access.

## Critical Rules
- NEVER allow admin to delete or demote themselves
- NEVER expose password hashes or sensitive auth tokens in responses
- ALWAYS paginate user lists (default 25 per page, max 100)
- ALWAYS use `requirePermission('admin')` on all routes
- ALWAYS validate role changes against allowed values

## Imports (use from other modules)
```ts
import { requireAuth } from '@/platform/auth/middleware'
import { requirePermission } from '@/platform/auth/permissions'
import { throwError } from '@/platform/errors'
import { success, paginated } from '@/platform/server/responses'
import type { AppEnv } from '@/platform/types'
import { db } from '@/platform/db/client'
import { users, subscriptions, memberships } from '@/platform/db/schema'
```

## Recipe: New admin endpoint
```ts
adminRoutes.get('/resource', async (c) => {
  // Auth + admin check already applied via app.use('*', ...)
  const data = await queryData()
  return success(c, data)
})
```

## Verify
```sh
bun test features/\(shared\)/admin/
```

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| queries.ts | getAdminStats, listUsers, getUserDetail, updateUserRole, adminDeleteUser |
| routes.ts | adminRoutes |

## Internal Dependencies
- platform/auth
- platform/db
- platform/errors
- platform/server
- platform/types

<!-- Generated: 2026-04-19T04:04:55.795Z -->
