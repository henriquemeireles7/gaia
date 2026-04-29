// .claude/skills/a-health/checks/check-dau-wau.ts — retention/dau-wau-floor.
//
// DAU/WAU ≥40%. Queries PostHog. No-op without API key.

const KEY = process.env.POSTHOG_API_KEY ?? ''
const PROJECT = process.env.POSTHOG_PROJECT_ID ?? ''
const HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'
const FLOOR = Number(process.env.DAU_WAU_FLOOR ?? 0.4)

if (!KEY || !PROJECT) {
  console.log('dau-wau — skipped (POSTHOG_API_KEY/POSTHOG_PROJECT_ID unset)')
  process.exit(0)
}

const query = {
  query: {
    kind: 'HogQLQuery',
    query: `
      WITH
        dau AS (SELECT count(DISTINCT distinct_id) c FROM events
                WHERE timestamp >= now() - INTERVAL 1 DAY),
        wau AS (SELECT count(DISTINCT distinct_id) c FROM events
                WHERE timestamp >= now() - INTERVAL 7 DAY)
      SELECT (SELECT c FROM dau) / (SELECT c FROM wau) AS ratio
    `,
  },
}

const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(query),
})

if (!res.ok) {
  console.error(`dau-wau — PostHog query failed: ${res.status}`)
  process.exit(1)
}

const body = (await res.json()) as { results?: number[][] }
const ratio = body.results?.[0]?.[0]
if (typeof ratio !== 'number') {
  console.log('dau-wau — no data returned')
  process.exit(0)
}

const ok = ratio >= FLOOR
console.log(
  `dau-wau — ratio=${(ratio * 100).toFixed(1)}% floor=${(FLOOR * 100).toFixed(0)}% ${ok ? 'OK' : 'BELOW'}`,
)
process.exit(ok ? 0 : 1)
