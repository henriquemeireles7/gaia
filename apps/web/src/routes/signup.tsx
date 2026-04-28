import { A, action, useSubmission } from '@solidjs/router'
import { Show } from 'solid-js'
import { Alert, Button, Card, Input } from '../components'
import { api } from '../lib/api'
import '../styles/auth.css'

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
  const errorMessage = () => (result.result && !result.result.ok ? result.result.message : null)

  return (
    <main class="auth-page">
      <Card header="Create your account">
        <form action={signup} method="post" class="auth-form">
          <Input label="Name" name="name" type="text" required autocomplete="name" />
          <Input label="Email" name="email" type="email" required autocomplete="email" />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            autocomplete="new-password"
            minlength={8}
            helper="Minimum 8 characters."
          />
          <Show when={errorMessage()}>{(msg) => <Alert type="error">{msg()}</Alert>}</Show>
          <Button type="submit" state={result.pending ? 'loading' : 'default'} variant="primary">
            Create account
          </Button>
          <p class="auth-footer">
            Already have an account? <A href="/login">Log in</A>.
          </p>
        </form>
      </Card>
    </main>
  )
}
