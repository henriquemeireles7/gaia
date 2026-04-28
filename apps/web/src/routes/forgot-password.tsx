import { A, action, useSubmission } from '@solidjs/router'
import { Show } from 'solid-js'
import { Alert, Button, Card, Input } from '../components'
import { requestPasswordReset } from '../lib/api'
import '../styles/auth.css'

// Better Auth auto-mounts the password reset endpoints under /auth/*.
// This page collects the email; the actual reset (with token) is handled
// by Better Auth's reset URL in the email it sends.

const requestReset = action(async (formData: FormData) => {
  'use server'
  const email = formData.get('email') as string
  return requestPasswordReset(email)
}, 'forgot-password')

export default function ForgotPassword() {
  const result = useSubmission(requestReset)
  const errorMessage = () => (result.result && !result.result.ok ? result.result.message : null)
  const sent = () => result.result?.ok === true

  return (
    <main class="auth-page">
      <Card header="Forgot your password?">
        <Show
          when={!sent()}
          fallback={
            <Alert type="success" title="Check your email">
              If an account exists for that email, we sent a reset link. The link expires in 1 hour.
            </Alert>
          }
        >
          <form action={requestReset} method="post" class="auth-form">
            <p>Enter the email associated with your account and we'll send you a reset link.</p>
            <Input label="Email" name="email" type="email" required autocomplete="email" />
            <Show when={errorMessage()}>{(msg) => <Alert type="error">{msg()}</Alert>}</Show>
            <Button type="submit" state={result.pending ? 'loading' : 'default'} variant="primary">
              Send reset link
            </Button>
            <p class="auth-footer">
              <A href="/login">Back to log in</A>
            </p>
          </form>
        </Show>
      </Card>
    </main>
  )
}
