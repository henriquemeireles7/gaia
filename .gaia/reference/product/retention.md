# Retention — Keeping users beyond activation

> Status: Reference
> Last verified: April 2026
> Scope: Mechanics that keep activated users using the product week-over-week + month-over-month
> Paired with: `references.md` (shape), `onboarding.md` (what comes before retention), `observability.md` (cohort tracking), `backend.md` (subscription / dunning)

---

## What this file is

Retention is what happens after activation. It's the difference between a SaaS that stalls at 1k MRR and one that compounds. The 8 principles below are the product + code patterns that minimize churn — auto-loaded when an agent edits files under `apps/api/server/billing.ts`, `**/dunning*`, `**/notification*`, or `**/retention*`.

Read `onboarding.md` first (you can't retain unactivated users). Read `backend.md` for the subscription model. Then this file.

---

## The 8 retention principles

### 1. Build into existing routines, not novelty

The product earns retention by becoming part of a routine the user already has — daily standups, weekly reports, morning coffee — not by being more "fun" than alternatives. Novelty fades; routine compounds.

**Rules / Guidelines / Boundaries:**

- The first feature shipped should attach to a user task that happens ≥3× per week
- Anti-features: streak counters, points, badges (gamification masking weak retention)
- Email digests are routine-anchors; tie them to the user's natural cadence (daily / weekly)
- Measure: % of users who use the product at least 3 days per week (DAU/WAU ratio target ≥40%)

**Enforcement:** rule `retention/dau-wau-floor` (mechanism: pending — `a-health` audit reads PostHog for DAU/WAU; alert if <40% sustained 4 weeks).

**Anti-pattern:**

```ts
// ❌ Add a streak counter to drive return visits
function showStreak(user) {
  return `🔥 ${user.streak} days in a row! Don't break it!`
}
// retention metric improves short-term; users churn after a streak break
```

**Pattern:**

```ts
// ✅ Tie to a real routine — Monday weekly digest
inngest.createFunction({ id: 'weekly-digest', cron: 'TZ=user 0 9 * * MON' }, async ({ user }) => {
  await sendEmail(user.email, {
    subject: `${user.name}, your week ahead`,
    html: WEEKLY_DIGEST(user),
  })
})
// digest delivers something the user would have searched for anyway
```

---

### 2. Send reasons to come back, not notifications

Every notification carries a unit of value the user actively wanted. Anything else is spam — and the user's email/push provider will eventually notice. Quality of notifications is more retention-load-bearing than frequency.

**Rules / Guidelines / Boundaries:**

- Every notification answers "what did the user ask for that this delivers?"
- Notifications cap: ≤3/week per user via email; ≤1/day via push
- Each notification has an unsubscribe-this-type link (granular, not all-or-nothing)
- Notification content includes the action's outcome, not just an event ("Your report finished — here are 3 insights" beats "Report ready")

**Enforcement:** rule `retention/notification-quality` (mechanism: pending — `w-review` reads notification templates for vague subjects; PostHog opens-rate floor of 30%).

**Anti-pattern:**

```ts
// ❌ Generic notification on every event
await sendEmail(user.email, { subject: 'Update', html: 'Something happened in your account.' })
```

**Pattern:**

```ts
// ✅ Specific, useful, unsubscribable per type
await sendEmail(user.email, {
  subject: `${insight.title} — finished analyzing your Q2 numbers`,
  html: REPORT_READY({ insight, unsubscribe: `${url}/email-prefs?type=report-ready` }),
})
```

---

### 3. Re-engagement is a state machine

Users are either `active` (used in last 7 days), `dormant` (8–30 days), or `churned` (30+ days). Each state gets different messaging. Treat them as one bucket and you over-message active users while under-messaging dormant.

**Rules / Guidelines / Boundaries:**

- Materialize user state in DB: `users.engagement_state` (active / dormant / churned)
- Recompute nightly via Inngest scheduled function reading last-action timestamp
- Re-engagement campaigns gated on state: dormant gets "we miss you," churned gets "what would bring you back"
- Never email churned users more than once per quarter without explicit re-opt-in

**Enforcement:** rule `retention/state-machine` (mechanism: pending — schema check: `users.engagement_state` exists with the named enum; ast-grep on email-send sites verifies state guard).

**Anti-pattern:**

```ts
// ❌ One re-engagement campaign blasts every inactive user
const inactive = await db
  .select()
  .from(users)
  .where(lt(users.lastActiveAt, sub(new Date(), { days: 7 })))
for (const u of inactive) await sendEmail(u.email, RE_ENGAGEMENT)
// dormant + churned + power users on holiday all get the same email
```

**Pattern:**

```ts
// ✅ State-gated messaging
const dormant = await db.select().from(users).where(eq(users.engagementState, 'dormant'))
for (const u of dormant) await sendEmail(u.email, DORMANT_TEMPLATE(u))
// churned get a different template, less often
```

---

### 4. Cancellation is frictionless and observable

A user wanting to cancel should reach the cancel button in ≤2 clicks. Friction (cancel-by-email, retention surveys popups, "are you sure" loops) earns chargebacks, bad reviews, and regulator attention (FTC click-to-cancel rule). Cancellation rate is the cleanest retention signal you have.

**Rules / Guidelines / Boundaries:**

- Cancel button on `/billing`, ≤2 clicks from any signed-in page
- One optional reason-for-cancel field (multiple-choice + free text, both optional)
- Polar customer-portal handles the actual cancel; we render the link
- Track cancellation reason and time-since-signup in analytics; don't ask for free-text justification

**Enforcement:** rule `retention/click-to-cancel` (mechanism: pending — `w-review` checks `/billing` page surfaces cancel; counts clicks-to-cancel ≤2).

**Anti-pattern:**

```tsx
// ❌ Cancel hidden behind a phone call + 3 modals
<Card>
  <p>To cancel, please email support@example.com or call (555) 123-4567.</p>
</Card>
```

**Pattern:**

```tsx
// ✅ Cancel button visible; one click → Polar portal → confirm
<Card header="Manage subscription">
  <Button variant="ghost" onClick={() => (location.href = polarPortalUrl)}>
    Cancel subscription
  </Button>
</Card>
```

---

### 5. Offer the "haircut" before accepting churn

When a user reduces usage or attempts to cancel, offer a smaller-tier or pause-the-subscription option BEFORE they leave. A user on a $9 plan beats a $0 churned user; a user on pause beats a user who deletes their account.

**Rules / Guidelines / Boundaries:**

- Cancel flow surfaces "switch to lower tier" + "pause for N months" options
- Pause is real (no charge during pause); resume requires no re-signup
- Track `haircut_taken` event vs `cancel_taken` for funnel metrics
- Don't manipulate — show the haircut as an option, not a manipulative interstitial

**Enforcement:** rule `retention/haircut-offered` (mechanism: pending — `w-review` checks cancel flow surfaces tier-down + pause options).

**Anti-pattern:**

```tsx
// ❌ Cancel = total termination, no middle ground
function Cancel() {
  return <Button onClick={hardCancel}>Confirm cancellation</Button>
}
```

**Pattern:**

```tsx
// ✅ Haircut + pause first
function CancelFlow() {
  return (
    <>
      <Button onClick={tierDown}>Switch to Starter ($5/mo)</Button>
      <Button onClick={pause}>Pause for 3 months</Button>
      <Button variant="ghost" onClick={cancel}>
        Cancel anyway
      </Button>
    </>
  )
}
```

---

### 6. Track cohorts at week 1 / 4 / 12 (the J-curve)

Aggregate retention lies. A 50% retention "headline" can hide a 90% week-1 cohort and 20% week-12 cohort. Track retention BY signup cohort (week of signup), at week 1, week 4, and week 12. The J-curve (week 4 vs week 12) is the product-market-fit signal.

**Rules / Guidelines / Boundaries:**

- PostHog dashboards: cohort retention week-1, week-4, week-12
- Cohorts measured by signup week; events = "any meaningful action that week"
- Target: week-12 retention ≥40% to claim PMF (Reforge / a16z benchmark for SaaS)
- Cohort comparisons in `decisions/health.md` quarterly; flag drops >5pp week-over-week

**Enforcement:** rule `retention/cohort-dashboards` (mechanism: pending — script verifies PostHog dashboards exist for the named cohorts).

**Anti-pattern:**

```text
# ❌ "Retention is 65%!" — but which cohort? Which week?
Aggregate retention number with no cohort breakdown.
```

**Pattern:**

```text
# ✅ Cohort table from decisions/health.md
                 Week 1   Week 4   Week 12
Apr cohort       72%      45%      38%
May cohort       69%      48%      42%   ← PMF improving
Jun cohort       71%      46%      40%
```

---

### 7. Failed payments → dunning, not auto-cancel

Card expirations, fraud holds, and bank issues account for 20-40% of "voluntary churn" in SaaS — except it's not voluntary. Polar's dunning automation retries payments + emails the user; we wire it on. Auto-cancelling on first decline burns retention.

**Rules / Guidelines / Boundaries:**

- Polar dunning configured for at-least 3 retries over 14 days
- Webhook handler for `subscription.past_due` keeps the user's access for 7 days (grace period)
- Email user via Polar template + our wrapper email at attempt 1, 2, 3
- After day 14: subscription marked `cancelled`; user keeps access through paid period end

**Enforcement:** rule `retention/dunning-configured` (mechanism: pending — script checks Polar webhook handler in `apps/api/server/billing.ts` handles `past_due` distinctly from `cancelled`).

**Anti-pattern:**

```ts
// ❌ First decline → instant access loss
async function processPolarEvent(event) {
  if (event.type === 'subscription.past_due') {
    await db.update(users).set({ tier: 'free' }).where(eq(users.id, event.userId))
  }
}
```

**Pattern:**

```ts
// ✅ Grace period; dunning runs; access preserved
async function processPolarEvent(event) {
  if (event.type === 'subscription.past_due') {
    await db
      .update(subscriptions)
      .set({ status: 'past_due', gracePeriodEndsAt: addDays(new Date(), 7) })
    // Polar runs 3 retries over 14 days; user keeps access during grace
  }
  if (event.type === 'subscription.cancelled') {
    // honored after Polar gives up; user keeps access through current_period_end
  }
}
```

---

### 8. Power users emerge from middle users

Don't optimize only for the top 5% (whales). The retention compounding effect comes from middle-of-the-distribution users moving to power-user behavior over time. Surface power-user features to middle-users via usage-triggered nudges, not blanket marketing.

**Rules / Guidelines / Boundaries:**

- Track usage tiers: light / middle / power (define per-product; e.g. weekly action count)
- Middle-users get one feature-introduction email per month based on their usage pattern
- Power-user-only features stay visible in nav but don't get marketed to light users (signal-to-noise)
- Whale focus is fine for support / sales; not for product-roadmap weighting

**Enforcement:** rule `retention/usage-tiers` (mechanism: pending — schema check: `users.usage_tier` enum exists; analytics event `tier_promoted` fires on tier change).

**Anti-pattern:**

```ts
// ❌ All "power features" emails sent to all users
const everyone = await db.select().from(users)
for (const u of everyone) await sendEmail(u.email, POWER_FEATURE_AVAILABLE)
// light users feel oversold, churn faster
```

**Pattern:**

```ts
// ✅ Targeted to middle-users showing readiness signal
const middleReady = await db
  .select()
  .from(users)
  .where(and(eq(users.usageTier, 'middle'), gt(users.weeklyActions, 5)))
for (const u of middleReady) await sendEmail(u.email, POWER_FEATURE_INTRO(u))
```

---

## Enforcement mapping

| Principle               | Mechanism                                   | rules.ts entry                   |
| ----------------------- | ------------------------------------------- | -------------------------------- |
| 1. Routine over novelty | `a-health` DAU/WAU audit                    | `retention/dau-wau-floor`        |
| 2. Notification quality | `w-review` template scan + opens-rate floor | `retention/notification-quality` |
| 3. State machine        | Schema check + ast-grep                     | `retention/state-machine`        |
| 4. Click-to-cancel      | `w-review` UI check                         | `retention/click-to-cancel`      |
| 5. Haircut before churn | `w-review` cancel-flow check                | `retention/haircut-offered`      |
| 6. Cohort dashboards    | Script verifies dashboards exist            | `retention/cohort-dashboards`    |
| 7. Dunning configured   | Script checks webhook handler               | `retention/dunning-configured`   |
| 8. Usage tiers          | Schema check + analytics event              | `retention/usage-tiers`          |

All entries currently `pending`; tracked in `bun run rules:coverage`.

---

## Cross-references

- Activation gates retention: `onboarding.md`
- Subscription state: `apps/api/server/billing.ts`, `packages/db/schema.ts`
- Dunning: Polar webhook events handled in billing.ts
- Cohort tracking: `packages/adapters/analytics.ts`
- Email cadence: `packages/adapters/email.ts`
- FTC click-to-cancel: https://www.ftc.gov/legal-library/browse/rules/click-cancel-rule
- Reforge retention curves: https://www.reforge.com/

---

## Decisions log

| Date       | Decision                                  | Rationale                                                                                                             |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Routine > novelty as P1                   | Streak-counter retention bumps short-term but accelerates long-term churn (research: Reforge, Andrew Chen).           |
| 2026-04-28 | State-machine: active/dormant/churned     | One bucket = wrong messaging; state-gated campaigns increase open rates 2-3×.                                         |
| 2026-04-28 | Click-to-cancel ≤2 clicks                 | FTC click-to-cancel rule + good faith; friction earns chargebacks + bad reviews; cancellation rate is a clean signal. |
| 2026-04-28 | Dunning grace period 7 days post past_due | Polar's 3-retry-over-14-days flow; recovers ~30% of failed-payment "churn".                                           |
| 2026-04-28 | Cohort PMF threshold: week-12 ≥ 40%       | a16z / Reforge SaaS benchmark; week-12 is the earliest reliable PMF signal.                                           |

_Update when retention model changes or new dunning policies are introduced._
