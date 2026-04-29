// .claude/skills/a-health/checks/check-ttv-budget.ts — onboarding/ttv-budget.
//
// Time-to-first-value ≤60s p50 from signup_complete to activation.
// Queries PostHog; no-op when POSTHOG_API_KEY is unset.

const KEY = process.env.POSTHOG_API_KEY ?? ''
const PROJECT = process.env.POSTHOG_PROJECT_ID ?? ''
const HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'
const BUDGET_S = Number(process.env.TTV_BUDGET_S ?? 60)

if (!KEY || !PROJECT) {
  console.log('ttv-budget — skipped (POSTHOG_API_KEY/POSTHOG_PROJECT_ID unset)')
  process.exit(0)
}

const query = {
  query: {
    kind: 'HogQLQuery',
    query: `
      SELECT quantile(0.5)(
        dateDiff('second', signup.timestamp, activation.timestamp)
      ) AS p50_seconds
      FROM events activation
      JOIN events signup
        ON signup.distinct_id = activation.distinct_id
        AND signup.event = 'signup_complete'
      WHERE activation.event = 'activation'
        AND activation.timestamp >= now() - INTERVAL 7 DAY
    `,
  },
}

const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(query),
})

if (!res.ok) {
  console.error(`ttv-budget — PostHog query failed: ${res.status}`)
  process.exit(1)
}

const body = (await res.json()) as { results?: number[][] }
const p50 = body.results?.[0]?.[0]
if (typeof p50 !== 'number') {
  console.log('ttv-budget — no data returned (likely no signup_complete + activation pairs in 7d)')
  process.exit(0)
}

const ok = p50 <= BUDGET_S
console.log(`ttv-budget — p50=${p50.toFixed(1)}s budget=${BUDGET_S}s ${ok ? 'OK' : 'OVER'}`)
process.exit(ok ? 0 : 1)
