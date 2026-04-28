# Frontend — SolidStart + Solid + Eden Treaty

> Status: Reference
> Last verified: April 2026
> Scope: All code in `apps/web/` and `packages/ui/`

---

## What this file is

The stack-specific patterns for frontend code in Gaia. These patterns implement the 10 coding principles from `code.md` in the context of SolidStart + Solid 1.x + Eden Treaty + Tailwind v4.

Read `code.md` first. This file is the concrete *how*; `code.md` is the *why*.

**Important context for agents:** Solid looks like React but isn't React. Components run *once* as setup functions. Reactivity lives at the signal level, not the component level. Patterns that work in React (destructuring props, `useEffect` for derived state, `.map()` for lists) are broken or wasteful here.

---

## The 10 frontend patterns

### 1. Count the fields: signal for one, store for many

The decision is flat, not judgment-based:

- **One primitive value** → `createSignal`
- **Object with 2+ fields, or any nesting** → `createStore`

Agents migrating from React will reach for `createSignal({ ... })` with an object. This is wrong — object signals don't have fine-grained reactivity, and updates require replacing the whole object.

**Anti-pattern:**
```tsx
// ❌ Object in a signal — no fine-grained reactivity
const [user, setUser] = createSignal({ name: 'Ada', age: 30, email: '' })

// Updates require replacing the whole object
setUser(u => ({ ...u, name: 'Grace' }))

// Any component reading user() re-runs if ANYTHING changes
```

**Pattern:**
```tsx
// ✅ Store for objects — deep reactivity, granular updates
import { createStore } from 'solid-js/store'

const [user, setUser] = createStore({ name: 'Ada', age: 30, email: '' })

setUser('name', 'Grace') // path-based update
setUser({ name: 'Grace', age: 31 }) // merge update

// Components reading user.name only re-run when name changes
```

**Enforcement:** GritQL rule flags `createSignal(<object literal with multiple keys>)`. Lint message: "Use `createStore` for objects with multiple fields."

---

### 2. Effects only for external side effects; derivations are plain functions

`createEffect` is not `useEffect`. In React, `useEffect` is the standard place for derived state. In Solid, that's an anti-pattern — effects run after render and create glitches.

Effects are for side effects that reach *outside* Solid's reactive graph:
- DOM manipulation (setting focus, scrolling)
- Third-party library initialization (charts, maps)
- Browser APIs (localStorage, IndexedDB)
- Logging to external services

Derivations — values computed from other signals — are plain functions, or `createMemo` when the computation is expensive enough to cache.

**Anti-pattern:**
```tsx
// ❌ Effect used for derivation — glitches, unnecessary work
const [firstName, setFirstName] = createSignal('Ada')
const [lastName, setLastName] = createSignal('Lovelace')
const [fullName, setFullName] = createSignal('')

createEffect(() => {
  setFullName(`${firstName()} ${lastName()}`) // runs after render
})
```

**Pattern:**
```tsx
// ✅ Plain function derivation — synchronous, no extra render
const [firstName, setFirstName] = createSignal('Ada')
const [lastName, setLastName] = createSignal('Lovelace')
const fullName = () => `${firstName()} ${lastName()}`

// Or with memoization if expensive:
const heavyComputed = createMemo(() => expensiveCalc(firstName(), lastName()))
```

**Valid use of `createEffect`:**
```tsx
// ✅ Side effect outside Solid's graph
createEffect(() => {
  document.title = `${pageTitle()} | Gaia`
})
```

**Enforcement:** GritQL rule — `createEffect` that only reads and writes signals (no DOM, no external call, no browser API) is flagged. The allowlist: `document.*`, `window.*`, `localStorage`, imported third-party library calls, `console.*` (tests only).

---

### 3. Never destructure props — always `splitProps`/`mergeProps`

SolidJS JSX props are accessed through getters so that reading a prop inside JSX or a reactive scope automatically tracks dependencies. Destructuring extracts the value and breaks the reactive connection.

**Anti-pattern:**
```tsx
// ❌ Destructuring breaks reactivity
function UserCard({ name, avatar, onClick }) {
  return <button onClick={onClick}><img src={avatar} />{name}</button>
}
// When parent updates `name`, UserCard does NOT re-render the text
```

**Pattern:**
```tsx
// ✅ splitProps preserves reactivity
import { splitProps, mergeProps, JSX } from 'solid-js'

type UserCardProps = {
  name: string
  avatar: string
  onClick?: () => void
  class?: string
}

function UserCard(props: UserCardProps) {
  const merged = mergeProps({ class: 'default-class' }, props)
  const [local, others] = splitProps(merged, ['name', 'avatar', 'onClick'])

  return (
    <button onClick={local.onClick} class={others.class}>
      <img src={local.avatar} />
      {local.name}
    </button>
  )
}
```

**Enforcement:** Oxlint rule — destructuring a parameter named `props` in a component function is a lint error. Rule points to `splitProps`/`mergeProps` in the error message.

---

### 4. Control flow via `<Show>` / `<For>` / `<Switch>` — not ternaries or `.map()`

JSX expressions with `.map()` or ternaries on arrays break fine-grained reactivity. Solid's control flow components track identity and only update what changed.

**Anti-pattern:**
```tsx
// ❌ Ternary and .map() in JSX — full re-render on any change
function Dashboard() {
  const [user] = createResource(fetchUser)
  const [items] = createResource(fetchItems)

  return (
    <div>
      {user() ? <h1>{user()!.name}</h1> : <p>Loading...</p>}
      {items()?.map(item => <ItemCard item={item} />)}
    </div>
  )
}
```

**Pattern:**
```tsx
// ✅ Control flow components — identity tracking, Suspense integration
import { Show, For, Suspense } from 'solid-js'

function Dashboard() {
  const user = createAsync(() => fetchUser())
  const items = createAsync(() => fetchItems())

  return (
    <div>
      <Suspense fallback={<p>Loading user...</p>}>
        <Show when={user()} fallback={<p>No user</p>}>
          {(u) => <h1>{u().name}</h1>}
        </Show>
      </Suspense>
      <Suspense fallback={<p>Loading items...</p>}>
        <For each={items()} fallback={<p>No items yet</p>}>
          {(item) => <ItemCard item={item} />}
        </For>
      </Suspense>
    </div>
  )
}
```

For binary conditions, use `<Show>`. For mutually exclusive options, use `<Switch>`/`<Match>`. For iteration over lists, use `<For>` (identity) or `<Index>` (position — see below).

**Enforcement:** GritQL rule flags `.map(` inside JSX expressions in `apps/web/src/**/*.tsx`. Also flags ternary with JSX children when `<Show>` would work.

---

### 5. `<For>` tracks identity; `<Index>` tracks position

Different primitives for different data shapes:

- **`<For>`** — tracks each item by reference. Use for lists of objects with stable identity (database records with IDs). Reordering = move DOM nodes, not re-create them.
- **`<Index>`** — tracks items by position. Use for lists where position is stable but the value at that position may change (form inputs, sparse arrays).

**Pattern:**
```tsx
// ✅ <For> — users is an array of objects with unique IDs
<For each={users()}>
  {(user) => <UserRow user={user} />}
</For>

// ✅ <Index> — fixed array of form fields, values change but slots don't
<Index each={formFields()}>
  {(field, i) => <input value={field().value} onInput={e => updateField(i, e.target.value)} />}
</Index>
```

Rule of thumb: if items have stable IDs and can be reordered/removed, use `<For>`. If the list length is fixed and values mutate in place, use `<Index>`.

---

### 6. Async data via `createAsync`; paired with a named `<Suspense>`

`createAsync` is the recommended primitive for most asynchronous data fetching. It's intended to be the standard async primitive in a future Solid 2.0 release. It integrates natively with Suspense.

Never use raw `fetch()` in a component. Never roll manual loading states with signals. `createAsync` + `<Suspense>` handles it.

**Pattern:**
```tsx
import { createAsync } from '@solidjs/router'
import { Suspense, Show } from 'solid-js'
import { api } from '@/lib/api'

export default function UserPage(props: { params: { id: string } }) {
  const user = createAsync(async () => {
    const { data, error } = await api.users({ id: props.params.id }).get()
    if (error) throw error
    return data
  })

  return (
    <Suspense fallback={<UserSkeleton />}>
      <Show when={user()} fallback={<NotFound />}>
        {(u) => <UserDetail user={u()} />}
      </Show>
    </Suspense>
  )
}
```

Every `createAsync` must be wrapped by a `<Suspense>` with a named, meaningful fallback. "Loading..." is insufficient — provide a skeleton or useful intermediate state.

**Enforcement:** GritQL rule — a `createAsync` call must have an ancestor `<Suspense>` in the component tree. Bare `createAsync` without Suspense fails lint.

---

### 7. Every route ships a `preload`

A preload function is not meant to resolve data; it's meant to start the work as early as possible. SolidStart fires `preload` on link hover (navigation intent) and again during actual navigation. Data is ready by the time the component renders.

**Pattern:**
```tsx
// apps/web/src/routes/users/[id].tsx
import { type RouteDefinition, type RouteSectionProps, createAsync } from '@solidjs/router'
import { getUser } from './[id].server'

export const route = {
  preload: ({ params }) => getUser(params.id),
} satisfies RouteDefinition

export default function UserPage(props: RouteSectionProps) {
  const user = createAsync(() => getUser(props.params.id))
  return (
    <Suspense fallback={<UserSkeleton />}>
      <Show when={user()}>{(u) => <UserDetail user={u()} />}</Show>
    </Suspense>
  )
}
```

Routes without a `preload` should be extremely rare (static content pages, error pages). Default stance: every data-requiring route preloads.

**Enforcement:** GritQL rule — every route file in `apps/web/src/routes/` that uses `createAsync` must export a `route` object with a `preload` field.

---

### 8. Server functions live in `*.server.ts` files, co-located with the route

SolidStart server functions are declared inside functions with the `"use server"` pragma, using `action()` for mutations and `query()` for data fetching.

The `"use server"` pragma is invisible from the filename. Gaia's convention: server functions live in `.server.ts` files co-located with the route that uses them. This makes server vs. client explicit at the file level.

**Structure:**
```
apps/web/src/routes/users/
├── [id].tsx          # client component
├── [id].server.ts    # server functions for this route
├── index.tsx         # list route
└── index.server.ts   # server functions for list
```

**Pattern:**
```ts
// apps/web/src/routes/users/[id].server.ts
'use server'

import { query, action } from '@solidjs/router'
import { authAction, authQuery } from '@/lib/server-helpers'
import { api } from '@/lib/api'

export const getUser = authQuery(async (id: string) => {
  const { data, error } = await api.users({ id }).get()
  if (error) throw new Response('Not found', { status: 404 })
  return data
}, 'user')

export const updateUser = authAction(async (id: string, formData: FormData) => {
  const body = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  }
  const { data, error } = await api.users({ id }).put(body)
  if (error) throw new Response(error.value.message, { status: error.status })
  return data
}, 'updateUser')
```

**Enforcement:** Every file with `'use server'` at the top must be named `*.server.ts`. Every `action()` and `query()` call must be in a `*.server.ts` file. GritQL rule + file-naming check.

---

### 9. Every server function wraps `authAction()` or `publicAction()`

Every server function is a public HTTP endpoint — anyone can hit it. Auth, validation, and audit are not optional. `packages/ui/src/server-helpers.ts` (or equivalent) exports factory functions that enforce this.

**Pattern:**
```ts
// packages/ui/src/server-helpers.ts (or apps/web/src/lib/server-helpers.ts)
import { action, query } from '@solidjs/router'
import { getSession } from '@/lib/auth'

export function authQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
) {
  return query(async (...args: Parameters<T>) => {
    'use server'
    const session = await getSession()
    if (!session) throw new Response('Unauthorized', { status: 401 })
    // Pass session context as first arg; audit log the call
    return fn(...args)
  }, name)
}

export function authAction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
) {
  return action(async (...args: Parameters<T>) => {
    'use server'
    const session = await getSession()
    if (!session) throw new Response('Unauthorized', { status: 401 })
    // CSRF check + audit log
    return fn(...args)
  }, name)
}

export function publicQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
) {
  return query(fn, name) // no auth, still audited + rate-limited
}
```

Raw `action()` and `query()` from `@solidjs/router` are not imported in feature code. Only `authAction`/`authQuery`/`publicAction`/`publicQuery`.

**Enforcement:** Oxlint rule — imports of `action` and `query` from `@solidjs/router` are only allowed in `packages/ui/src/server-helpers.ts`.

---

### 10. Eden Treaty is the only HTTP client

Never call `fetch()` directly in frontend code. Never import `axios`. Every HTTP call to the Gaia backend goes through the Eden Treaty client in `apps/web/src/lib/api.ts`. Types flow from Elysia to Solid automatically — no manual type declarations, no code generation.

**Setup:**
```ts
// apps/web/src/lib/api.ts
import { treaty } from '@elysiajs/eden'
import type { App } from '@gaia/api' // the exported app type
import { env } from '@/env' // client-safe env

export const api = treaty<App>(env.PUBLIC_API_URL, {
  fetch: { credentials: 'include' }, // send session cookies
  onRequest(path, init) {
    // attach trace ID, etc.
  },
  onResponse(response) {
    // capture errors to Sentry
  },
})
```

**Usage:**
```ts
// In a server function or createAsync
const { data, error, status } = await api.users({ id }).get()

if (error) {
  // error is narrowed by status — full type safety
  switch (error.status) {
    case 404: /* handled */ break
    case 403: /* handled */ break
  }
}
```

External APIs (Stripe, Polar, Resend — though those should be server-side only) go through their own SDKs in `packages/adapters/`. Frontend never talks to third-party APIs directly.

**Enforcement:** Oxlint rule — `fetch()` calls are forbidden in `apps/web/src/` except in `apps/web/src/lib/api.ts`. Imports of `axios`, `ky`, `got`, etc. are forbidden anywhere in `apps/web/`.

---

## Styling — Tailwind v4 + design tokens

Design tokens live in `packages/ui/src/tokens.ts` (typed, enforced) and drive Tailwind v4 config. No arbitrary values in class strings.

**Rules:**
- No `text-[#3b82f6]` or `w-[427px]` — use tokens
- No inline `style={}` for colors, spacing, or font size — use classes
- No `margin` between flex/grid children — use `gap`
- No fixed column counts — use `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]`
- No animations on `width`/`height`/`top`/`left` — only `transform` and `opacity`
- Touch targets minimum 44px (use padding if visual size is smaller)
- `:focus-visible` always styled — never `outline: none` without replacement
- Mobile-first, only `min-width` breakpoints: `sm(640)`, `md(768)`, `lg(1024)`

**Enforcement:** Tailwind v4 config restricts arbitrary values by category. GritQL rule flags inline styles with color/spacing/font properties.

---

## Anti-slop checklist

Agents generating Solid UI tend to produce recognizable slop. Before merge:

- No glassmorphism / frosted glass / backdrop blur decoration
- No gradient text on metrics
- No three-column icon-heading-text grids
- No everything-centered layouts without hierarchy
- No decorative blobs or abstract shapes as filler
- No stock icon + generic heading + generic description card grids

If a section of the UI could appear in 10 other landing pages, redo it.

**Enforcement:** Manual during `/review`. Can't be lint-enforced; flagged by the Code Health skill heuristically.

---

## Accessibility — semantic by default

- Heading hierarchy: `h1` → `h2` → `h3`, never skip levels
- `<button>` for actions, `<a>` for navigation — never swap them
- All images have `alt` (empty `alt=""` for decorative)
- Color never the sole indicator — pair with icon/text/pattern
- Contrast: 4.5:1 minimum for body text
- Every interactive element has all 8 states: default, hover, active, focus-visible, disabled, loading, error, success

**Enforcement:** `pa11y` runs in CI against every route. Failures block merge.

---

## Quick reference

| Need | Pattern |
|---|---|
| Single value state | `createSignal` |
| Object or nested state | `createStore` |
| Async data | `createAsync` + `<Suspense>` |
| Derived value | Plain function or `createMemo` |
| Side effect (DOM, 3rd party) | `createEffect` |
| Component props | `splitProps` + `mergeProps` |
| Conditional rendering | `<Show when={...}>` |
| List rendering | `<For each={...}>` (identity) or `<Index each={...}>` (position) |
| Multiple conditions | `<Switch>` + `<Match>` |
| Server-side data fetch | `query()` in `*.server.ts` via `authQuery()` |
| Server-side mutation | `action()` in `*.server.ts` via `authAction()` |
| Route-level preload | `export const route = { preload: ... }` |
| HTTP to Gaia API | `api.<route>.<method>()` from Eden Treaty |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Testing patterns: `docs/reference/testing.md`
- Security patterns: `docs/reference/security.md`
- Observability patterns: `docs/reference/observability.md`

*This file is versioned. Changes to frontend patterns require a PR; changes that contradict `code.md` require an ADR.*
