# UX — User Flows, States, & Journey Design

> Status: Reference
> Last verified: April 2026
> Scope: Every flow, state, and journey a human experiences in a Gaia-built product
> Pairs with: `design.md` (visual language), `voice.md` (copy)

---

## What this file is

Gaia's user experience patterns — the *how* of flows, states, and journeys. `design.md` covers visual language (what things look like); this file covers *what happens between screens*.

The split:

- **design.md** — pixels, colors, typography, components at rest
- **voice.md** — every word a human reads
- **ux.md** (this file) — flows, states, transitions, decisions, recovery

These three work as a unit. Warm colors + direct words + considerate flows = trust. Any one failing breaks the whole.

Read `code.md` first. Then `design.md` for aesthetic. Then this file for how flows move.

---

## The 12 universal UX principles

### Value & speed

**1. Time-to-first-value is sacred.**
Design every flow backward from the aha moment. 5-minute target for first-session value. Intent-based onboarding asks one question up front and routes accordingly. Steps are costs; cut them ruthlessly.

**2. Feedback is immediate, accurate, proportional.**
<100ms visual ack on any interaction. <1s save confirmation. Progress bars reflect real progress. Optimistic updates reconciled, never faked. The UI never lies about state.

**3. Progressive disclosure at every level.**
Surface the 20% used 80% of the time. Bury the rest behind signaled depth. Users who never touch advanced settings get a simpler product; power users discover depth through hints.

### State coverage

**4. Every component state is designed — not ignored.**
Default, hover, focus, active, disabled, loading, empty, error, success, partial, stale, over-limit. Blank screens are bugs. The type system enforces the contract (see `design.md` §Interaction States).

**5. Empty states are onboarding moments.**
Two parts instruction, one part delight. Always a visible next action. "Nothing here" is a failure. Empty states teach the product.

**6. Errors tell truth in three parts — what, why, how to fix.**
No cryptic codes as primary message. No humor. Recovery path always visible. Preserve user work. Never "An error occurred."

### Recovery & autonomy

**7. Reversibility beats confirmation.**
Undo is preferred. Confirmation reserved for truly irreversible ops. Undo toasts with 5-10s windows. "Are you sure?" is the last resort, not the first.

**8. Recovery paths for everything.**
Lost connection, crashed session, half-complete form, deleted data — every failure mode has a designed recovery. If users can hit a wall, there's a door, marked.

**9. Respect autonomy — no dark patterns.**
No fake scarcity, guilt-trip declines, pre-checked consent, hidden costs, roach motels. One-click unsubscribe. Neutral labels. Honest defaults. Legal risk (GDPR/FTC) and long-term trust demand this.

### Structure

**10. Consistency over cleverness.**
Same signals, same meanings, same places — across pages, modals, and flows. Deviation requires rationale in an ADR.

**11. Forms are where flows die — design them deliberately.**
Fewer fields. Smart defaults. Inline validation, not submit-time error walls. Errors next to the field. Multi-step forms have visible progress.

**12. Accessibility is a flow concern.**
Keyboard flows designed end-to-end, not just focusable buttons. Screen reader flows tested. Reduced-motion flows verified. Touch targets 44px. Inaccessible flows are broken flows.

---

## The complete component state matrix

Every interactive component in Gaia handles all states. Not all visually distinct — but all accounted for, typed, and tested.

| State | When | UX requirement |
|---|---|---|
| **Default** | At rest | Base styling, discoverable affordance |
| **Hover** | Pointer over (desktop, `@media (hover: hover)`) | Subtle cue — no commitment |
| **Focus** | Keyboard navigation (`:focus-visible`) | Visible ring, never `outline: none` without replacement |
| **Active** | Pressed / in the act of clicking | Visual feedback of commitment |
| **Disabled** | Action unavailable | 50% opacity, `cursor: not-allowed`, tooltip explains *why* |
| **Loading** | Processing | Spinner or skeleton, UI never freezes |
| **Empty** | No data yet | Instruction + action, never blank |
| **Partial** | Some data, more coming | Show what's loaded, skeleton for rest |
| **Error** | Failed | What/why/how to fix |
| **Success** | Completed | Brief confirmation, next action visible |
| **Stale** | Data outdated | "Last updated X minutes ago" + refresh affordance |
| **Over-limit** | Quota/rate exceeded | Current state + how to unblock |

**Disabled states MUST explain why.** A disabled button with no tooltip is a dead end. Tooltip or helper text answers "why can't I?"

---

## Onboarding

### The first 5 minutes define everything

- 40-60% of users who sign up never return after the first session
- Every SaaS product has an "aha moment" — design backward from it
- Real case study: cutting onboarding from 11 steps to 5 → activation 23% → 38%, support tickets -46%

### Intent-based onboarding

Ask **one question** up front. Route accordingly.

```
Before we scaffold your project — one question.

What are you building?
  ◯ A SaaS (auth + billing + dashboard)
  ◯ An internal tool (auth + data + minimal UI)
  ◯ Agent backend (API + skills + no UI yet)
  ◯ Just exploring

[Continue]
```

Each choice routes to a tailored starting experience. "Just exploring" gets the sandbox; "SaaS" gets the full auth+billing scaffold.

**Why this beats multi-step wizards:** one decision, one second, immediately relevant. Wizards ask 11 questions most users don't understand yet.

### Onboarding patterns

**Pattern 1: Empty dashboard is dead.** Never land new users on a raw empty shell. Either:
- Preload sample data (with a "Clear sample data" button)
- Route to a guided first-action flow
- Show a single, prominent next-action prompt

**Pattern 2: Progress is visible.** Multi-step onboarding shows X of Y clearly. Completed steps get a ✓. Current step is highlighted. Skipped steps are re-accessible.

**Pattern 3: Skip is allowed.** Force-onboarding is dark. Every step has a "Skip for now" option. Users who skip come back to where they were.

**Pattern 4: First success visible.** The first "you did it" moment happens within 5 minutes. Not "your account is set up" — *something the user wanted* is now done.

**Pattern 5: Welcome back.** Second session: acknowledge "welcome back" + show progress + suggest the next step (not the first step again).

### Onboarding anti-patterns

- Full-screen tours that block the product
- 10+ steps before first value
- Required phone number on signup
- Required credit card for free trial (unless the product genuinely requires it)
- "Complete your profile" nag blocks that return after dismiss
- Gamification for the sake of it (dopamine design is manipulation)

---

## Empty states

Four primary empty states: first use, user-cleared, error state, no data

### Anatomy

Every empty state has:

1. **Optional illustration or icon** — subtle, on-brand (Ethereal Warmth: warm, not childlike)
2. **Title** — positive framing. "Start by adding your first project" beats "No projects"
3. **Body** — one-line explanation: what goes here, what happens after
4. **Primary action** — CTA button or inline link
5. **Secondary link** — "Learn more" or docs link, if non-obvious

### By type

#### First use (new user)

**Goal:** Activate. Get them to do the thing.

- Title: positive + directional. "Start by creating your first workspace"
- Body: one benefit + one clear path. "Workspaces organize your projects by client or brand."
- Action: single primary CTA. "Create workspace"
- Optional: link to template/sample data. "Or start with a sample workspace"

#### User-cleared (they emptied it)

**Goal:** Celebrate if appropriate; suggest next if not.

- "All caught up!" pattern when the empty is a win (inbox zero, todo list complete)
- "Nothing here yet. [Create new]" when neutral

#### Error state (system failure)

**Goal:** Explain + recover. (See Errors section below for full patterns.)

- Title: honest. "We couldn't load your projects"
- Body: cause + action. "Something broke on our end. Retry in a moment."
- Action: "Try again" + escape ("Contact support")

#### No results (search/filter)

**Goal:** Recover the search.

- Title: "No matches for 'foo'"
- Body: suggest widening. "Try different keywords, or clear your filters."
- Action: "Clear filters" + "Modify search"

### Empty state copy rules

- Never "No data."
- Never "Nothing here."
- Never "Empty."
- Always framed around *what to do next*
- Voice matches `voice.md` — warm, direct, specific

### Examples

| Scenario | ❌ Bad | ✅ Good |
|---|---|---|
| New user, no projects | "No projects" | "Your first project starts here. [Create project]" |
| Inbox cleared | "No messages" | "You're all caught up." |
| Search returns nothing | "0 results" | "No matches for 'alpha'. Try a different term or [clear filters]." |
| Permission denied area | "Access denied" | "You need admin access to see this. Ask your workspace owner." |
| Feature not yet used | "No configured alerts" | "Set up your first alert to get notified when X happens. [Create alert]" |

---

## Error states

### The three-part framework

Every error message follows:

1. **What happened** — plain language, no codes as primary
2. **Why** — cause in one line (no stack traces)
3. **How to fix** — one specific action OR an escape path

### Error taxonomy

| Type | Tone | Recovery |
|---|---|---|
| **Validation** (user input issue) | Neutral, helpful | Inline, next to field |
| **Permission** (user can't) | Clear, directs to admin | Show who has access |
| **Rate limit / quota** (user over-used) | Neutral, shows when it resets | Timer or "Upgrade" path |
| **Network transient** (temporary) | Reassuring, suggest retry | "Try again" button |
| **Server error** (our fault) | Honest, preserve data | "Try again" + "Contact support" |
| **Not found** (wrong URL) | Calm, help them find it | Search + home link |
| **Unrecoverable** (data loss risk) | Sober, preserve what's possible | Show last-saved state + recovery actions |

### Patterns by type

#### Validation errors

**Rules:**
- Inline, next to the field
- Appears on blur (not on every keystroke)
- Error icon + red text (matching `--error` token)
- Suggest the fix: "Must be 12+ characters" not "Invalid password"

```
[Email field]
[the-email-field]
✗ That doesn't look like a valid email. Check for typos.
```

#### Permission errors

**Rules:**
- State what's blocked
- State what's needed
- State how to get it

```
You need admin access to delete workspaces.

Your workspace owner is Henry Kaz (henry@gaia.dev).
[Request access] [Cancel]
```

#### Rate limits

```
You've hit the rate limit for API calls (100/minute).

Resets in: 47 seconds.
Want more? [Upgrade plan] or [Read about rate limits].
```

Never shame; always show the path.

#### Server errors

```
Something broke on our end — not yours.

Your changes are safe. We've logged it.
[Try again] [Contact support]
```

Three principles:
- Reassure (not your fault)
- Honest about state (your data is safe OR we've lost context)
- Clear next action

#### Data-loss-risk errors

The most sensitive. Preserve everything possible.

```
We couldn't save your changes.

Your last successful save was 2:41 PM.
Copy the text below before you refresh the page.

[Editable textarea with current state]

[Copy to clipboard] [Try to save again] [Discard and refresh]
```

The user might lose data. Give them the text. Let them copy it. Offer retry. Let them decide.

### Error anti-patterns

| Anti-pattern | Why banned |
|---|---|
| "Oops! Something went wrong 🙈" | Humor trivializes user frustration |
| "An error occurred" | Tells nothing |
| Stack trace as primary message | Scares users; leaks implementation |
| Error without recovery action | Dead end |
| Red exclamation mark with no text | Unclear |
| "Please try again" with no button | Forces manual retry |
| Blaming the user ("You did X wrong") | Shame |
| Dismissing without fixing ("[OK]" closes the error) | No path forward |

---

## Loading states

### The latency-tier response

| Time | User perception | Response |
|---|---|---|
| **<100ms** | Instant | No indicator; UI just responds |
| **100ms-1s** | Slight wait | Skeleton or subtle spinner, no text |
| **1-3s** | Noticeable wait | Indeterminate spinner + brief label ("Saving...") |
| **3-10s** | Active waiting | Progress indicator where possible, context message ("Running 47 tests — 12 done") |
| **10s+** | Long wait | Explicit progress + cancel option if possible + explain why ("Training the model — this usually takes ~30 seconds") |

### Skeleton vs spinner

**Skeleton screens** (grey placeholder shapes) when:
- You know roughly the layout of incoming content
- Loading is fast enough (<3s) that a spinner feels abrupt
- The perceived performance matters more than precision

**Spinners** when:
- Background operation with no visible output yet
- Indeterminate duration
- Small-area interaction (button saving)

**Neither — just disable** when:
- <100ms operation
- Button click that completes before the user releases

### Optimistic updates

For fast, likely-to-succeed operations (mark-read, toggle, like):

1. Update UI immediately as if it succeeded
2. Send the actual request in background
3. If it fails: revert + show error inline

Rule: only optimistic-update actions that *almost always succeed*. Never optimistic-update anything with material consequence (payment, delete).

### Progress bars — only honest ones

- Show real progress if you can measure it
- If you can't, use indeterminate spinner — **never fake progress**
- Show time estimate only if you can be within 20% accurate

### Loading copy

- Generic: "Loading..."
- Better: "Loading your projects..."
- Best: "Loading 47 projects..." (when you know the count)
- Long ops: include what's happening: "Running database migration 3 of 8..."

---

## Success states

### Principle: Quick confirmation, next action visible

Successful actions don't need celebration. They need:

1. **Brief confirmation** — one word + one detail
2. **Next action visible** — what's possible now
3. **Auto-dismiss** — after 5-10s, unless user interacts

### Patterns

**Inline success (after a save):**

```
✓ Saved. Changes take effect on next deploy.
[View deploys] [Dismiss]
```

**Toast success (low-stakes confirmation):**

```
✓ Profile updated.
[auto-dismisses in 5s]
```

**Screen success (after major action):**

Full-screen confirmation is reserved for genuinely significant events (signup complete, subscription activated). Even then: concise, no confetti by default, next action prominent.

### Success anti-patterns

- Giant celebratory modals for trivial actions
- Confetti animations everywhere
- "Congratulations!" on routine saves
- Required dismiss click (use auto-dismiss for toasts)
- Success that blocks continued work
- "Success!" with no specifics

---

## Forms

Forms are where SaaS flows die. Every field costs conversion.

### Principles

1. **Fewer fields.** Each field costs ~7% of completions. Ask only what you need now.
2. **Smart defaults.** Pre-fill what you know. Locale, timezone, reasonable starting values.
3. **Inline validation.** Error on blur, not on submit. Never submit-time wall-of-red.
4. **Errors specific.** "Password must be 12+ characters" beats "Invalid password."
5. **Labels above inputs**, helper text below.
6. **Required fields marked clearly** — asterisk + "Required" description at top.
7. **Progress visible** in multi-step — "Step 2 of 4" + ability to go back without losing data.
8. **Submit button named for the action** — "Create workspace" not "Submit."

### Form state contract

```
┌─────────────────────────────────────┐
│ Email *                             │  Label above, asterisk for required
│ [the-email-field_____________]      │  Input
│ ✓ Looks good                        │  OR: ✗ Error message
│ We'll send confirmation here.       │  Helper text below
└─────────────────────────────────────┘
```

### Validation timing

| Event | Action |
|---|---|
| `onChange` (typing) | No validation (too noisy) |
| `onBlur` (leaving field) | Validate this field, show error if any |
| `onSubmit` | Re-validate all, focus first invalid field |
| `onFocus` (returning to errored field) | Clear the error (they're fixing it) |

### Multi-step forms

For anything >5 fields:

- Break into steps of 2-4 fields each
- Show progress ("Step 2 of 4")
- Save draft on each step completion
- Allow backward navigation without data loss
- Never lose data on accidental close — browser warning + persistent draft

### Form anti-patterns

| Anti-pattern | Why |
|---|---|
| Submit-time validation wall | User has to scroll to find errors |
| Cryptic error messages | "Field invalid" tells nothing |
| Lost data on browser close | Persistent grief |
| Required fields for things you don't use | Costs completions |
| Password complexity rules revealed after submit | Frustration |
| "Enter your phone for security" that's really for marketing | Manipulation |
| CAPTCHA before submit (without real bot risk) | Friction |
| Asking for the same info twice | Poor memory |

---

## Navigation & information architecture

### Principles

1. **Primary nav reveals structure.** Users should understand the product's shape from the top nav.
2. **Breadcrumbs for 3+ deep** — show path home.
3. **Back navigation always works** — browser back + in-app back respect context.
4. **Search for anything with >20 items** — sidebars scale; searches do too.
5. **Active state is unambiguous** — current location obvious without squinting.

### Navigation patterns

**Top nav:**
- Logo → home
- Primary sections (3-7 items)
- Search (if applicable)
- Account / user menu (right)

**Sidebar nav:**
- For apps with many sections/pages
- Collapsible on desktop
- Bottom drawer or sheet on mobile
- Active section highlighted

**Breadcrumbs:**
- When depth ≥3
- Each level clickable
- Last level = current (not clickable)

**Deep links:**
- Every state reachable by URL
- URL reflects location + filters
- Share-a-link works for any screen

### Navigation anti-patterns

- Hamburger menu on desktop (hiding primary nav for no reason)
- Breadcrumbs on 2-level sites
- "Back" button that loses form state
- URL that doesn't update as user navigates (SPA anti-pattern)
- Hidden or unclear active state

---

## Trust signals

Small flow moments that build (or erode) trust.

### Build trust by

- **Honest feedback** — spinners reflect real work, success means success
- **Transparent state** — "Saved", "Syncing", "Unsaved changes" visible always
- **Reversibility** — undo available for at least 5s after destructive actions
- **Delay disclosure** — tell users when something will take >10s before starting
- **Clear identity** — who am I logged in as, which workspace, always visible
- **Status transparency** — when there's an outage, say so on the dashboard
- **Consistent behavior** — same click = same outcome everywhere
- **Graceful degradation** — network offline → UI doesn't crash, shows offline mode
- **Explicit confirmation** of irreversible actions ("Type workspace name to confirm delete")
- **Escape hatches always** — cancel, go back, skip, log out, delete account

### Erode trust by

- Fake progress bars
- Success toasts for operations that fail silently
- "Unsaved changes" that don't match reality
- Silent background operations with no indication
- Pricing shown only after credit card entered
- "One-click subscribe, 10-click cancel"
- Confirmshaming ("No thanks, I hate security")
- Auto-renew buried in ToS
- "Free trial" that charges on day 1

---

## Anti-manipulation — no dark patterns

This is a line Gaia doesn't cross. Regulatory (GDPR, FTC, EU DSA) and ethical.

### Explicitly forbidden

| Pattern | What it is | Why banned |
|---|---|---|
| **Fake urgency** | "Only 2 left!" when infinite | Lie |
| **Fabricated scarcity** | "13 people are looking at this" fake | Lie |
| **Forced social proof** | "Join 50,000 founders" inflated | Lie |
| **Pre-checked consent** | "☑ Send me marketing" pre-filled | Unfair default |
| **Roach motel** | Easy signup, impossible cancel | Coercion |
| **Confirmshaming** | "No thanks, I don't care about my users" | Emotional manipulation |
| **Sneaking** | Items added to cart without consent | Bait-and-switch |
| **Hidden costs** | Shipping, taxes, fees revealed at checkout | Deception |
| **Disguised ads** | Ads styled as content | Deception |
| **Trick questions** | Double-negative consent forms | Confusion |
| **Forced continuity** | Free trial auto-converts without notice | Deception |
| **Bait-and-switch** | CTA promises A, delivers B | Deception |
| **Friend spam** | Pressuring contact-list access for virality | Coercion |
| **Privacy zuckering** | Unclear what's shared with whom | Deception |

### What's allowed (ethical persuasion)

- Real urgency (actual deadline, actual scarcity) clearly stated
- Social proof (real testimonials, real names, with consent)
- Defaults that genuinely serve the user's likely intent
- Clear value statements with evidence
- Direct comparison to alternatives
- Opt-in marketing with clear opt-out
- Progress encouragement ("You're 60% done")
- Benefit-framing ("This saves you 4 hours/week")

**The test:** would you feel embarrassed explaining the pattern aloud to the person it targets? If yes, it's manipulation.

### Cancel/unsubscribe flows

Specific rules — these are where dark patterns cluster:

- **One-click unsubscribe** on emails (legally required in many jurisdictions)
- **Cancel in same # of clicks as signup** (ideally fewer)
- **No guilt trips** on cancel flow
- **No "Are you sure X7?" chains**
- **Optional survey AFTER cancel confirms** (not blocking cancel)
- **Immediate cancel** (not "your access ends in 30 days" when user wants out now — unless they keep paid access through end of billing period, clearly stated)

---

## Accessibility as flow concern

Accessibility isn't a checklist applied to components — it's a property of flows.

### Keyboard flows

Every primary flow testable with keyboard only:

- Signup → onboarding → first action: keyboard-only possible
- Create resource → save → view: keyboard-only possible
- Settings → change → confirm: keyboard-only possible

Test by unplugging your mouse for a day.

### Screen reader flows

Every primary flow navigable by screen reader:

- Landmarks (`<main>`, `<nav>`, `<aside>`, `<footer>`) present
- Headings in order (h1 → h2 → h3, no skips)
- Status changes announced (`aria-live` regions)
- Errors announced on validation fail
- Success announced on action complete
- Focus moves deliberately after route changes or modal opens

Test with VoiceOver (Mac) or NVDA (Windows).

### Reduced motion flows

Users with `prefers-reduced-motion` get:

- No scroll-triggered animations
- Crossfades instead of slides
- Instant state changes instead of transitions
- Simplified loading indicators

Test with reduced motion enabled in OS settings.

### Touch flows

- Tap targets ≥44×44px (48px preferred for primary actions)
- No hover-only interactions (touch has no hover)
- Swipe gestures provide button alternatives
- Pinch/zoom not disabled (`user-scalable=no` is an accessibility violation)

---

## Measuring UX

You can't improve what you don't measure.

### Key metrics

| Metric | What it tells you | Target |
|---|---|---|
| **Time-to-first-value (TTFV)** | Onboarding efficiency | <5 min |
| **Activation rate** | % users who reach first value | >30% |
| **Week-1 retention** | Did they come back? | >40% |
| **Task success rate** | % completing core flows | >90% |
| **Error rate per session** | UI fighting users | <1 per session avg |
| **Support ticket clustering** | Which UI area generates tickets | Trend down over time |
| **Form completion rate** | Forms aren't losing people | >80% for essential forms |

### Tools

- **PostHog** (from observability stack): funnels, session replay, feature flags for A/B
- **pa11y** (in CI): automated a11y checks
- **Manual testing**: dev team uses the product weekly; friction surfaces

### When to measure

- Before changing something: baseline
- After changing: compare against baseline
- Quarterly: trend review of key metrics
- On support ticket clusters: drill into the specific flow

### What NOT to measure

- Vanity metrics without business impact (page views, session duration without outcome)
- Aggregate satisfaction scores without segment breakdown
- NPS as sole metric (it's a correlate, not a cause)
- "Engagement" as a goal (engagement without value is addiction design)

---

## The UX review checklist

Before shipping any new flow or screen:

- [ ] All 12 component states designed (not just happy path)
- [ ] Empty state: what's the first action? visible and labeled
- [ ] Error states: what/why/how to fix, with recovery
- [ ] Loading state: skeleton or spinner appropriate for latency tier
- [ ] Success state: concise confirmation, next action visible
- [ ] Forms: inline validation, smart defaults, fewest fields possible
- [ ] Reversibility: destructive actions have undo or require deliberate confirmation
- [ ] Keyboard: flow testable with keyboard only
- [ ] Screen reader: landmarks + announcements for state changes
- [ ] Reduced motion: works with animation disabled
- [ ] Touch: 44px minimum targets, no hover-only interactions
- [ ] Dark patterns: none (review against the banned list)
- [ ] Voice: copy passes Indy Test + AI Slop Test
- [ ] Metrics: the flow is instrumented (activation, errors, completion)

If any checkbox fails, the flow isn't done.

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-19 | 12 component states enforced at type level | Blank screens are bugs. Type system makes "did we handle loading?" a compile-time question. |
| 2026-04-19 | Intent-based onboarding as default pattern | Multi-step wizards ask questions users can't answer yet. One up-front intent question routes intelligently. |
| 2026-04-19 | 5-minute time-to-first-value target | Industry data: 40-60% of users who don't reach value in first session never return. 5-min is the aha-moment target. |
| 2026-04-19 | Three-part error message framework (what/why/how to fix) | Every error has a recovery path. No dead ends. No cryptic codes as primary. |
| 2026-04-19 | Dark patterns explicitly banned (regulatory + ethical) | GDPR, FTC, EU DSA enforcement accelerating. 97% of EU apps contain dark patterns — Gaia is the 3%. |
| 2026-04-19 | Accessibility as flow concern, not component checklist | Keyboard, screen reader, reduced motion all tested end-to-end for primary flows. |
| 2026-04-19 | Reversibility > confirmation | Undo toasts preferred. Confirmation dialogs reserved for truly irreversible ops. |
| 2026-04-19 | Loading state by latency tier | Different responses for <100ms, 100ms-1s, 1-3s, 3-10s, 10s+. Fake progress banned. |
| 2026-04-19 | Form validation on blur, not keystroke | Blur-time validation is helpful; keystroke is anxious. Submit-time wall-of-red is forbidden. |

---

## Cross-references

- Visual patterns: `docs/reference/design.md`
- Copy for every state: `docs/reference/voice.md`
- Component states at the type level: `packages/ui/src/*/types.ts`
- Accessibility tooling: pa11y (CI), axe (dev), VoiceOver/NVDA (manual)
- Measurement infrastructure: `docs/reference/observability.md`
- Frontend implementation: `docs/reference/frontend.md`

*UX patterns are versioned. Changes to dark pattern rules or accessibility baseline require an ADR.*
