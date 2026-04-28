import { Button } from '../../ui/components/button'
import { AuthLayout, AuthValidationScript, FormError, PasswordInput } from './shared'

export function ResetPasswordPage({ appUrl, token }: { appUrl: string; token: string }) {
  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account">
      <FormError />

      <form
        id="reset-form"
        action={`${appUrl}/api/auth/reset-password`}
        method="POST"
        class="space-y-4"
        data-redirect="/login"
        noValidate
      >
        <input type="hidden" name="token" value={token} />

        <PasswordInput
          id="password"
          name="password"
          label="New password"
          autocomplete="new-password"
        />
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          label="Confirm password"
          autocomplete="new-password"
        />

        <Button type="submit" fullWidth>
          Reset password
        </Button>
      </form>

      <p class="mt-6 text-center text-sm text-body">
        Remember your password?{' '}
        <a href="/login" class="text-gold hover:text-gold-hover font-medium">
          Sign in
        </a>
      </p>

      <AuthValidationScript formId="reset-form" />
    </AuthLayout>
  )
}
