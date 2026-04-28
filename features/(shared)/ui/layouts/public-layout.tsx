import type { ComponentChildren } from 'preact'
import { LinkButton } from '../components/button'

type PublicLayoutProps = {
  children: ComponentChildren
  currentPath?: string
}

const navLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export function PublicLayout({ children, currentPath = '/' }: PublicLayoutProps) {
  return (
    <div class="min-h-screen flex flex-col bg-cream">
      <PublicNav currentPath={currentPath} />
      <main class="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}

function PublicNav({ currentPath }: { currentPath: string }) {
  return (
    <header class="border-b border-linen bg-surface-white/80 backdrop-blur-sm sticky top-0 z-40">
      <nav class="max-w-outer mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" class="text-xl font-display font-bold text-ink no-underline">
          Douala
        </a>

        {/* Desktop nav */}
        <div class="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              class={`text-sm no-underline transition-colors ${currentPath === link.href ? 'text-ink font-medium' : 'text-body hover:text-ink'}`}
            >
              {link.label}
            </a>
          ))}
          <div class="flex items-center gap-3 ml-4">
            <LinkButton href="/login" variant="ghost" size="sm">
              Log in
            </LinkButton>
            <LinkButton href="/signup" variant="primary" size="sm">
              Get started
            </LinkButton>
          </div>
        </div>

        {/* Mobile hamburger */}
        <details id="mobile-nav" class="sm:hidden relative">
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
          <div class="fixed inset-0 top-16 bg-surface-white z-50 p-6 flex flex-col gap-4 border-t border-linen">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                class="text-lg text-ink no-underline py-2 border-b border-linen/50"
              >
                {link.label}
              </a>
            ))}
            <div class="flex flex-col gap-3 mt-4">
              <LinkButton href="/login" variant="secondary" fullWidth>
                Log in
              </LinkButton>
              <LinkButton href="/signup" variant="primary" fullWidth>
                Get started
              </LinkButton>
            </div>
          </div>
        </details>
      </nav>
    </header>
  )
}

function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <footer class="border-t border-linen bg-surface-white">
      <div class="max-w-outer mx-auto px-4 sm:px-6 py-12">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div class="col-span-2 sm:col-span-1">
            <span class="text-lg font-display font-bold text-ink">Douala</span>
            <p class="text-sm text-body mt-2">
              The maximal SaaS template. Ship everything, let AI subtract.
            </p>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-ink mb-3">Product</h4>
            <ul class="space-y-2">
              <li>
                <a href="/#features" class="text-sm text-body hover:text-ink no-underline">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" class="text-sm text-body hover:text-ink no-underline">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/blog" class="text-sm text-body hover:text-ink no-underline">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-ink mb-3">Developers</h4>
            <ul class="space-y-2">
              <li>
                <a href="/docs" class="text-sm text-body hover:text-ink no-underline">
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="/docs/getting-started"
                  class="text-sm text-body hover:text-ink no-underline"
                >
                  Getting Started
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-ink mb-3">Legal</h4>
            <ul class="space-y-2">
              <li>
                <a href="/privacy" class="text-sm text-body hover:text-ink no-underline">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" class="text-sm text-body hover:text-ink no-underline">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-linen text-sm text-muted">
          &copy; {year} Douala. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
