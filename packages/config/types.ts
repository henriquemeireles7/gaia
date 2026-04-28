// Core domain types. Framework-agnostic — no Hono, no Elysia, no Solid.

export type AppUser = {
  id: string
  email: string
  name: string | null
  role: 'free' | 'pro' | 'admin'
}

export type AppOrg = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
}

export type OrgMemberRole = 'owner' | 'admin' | 'member'

export type AppSession = {
  id: string
  userId: string
}
