import { createAsync, query } from '@solidjs/router'
import { Show } from 'solid-js'
import { api } from '../lib/api'

const getMe = query(async () => {
  'use server'
  const { data, error } = await api.me.get()
  if (error) return null
  return data
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
              responses come from the API via Eden Treaty (see <code>apps/web/src/lib/api.ts</code>
              ).
            </p>
          </>
        )}
      </Show>
    </main>
  )
}
