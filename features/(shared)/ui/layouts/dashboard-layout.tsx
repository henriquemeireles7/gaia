import type { ComponentChildren } from 'preact'
import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { Badge } from '../components/badge'
import { Dropdown, DropdownItem, DropdownSeparator } from '../components/dropdown'

type DashboardLayoutProps = {
  children: ComponentChildren
  user: AppUser
  org?: AppOrg | null
  orgRole?: OrgMemberRole | null
  orgs?: Array<{ id: string; name: string; slug: string }>
  currentPath?: string
}

type NavItem = {
  href: string
  label: string
  icon: string
}

const mainNav: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
]

const orgNav: NavItem[] = [
  {
    href: '/dashboard/org/settings',
    label: 'Organization',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    href: '/dashboard/org/members',
    label: 'Members',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    href: '/dashboard/org/invitations',
    label: 'Invitations',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
]

export function DashboardLayout({
  children,
  user,
  org,
  orgRole,
  orgs = [],
  currentPath = '/dashboard',
}: DashboardLayoutProps) {
  const isAdmin = user.role === 'admin'

  return (
    <div class="min-h-screen bg-cream">
      {/* Mobile header */}
      <header class="lg:hidden border-b border-linen bg-surface-white sticky top-0 z-40">
        <div class="flex items-center justify-between h-14 px-4">
          <a href="/dashboard" class="font-display font-bold text-ink no-underline">
            Douala
          </a>
          <details id="mobile-sidebar" class="relative">
            <summary class="list-none cursor-pointer [&::-webkit-details-marker]:hidden p-2 -mr-2 text-ink">
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </summary>
            <div class="fixed inset-0 top-14 z-50 flex">
              <div class="w-72 bg-surface-white border-r border-linen h-full overflow-y-auto p-4">
                <SidebarContent
                  user={user}
                  org={org}
                  orgRole={orgRole}
                  orgs={orgs}
                  currentPath={currentPath}
                  isAdmin={isAdmin}
                />
              </div>
              <div class="flex-1 bg-ink/20" />
            </div>
          </details>
        </div>
      </header>

      <div class="flex">
        {/* Desktop sidebar */}
        <aside class="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-surface-white border-r border-linen">
          <div class="flex-1 overflow-y-auto p-4">
            <a
              href="/dashboard"
              class="block text-xl font-display font-bold text-ink no-underline mb-6"
            >
              Douala
            </a>
            <SidebarContent
              user={user}
              org={org}
              orgRole={orgRole}
              orgs={orgs}
              currentPath={currentPath}
              isAdmin={isAdmin}
            />
          </div>
        </aside>

        {/* Main content */}
        <main class="flex-1 lg:ml-64 min-h-screen">
          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  user,
  org,
  orgRole,
  orgs,
  currentPath,
  isAdmin,
}: {
  user: AppUser
  org?: AppOrg | null
  orgRole?: OrgMemberRole | null
  orgs: Array<{ id: string; name: string; slug: string }>
  currentPath: string
  isAdmin: boolean
}) {
  return (
    <>
      {/* Org switcher */}
      {orgs.length > 0 && (
        <div class="mb-6">
          <Dropdown
            id="org-switcher"
            trigger={
              <div class="flex items-center justify-between w-full px-3 py-2 bg-sand rounded-sm text-sm hover:bg-linen transition-colors">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded bg-gold/20 flex items-center justify-center text-xs font-bold text-gold shrink-0">
                    {(org?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <span class="truncate font-medium text-ink">{org?.name || 'Select org'}</span>
                </div>
                <svg
                  aria-hidden="true"
                  class="w-4 h-4 text-muted shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            }
          >
            {orgs.map((o) => (
              <DropdownItem
                key={o.id}
                href={`/dashboard?org=${o.slug}`}
                class={o.slug === org?.slug ? 'bg-sand' : ''}
              >
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                  {o.name}
                </div>
              </DropdownItem>
            ))}
            <DropdownSeparator />
            <DropdownItem href="/dashboard/org/new">+ Create organization</DropdownItem>
          </Dropdown>
        </div>
      )}

      {/* Main navigation */}
      <nav class="space-y-1">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} active={currentPath === item.href} />
        ))}
      </nav>

      {/* Org navigation */}
      {org && (
        <div class="mt-6">
          <p class="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Organization
          </p>
          <nav class="space-y-1">
            {orgNav.map((item) => (
              <NavLink key={item.href} item={item} active={currentPath === item.href} />
            ))}
          </nav>
        </div>
      )}

      {/* Admin navigation */}
      {isAdmin && (
        <div class="mt-6">
          <p class="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">Admin</p>
          <nav class="space-y-1">
            <NavLink
              item={{
                href: '/admin',
                label: 'Admin Panel',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
              }}
              active={currentPath.startsWith('/admin')}
            />
          </nav>
        </div>
      )}

      {/* User section */}
      <div class="mt-auto pt-6 border-t border-linen">
        <Dropdown
          id="user-menu"
          trigger={
            <div class="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-sand transition-colors cursor-pointer">
              <div class="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-sm font-bold text-gold">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{user.name || 'User'}</p>
                <p class="text-xs text-muted truncate">{user.email}</p>
              </div>
            </div>
          }
        >
          <DropdownItem href="/dashboard/settings">Settings</DropdownItem>
          {orgRole && (
            <DropdownItem href="/dashboard/org/settings">
              Org settings
              <Badge class="ml-2">{orgRole}</Badge>
            </DropdownItem>
          )}
          <DropdownSeparator />
          <DropdownItem href="/api/auth/sign-out" danger>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <a
      href={item.href}
      class={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm no-underline transition-colors ${active ? 'bg-sand text-ink font-medium' : 'text-body hover:bg-sand hover:text-ink'}`}
    >
      <svg
        aria-hidden="true"
        class="w-5 h-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
      </svg>
      {item.label}
    </a>
  )
}
