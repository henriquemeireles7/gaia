import { A, action, useSubmission } from '@solidjs/router'
import { Show } from 'solid-js'
import { Alert, Button, Card, Input } from '../components'
import { api } from '../lib/api'
import '../styles/auth.css'

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
  const errorMessage = () => (result.result && !result.result.ok ? result.result.message : null)

  return (
    <main class="auth-page">
      <Card header="Log in">
        <form action={login} method="post" class="auth-form">
          <Input label="Email" name="email" type="email" required autocomplete="email" />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
          />
          <Show when={errorMessage()}>{(msg) => <Alert type="error">{msg()}</Alert>}</Show>
          <Button type="submit" state={result.pending ? 'loading' : 'default'} variant="primary">
            Log in
          </Button>
          <p class="auth-footer">
            <A href="/forgot-password">Forgot your password?</A>
          </p>
          <p class="auth-footer">
            New here? <A href="/signup">Create an account</A>.
          </p>
        </form>
      </Card>
    </main>
  )
}
