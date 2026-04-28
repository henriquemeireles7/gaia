# Onboarding — From signup to first value

> Status: Reference
> Last verified: April 2026
> Scope: Everything between a visitor seeing the landing page and reaching their first "I see why I'd use this" moment
> Paired with: `references.md` (shape), `retention.md` (what comes after activation), `design.md` (UX patterns), `observability.md` (analytics events)

---

## What this file is

Onboarding is the funnel from "stranger" to "activated user." Every product loses most users between those two states; the principles below are the design + code patterns that minimize the bleed. They are loaded automatically when an agent edits files under `apps/web/src/routes/{login,signup,onboarding}` or any `**/onboard*` path.

Read `references.md` first for the 5-part principle shape. Read `design.md` for the UX patterns. Then this file.

---

## The 8 onboarding principles

### 1. First user value within 60 seconds

The clock starts when the user opens the app and stops when they see meaningful output. If the path takes longer than 60 seconds, redesign — either delay paywalls / required fields, or strip the steps that aren't load-bearing.

**Rules / Guidelines / Boundaries:**

- Time-to-value (TTV) measured in seconds, not minutes; budget = 60s for the happy path
- Don't gate the first value behind email verification (verify in parallel, not blocking)
- Pre-fill anything you can infer (timezone, locale, name from email)
- "Try it without an account" path exists for any feature where it's sensible

**Enforcement:** rule `onboarding/ttv-budget` (mechanism: pending — analytics check + `d-health` audit reads activation latency from PostHog and fails if >60s p50).

**Anti-pattern:**

```tsx
// ❌ Five required fields blocking the first interaction
<form>
  <Input label="Name" required />
  <Input label="Company" required />
  <Input label="Role" required />
  <Input label="Team size" required />
  <Input label="Use case" required />
  <Button>Continue</Button>
</form>
```

**Pattern:**

```tsx
// ✅ One field; the rest is progressive disclosure after first value
<form>
  <Input label="Email" required />
  <Button>Get started</Button>
</form>
// → drops user into a sandbox where the first useful action is one click away
```

---

### 2. Activation event is named, tracked, defined ONCE

There is exactly one event called `activation` in PostHog (or whatever analytics backend), with one definition. Every cohort analysis, every funnel chart, every retention metric points at the same event. If you have to ask "which activation event?" the funnel is broken.

**Rules / Guidelines / Boundaries:**

- Define `activation` in `packages/adapters/analytics.ts` as a typed function: `trackActivation(userId, payload)`
- Activation criterion: the moment a user has done the action that makes the product real for them (sent first message, generated first artifact, etc.) — pick once, document
- Re-defining activation = breaking change; requires an ADR
- Funnel events upstream of activation: `visit`, `signup_start`, `signup_complete`, `activation` — all named, all tracked

**Enforcement:** rule `onboarding/activation-defined-once` (mechanism: pending — ast-grep: `track('activation'` only allowed inside `packages/adapters/analytics.ts`).

**Anti-pattern:**

```ts
// ❌ Multiple activation events — funnels disagree
posthog.capture('first_message_sent') // in features/messages
posthog.capture('user_activated') // in features/onboarding
posthog.capture('activated') // in components/somewhere
// which is the real one?
```

**Pattern:**

```ts
// ✅ One typed function in the adapter
// packages/adapters/analytics.ts
export async function trackActivation(userId: string, payload: { source: string }) {
  await posthog.capture({ distinctId: userId, event: 'activation', properties: payload })
}
// Called from one place; cohort analyses point at one event
```

---

### 3. Empty states ARE the tutorial

When a user arrives at a feature with no data, the empty state is the onboarding surface. Every feature with an empty state explains what it does and what to click first. Modal-based feature tours are forbidden — they steal control and feel like ads.

**Rules / Guidelines / Boundaries:**

- Use `EmptyState` from `apps/web/src/components/empty-state.tsx` (already built)
- Title states what's missing in one phrase ("No documents yet")
- Description = one sentence + clear next action via `action` prop
- No floating tour modals, no "shepherd.js"-style overlays

**Enforcement:** rule `onboarding/no-tour-modals` (mechanism: pending — harden-check pattern: imports of `shepherd.js`, `intro.js`, `react-joyride` flagged).

**Anti-pattern:**

```tsx
// ❌ Modal tour that hijacks first session
import { Tour } from 'shepherd.js'
new Tour({
  steps: [
    /* 9 modals describing the UI */
  ],
}).start()
```

**Pattern:**

```tsx
// ✅ Empty state IS the tutorial
<EmptyState
  title="No documents yet"
  description="Drop a PDF here or paste text to extract key insights with AI."
  action={{ label: 'Upload your first document', onClick: openUpload }}
/>
```

---

### 4. Progressive disclosure of features

A new user sees the minimum surface needed to reach the activation event. Advanced features (settings, integrations, exports) appear as the user demonstrates need (tier upgrade, repeated use, explicit preference change). Mass-revealing all features at once is intimidating and reduces TTV.

**Rules / Guidelines / Boundaries:**

- New users see ≤5 nav items; advanced features appear after activation
- Settings page reveals sections progressively (basic → advanced → developer)
- Feature flags drive disclosure (use `packages/config/flags.ts` patterns)
- Re-disclosure: re-show advanced features when a user upgrades plan or reaches a usage milestone

**Enforcement:** rule `onboarding/progressive-disclosure` (mechanism: pending — code review heuristic; `d-review` flag for nav components with >7 items).

**Anti-pattern:**

```tsx
// ❌ Day-1 user sees the entire app surface
<nav>
  <A href="/dashboard">Dashboard</A>
  <A href="/projects">Projects</A>
  <A href="/teams">Teams</A>
  <A href="/integrations">Integrations</A>
  <A href="/settings">Settings</A>
  <A href="/api-keys">API Keys</A>
  <A href="/billing">Billing</A>
  <A href="/audit-log">Audit Log</A>
  <A href="/admin">Admin</A>
  {/* user is on day 1 — most of these are noise */}
</nav>
```

**Pattern:**

```tsx
// ✅ Disclosed by user state
<nav>
  <A href="/dashboard">Dashboard</A>
  <A href="/projects">Projects</A>
  <Show when={user.activated}>
    <A href="/integrations">Integrations</A>
    <A href="/settings">Settings</A>
  </Show>
  <Show when={user.role === 'admin'}>
    <A href="/admin">Admin</A>
  </Show>
</nav>
```

---

### 5. Lose nothing during signup; persist anonymous work

If a user starts using the product before signing up (uploading a doc, drafting a query), their work persists across the signup boundary. The signup form receives anonymous-session state and rehydrates it. Losing user work at signup is a 30%+ funnel drop.

**Rules / Guidelines / Boundaries:**

- Anonymous work stored client-side (browser localStorage / IndexedDB) keyed by a session id
- Signup attaches the anonymous session id to the new user record; server rehydrates
- Files uploaded by anonymous users go to a temp object-store path and re-key on signup
- Drafts auto-save every 5 seconds while anonymous

**Enforcement:** rule `onboarding/persist-anonymous` (mechanism: pending — `d-review` checks signup routes for state-rehydration pattern).

**Anti-pattern:**

```tsx
// ❌ Anonymous draft lost at signup
function AnonymousEditor() {
  const [draft, setDraft] = createSignal('')
  // user types for 5 minutes; clicks "Save" → redirected to signup
  // signup completes → draft is gone, state was in component memory only
}
```

**Pattern:**

```tsx
// ✅ Persist + rehydrate
import { anonSessionStore } from '../lib/anon-session'

function AnonymousEditor() {
  const draft = anonSessionStore.bind('draft', '') // syncs to localStorage
  // signup form reads draft from anonSessionStore; sends it as part of the signup request
  // server attaches the draft to the new user
}
```

---

### 6. The first failure is silent (and recoverable)

A user's first experience cannot be a permission-denied or 401. If signup is incomplete, give them a sandbox. If their work fails to save, it's queued + retried. Errors during onboarding don't bubble up as red banners — they bubble up as "we're saving in the background" and a retry.

**Rules / Guidelines / Boundaries:**

- Onboarding routes don't render `AppError` red banners; failures are absorbed silently and retried
- Background-queue any DB writes during onboarding; surface failures only after 3 retry attempts
- Critical errors (database down, payment) surface as a soft "we're having trouble; you can keep going" message
- Once the user is activated, error surfacing reverts to standard (visible Alert + retry)

**Enforcement:** rule `onboarding/silent-first-failure` (mechanism: pending — `d-review` reads `/onboarding/*`, `/signup` routes and flags raw `<Alert type="error">` rendering).

**Anti-pattern:**

```tsx
// ❌ User's first signup attempt fails — they see "Authentication required" and bounce
<Show when={error()}>
  <Alert type="error">{error()}</Alert>
</Show>
```

**Pattern:**

```tsx
// ✅ Onboarding-mode error: soft, retried
<Show when={error()}>
  <Alert type="info">We're saving your work — give us a moment.</Alert>
</Show>
// failed write was put in a retry queue; user keeps going
```

---

### 7. Track each funnel step independently

Cohort analysis requires per-step events: `visit`, `signup_start`, `signup_complete`, `activation`. Each step is a named event; the funnel is reconstructed in PostHog (or equivalent). If any step is missing, the funnel is invisible.

**Rules / Guidelines / Boundaries:**

- Required events: `visit`, `signup_start`, `signup_complete`, `activation`, `first_action_<feature>` per major feature
- Events emitted from the route, not the component (so events are reliable)
- Use `track()` from `packages/adapters/analytics.ts`; events typed via TypeBox
- Funnel reports built in PostHog dashboards, checked into `decisions/dashboards.md`

**Enforcement:** rule `onboarding/funnel-events` (mechanism: pending — script that scans signup + onboarding routes for the 4 required `track()` calls).

**Anti-pattern:**

```ts
// ❌ Activation tracked, but no upstream events — denominator is missing
trackActivation(user.id, { source: 'web' })
// can't compute conversion rate from `signup_start` if `signup_start` was never tracked
```

**Pattern:**

```tsx
// ✅ Each step emits its event
function SignupRoute() {
  onMount(() => track('signup_start'))
  // ...
  const signup = action(async (formData) => {
    await api.auth['sign-up'].email.post(...)
    track('signup_complete', { method: 'email' })
  })
}
```

---

### 8. The first email is sent within 5 minutes

The first transactional email (welcome + verify, ideally combined) goes out within 5 minutes of signup. Beyond 5 minutes, open rates drop materially. Email verification can happen in parallel with the user's first session — don't block on it.

**Rules / Guidelines / Boundaries:**

- `sendVerificationEmail` callback in `packages/auth/index.ts` runs synchronously at signup
- Welcome and verify content combined when possible (one email, two CTAs)
- Resend's response is awaited (no fire-and-forget) so failures surface
- Verification link survives 24 hours; expired links re-send the email automatically

**Enforcement:** rule `onboarding/email-on-signup` (mechanism: pending — ast-grep checks better-auth `sendOnSignUp: true` is set in `packages/auth/index.ts`).

**Anti-pattern:**

```ts
// ❌ Email sent in a deferred queue with no SLO
await db.insert(users).values(newUser)
await emailQueue.enqueue({ to: newUser.email, template: 'welcome' })
// queue runs every 30 minutes — user gets the email after their session ends
```

**Pattern:**

```ts
// ✅ Synchronous send via Better Auth; SLO < 5 min
emailVerification: {
  sendOnSignUp: true,
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail(user.email, {
      subject: 'Welcome — verify your email',
      html: WELCOME_AND_VERIFY_HTML(url),
    })
  },
}
```

---

## Enforcement mapping

| Principle                        | Mechanism                                 | rules.ts entry                       |
| -------------------------------- | ----------------------------------------- | ------------------------------------ |
| 1. TTV <60s                      | Analytics + `d-health` audit              | `onboarding/ttv-budget`              |
| 2. Activation defined once       | ast-grep (planned)                        | `onboarding/activation-defined-once` |
| 3. Empty states are the tutorial | harden-check pattern (planned)            | `onboarding/no-tour-modals`          |
| 4. Progressive disclosure        | `d-review` heuristic                      | `onboarding/progressive-disclosure`  |
| 5. Persist anonymous work        | `d-review` check for rehydration          | `onboarding/persist-anonymous`       |
| 6. First failure is silent       | `d-review` check on onboarding routes     | `onboarding/silent-first-failure`    |
| 7. Funnel events                 | Script scans for required `track()` calls | `onboarding/funnel-events`           |
| 8. First email <5 min            | ast-grep on auth config                   | `onboarding/email-on-signup`         |

All entries currently `pending`; cycle-time SLO 14 days per `methodology.md` §2.

---

## Cross-references

- After-activation principles: `retention.md`
- Component primitives: `apps/web/src/components/`
- Analytics adapter: `packages/adapters/analytics.ts`
- Auth + email send: `packages/auth/index.ts`
- Funnel dashboards: `decisions/dashboards.md` (planned)

---

## Decisions log

| Date       | Decision                                    | Rationale                                                                                    |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-04-28 | TTV budget: 60 seconds (p50)                | Industry research (Reforge, a16z) shows materials drop in conversion past 60s.               |
| 2026-04-28 | Activation defined in `analytics.ts` only   | Multiple definitions = funnels disagree; force a single source.                              |
| 2026-04-28 | No tour modals (shepherd / intro / joyride) | Modals hijack control, feel like ads, get dismissed. EmptyStates absorb the same job inline. |
| 2026-04-28 | First email within 5 minutes                | Open-rate cliff past 5 min; combined welcome+verify avoids two-email burden.                 |

_Update when activation criterion changes or onboarding shape evolves materially._
