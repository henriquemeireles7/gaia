import { Button } from '../../ui/components/button'
import { AuthLayout, AuthValidationScript, FormError } from './shared'

export function ForgotPasswordPage({ appUrl }: { appUrl: string }) {
  return (
    <AuthLayout title="Reset your password" subtitle="We'll send you a link to reset it">
      <FormError />

      <form
        id="forgot-form"
        action={`${appUrl}/api/auth/forget-password`}
        method="POST"
        class="space-y-4"
        data-redirect="/forgot-password?sent=1"
        noValidate
      >
        <div class="space-y-1">
          <label for="email" class="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            placeholder="you@example.com"
          />
        </div>

        <Button type="submit" fullWidth>
          Send reset link
        </Button>
      </form>

      <p class="mt-6 text-center text-sm text-body">
        Remember your password?{' '}
        <a href="/login" class="text-gold hover:text-gold-hover font-medium">
          Sign in
        </a>
      </p>

      <AuthValidationScript formId="forgot-form" />
    </AuthLayout>
  )
}

export function ForgotPasswordSentPage() {
  return (
    <AuthLayout title="Check your email" subtitle="If an account exists, we sent a reset link">
      <div class="text-center space-y-4">
        <div class="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <svg
            aria-hidden="true"
            class="w-6 h-6 text-success"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p class="text-sm text-body">
          Check your inbox and follow the link to reset your password. The link expires in 1 hour.
        </p>
        <a href="/login" class="inline-block text-sm text-gold hover:text-gold-hover font-medium">
          Back to sign in
        </a>
      </div>
    </AuthLayout>
  )
}
