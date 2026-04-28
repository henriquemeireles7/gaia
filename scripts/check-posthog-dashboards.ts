// scripts/check-posthog-dashboards.ts — retention/cohort-dashboards.
//
// Cohort retention dashboards (week-1, week-4, week-12) must exist in
// PostHog. Without POSTHOG_API_KEY this script is a no-op (local dev) so
// it never blocks `bun run check`. CI provides the key.

const REQUIRED = ['week-1', 'week-4', 'week-12'] as const
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? ''
const API_KEY = process.env.POSTHOG_API_KEY ?? ''
const HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'

if (!API_KEY || !PROJECT_ID) {
  // Local / unconfigured environments skip the network call.
  console.log('posthog-dashboards — skipped (POSTHOG_API_KEY or POSTHOG_PROJECT_ID unset)')
  process.exit(0)
}

type Dashboard = { id: number; name: string }
type ListResponse = { results?: Dashboard[] }

const url = `${HOST}/api/projects/${PROJECT_ID}/dashboards/?limit=200`
const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } })
if (!res.ok) {
  console.error(`posthog-dashboards — API call failed (${res.status} ${res.statusText})`)
  process.exit(1)
}

const body = (await res.json()) as ListResponse
const names = (body.results ?? []).map((d) => d.name.toLowerCase())

const missing = REQUIRED.filter((slug) => !names.some((n) => n.includes(slug)))

if (missing.length > 0) {
  console.error('posthog-dashboards — missing cohort dashboards:')
  for (const m of missing) console.error(`  - ${m}`)
  console.error('\nCreate dashboards in PostHog with names containing the slug.')
  process.exit(1)
}

process.exit(0)
