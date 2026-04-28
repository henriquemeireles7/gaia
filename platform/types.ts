// CUSTOMIZE: Extend with your user shape
export type AppUser = {
  id: string
  email: string
  name: string | null
  role: 'free' | 'pro' | 'admin' // CUSTOMIZE: your roles
}

export type AppOrg = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
}

export type OrgMemberRole = 'owner' | 'admin' | 'member'

export type AppEnv = {
  Variables: {
    user: AppUser
    session: { id: string; userId: string }
    requestId: string
    org: AppOrg
    orgRole: OrgMemberRole
  }
}
