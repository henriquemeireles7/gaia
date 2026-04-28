import { action, useSubmission } from '@solidjs/router'
import { api } from '../lib/api'

const signup = action(async (formData: FormData) => {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const { error } = await api.auth['sign-up'].email.post({ email, password, name })
  if (error) {
    const body = error.value as { message?: string } | null
    return { ok: false, message: body?.message ?? 'Signup failed' }
  }
  return { ok: true as const }
}, 'signup')

export default function Signup() {
  const result = useSubmission(signup)

  return (
    <main>
      <h1>Sign up</h1>
      <form action={signup} method="post">
        <label>
          Name
          <input type="text" name="name" required autocomplete="name" />
        </label>
        <label>
          Email
          <input type="email" name="email" required autocomplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autocomplete="new-password"
            minlength="8"
          />
        </label>
        <button type="submit" disabled={result.pending}>
          {result.pending ? 'Creating account…' : 'Create account'}
        </button>
        {result.result && !result.result.ok && <p role="alert">{result.result.message}</p>}
      </form>
    </main>
  )
}
