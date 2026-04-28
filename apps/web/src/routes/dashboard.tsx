import { createAsync, query } from '@solidjs/router'
import { Show } from 'solid-js'

const getMe = query(async () => {
  'use server'
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/me`, {
    credentials: 'include',
  })
  if (!res.ok) return null
  return (await res.json()) as { user: { email: string; name: string | null } }
}, 'me')

export const route = {
  preload: () => getMe(),
}

export default function Dashboard() {
  const me = createAsync(() => getMe())

  return (
    <main>
      <h1>Dashboard</h1>
      <Show when={me()} fallback={<p>Loading…</p>}>
        {(data) => (
          <>
            <p>
              Signed in as <strong>{data().user.email}</strong>.
            </p>
            <p>
              This is the dashboard skeleton. Build your product surface here. Auth is wired, typed
              responses come from the API via Eden Treaty (see <code>packages/api/</code>).
            </p>
          </>
        )}
      </Show>
    </main>
  )
}
