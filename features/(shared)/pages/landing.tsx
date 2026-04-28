import { LinkButton } from '../ui/components/button'
import { Card } from '../ui/components/card'
import { PublicLayout } from '../ui/layouts/public-layout'

// CUSTOMIZE: Update features, pricing tiers, and copy to match your product

type PricingTier = {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  cta: string
  recommended?: boolean
}

const features = [
  {
    title: 'Authentication',
    description:
      'Email/password + OAuth with better-auth. Sessions, email verification, password reset — all wired.',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    title: 'Payments',
    description:
      'Stripe checkout, customer portal, webhook handling, subscription lifecycle, and grace periods.',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    title: 'Multi-Tenancy',
    description:
      'Organizations, team invitations, role-based access. Scoped data isolation at the DB layer.',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    title: 'Admin Panel',
    description:
      'User management, subscription stats, role editing. Protected by role-based middleware.',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    title: 'Email System',
    description:
      'Transactional emails via Resend. Auth emails, payment receipts, and templates ready to customize.',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: 'Security Hardened',
    description:
      'CSRF protection, rate limiting, secure headers, API key auth, input validation on every route.',
    icon: 'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
]

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: 'Everything you need to get started',
    features: [
      'Up to 5 team members',
      'All core features',
      'Email support',
      'Community access',
      '5 GB storage',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 490,
    description: 'For growing teams that need more',
    features: [
      'Unlimited team members',
      'All core features',
      'Priority support',
      'Advanced analytics',
      '50 GB storage',
      'API access',
      'Custom integrations',
    ],
    cta: 'Start free trial',
    recommended: true,
  },
]

export function LandingPage({ appUrl }: { appUrl: string }) {
  return (
    <PublicLayout currentPath="/">
      <HeroSection />
      <FeaturesSection />
      <PricingSection appUrl={appUrl} />
      <CtaSection />
    </PublicLayout>
  )
}

function HeroSection() {
  return (
    <section class="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
      <div class="max-w-content mx-auto">
        <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight">
          Ship your SaaS
          <br />
          <span class="text-gold">in days, not months</span>
        </h1>
        <p class="mt-6 text-lg sm:text-xl text-body max-w-reading mx-auto">
          The maximal template with auth, payments, teams, admin, and security built in. Clone it,
          describe your product to AI, and let it remove what you don't need.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <LinkButton href="/signup" size="lg">
            Get started free
          </LinkButton>
          <LinkButton href="/#features" variant="secondary" size="lg">
            See what's included
          </LinkButton>
        </div>
        <p class="mt-4 text-sm text-muted">No credit card required. Free tier available.</p>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" class="px-4 sm:px-6 py-16 sm:py-24 bg-surface-white">
      <div class="max-w-outer mx-auto">
        <div class="text-center mb-12">
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-ink">Everything included</h2>
          <p class="mt-4 text-lg text-body max-w-reading mx-auto">
            Stop gluing together boilerplate. Every feature a SaaS needs is already built, tested,
            and wired.
          </p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} class="hover:border-gold/30 transition-colors">
              <div class="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center mb-4">
                <svg
                  aria-hidden="true"
                  class="w-5 h-5 text-gold"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 class="font-display text-lg font-semibold text-ink mb-2">{feature.title}</h3>
              <p class="text-sm text-body">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ appUrl }: { appUrl: string }) {
  return (
    <section id="pricing" class="px-4 sm:px-6 py-16 sm:py-24">
      <div class="max-w-outer mx-auto">
        <div class="text-center mb-12">
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-ink">
            Simple, transparent pricing
          </h2>
          <p class="mt-4 text-lg text-body">
            Choose monthly flexibility or save with annual billing.
          </p>

          {/* Billing toggle — uses CSS :checked + sibling selector, no JS */}
          <div class="mt-8 inline-flex items-center gap-3 bg-sand rounded-full p-1">
            <input
              type="radio"
              name="billing"
              id="billing-monthly"
              class="peer/monthly sr-only"
              checked
            />
            <label
              for="billing-monthly"
              class="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors text-body peer-checked/monthly:bg-surface-white peer-checked/monthly:text-ink peer-checked/monthly:shadow-sm"
            >
              Monthly
            </label>
            <input type="radio" name="billing" id="billing-yearly" class="peer/yearly sr-only" />
            <label
              for="billing-yearly"
              class="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors text-body peer-checked/yearly:bg-surface-white peer-checked/yearly:text-ink peer-checked/yearly:shadow-sm"
            >
              Yearly <span class="text-success text-xs font-semibold">Save ~17%</span>
            </label>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} appUrl={appUrl} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ tier, appUrl }: { tier: PricingTier; appUrl: string }) {
  return (
    <Card
      class={`flex flex-col ${tier.recommended ? 'border-gold ring-1 ring-gold/20' : ''}`}
      padding="lg"
    >
      {tier.recommended && (
        <div class="text-xs font-semibold text-gold uppercase tracking-wider mb-2">Recommended</div>
      )}
      <h3 class="font-display text-xl font-bold text-ink">{tier.name}</h3>
      <p class="text-sm text-body mt-1">{tier.description}</p>

      <div class="mt-6 mb-6">
        {/* Show monthly price by default. The billing toggle above controls which is visible via CSS. */}
        <div class="pricing-monthly">
          <span class="text-4xl font-display font-bold text-ink">${tier.monthlyPrice}</span>
          <span class="text-body text-sm">/month</span>
        </div>
        <div class="pricing-yearly hidden">
          <span class="text-4xl font-display font-bold text-ink">
            ${Math.round(tier.yearlyPrice / 12)}
          </span>
          <span class="text-body text-sm">/month</span>
          <p class="text-xs text-muted mt-1">${tier.yearlyPrice}/year</p>
        </div>
      </div>

      <ul class="space-y-3 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} class="flex items-start gap-2 text-sm text-body">
            <svg
              aria-hidden="true"
              class="w-4 h-4 text-success mt-0.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <LinkButton
        href={`${appUrl}/api/checkout/redirect?plan=monthly`}
        variant={tier.recommended ? 'primary' : 'secondary'}
        fullWidth
        size="lg"
      >
        {tier.cta}
      </LinkButton>
    </Card>
  )
}

function CtaSection() {
  return (
    <section class="px-4 sm:px-6 py-16 sm:py-24 bg-surface-white">
      <div class="max-w-content mx-auto text-center">
        <h2 class="font-display text-3xl sm:text-4xl font-bold text-ink">Ready to ship?</h2>
        <p class="mt-4 text-lg text-body max-w-reading mx-auto">
          Join teams that shipped their SaaS in days instead of months. Everything is included — you
          just describe what makes your product unique.
        </p>
        <div class="mt-8">
          <LinkButton href="/signup" size="lg">
            Get started free
          </LinkButton>
        </div>
      </div>
    </section>
  )
}
