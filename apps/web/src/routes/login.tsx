import { action, useSubmission } from '@solidjs/router'
import { api } from '../lib/api'

const login = action(async (formData: FormData) => {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { error } = await api.auth['sign-in'].email.post({ email, password })
  if (error) {
    const body = error.value as { message?: string } | null
    return { ok: false, message: body?.message ?? 'Login failed' }
  }
  return { ok: true as const }
}, 'login')

export default function Login() {
  const result = useSubmission(login)

  return (
    <main>
      <h1>Log in</h1>
      <form action={login} method="post">
        <label>
          Email
          <input type="email" name="email" required autocomplete="email" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit" disabled={result.pending}>
          {result.pending ? 'Logging in…' : 'Log in'}
        </button>
        {result.result && !result.result.ok && <p role="alert">{result.result.message}</p>}
      </form>
    </main>
  )
}
