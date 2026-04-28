# pages

## Purpose
Preact SSR page components and route handlers. Each page is server-rendered via `renderPage()`.
Authenticated pages check session and redirect to /login if unauthenticated.

## Critical Rules
- NEVER use client-side React hooks — pages are SSR only
- NEVER access env directly — receive values as props from route handlers
- ALWAYS redirect unauthenticated users to /login for dashboard pages
- ALWAYS use `renderPage()` from `platform/server/render` for HTML output
- ALWAYS pass SEO metadata (title, description) to renderPage

## Imports (use from other modules)
```ts
import { renderPage } from '@/platform/server/render'
import { env } from '@/platform/env'
import { auth } from '@/platform/auth/config'
import { db } from '@/platform/db/client'
import type { AppUser, AppOrg, OrgMemberRole } from '@/platform/types'
import { Button, Card, Badge } from '@/features/(shared)/ui/components'
import { PublicLayout } from '@/features/(shared)/ui/layouts/public-layout'
import { DashboardLayout } from '@/features/(shared)/ui/layouts/dashboard-layout'
```

## Recipe: New Page
```tsx
// 1. Create the page component
export function MyPage({ user }: { user: AppUser }) {
  return (
    <DashboardLayout user={user} currentPath="/dashboard/my-page">
      <h1>My Page</h1>
    </DashboardLayout>
  )
}

// 2. Add route in page-routes.tsx
pageRoutes.get('/my-page', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')
  const { MyPage } = await import('./my-page')
  return c.html(renderPage(<MyPage user={session.user} />, { title: 'My Page — Douala' }))
})
```

## Verify
```sh
bunx tsc --noEmit
```

---
## Files
| File | Exports |
|------|---------|
| page-routes.tsx | pageRoutes |
| landing.tsx | LandingPage |
| auth/shared.tsx | AuthLayout, AuthValidationScript, FormError, PasswordInput, GoogleOAuthButton |
| auth/login.tsx | LoginPage |
| auth/signup.tsx | SignupPage |
| auth/forgot-password.tsx | ForgotPasswordPage, ForgotPasswordSentPage |
| auth/reset-password.tsx | ResetPasswordPage |
| dashboard/index.tsx | DashboardPage |
| dashboard/settings.tsx | SettingsPage |
| dashboard/org/settings.tsx | OrgSettingsPage |
| dashboard/org/members.tsx | MembersPage |
| dashboard/org/invitations.tsx | InvitationsPage |

## Internal Dependencies
- platform/server/render
- platform/env
- platform/auth/config
- platform/db/client
- platform/db/schema
- platform/types
- features/(shared)/ui

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| landing.tsx | LandingPage |
| page-routes.tsx | pageRoutes |

## Internal Dependencies
- platform/auth
- platform/db
- platform/env
- platform/server
- platform/types

<!-- Generated: 2026-04-19T04:04:55.797Z -->
