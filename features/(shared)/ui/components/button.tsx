import type { ComponentChildren, JSX } from 'preact'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children?: ComponentChildren
  class?: string
} & Omit<JSX.IntrinsicElements['button'], 'size' | 'loading' | 'class'>

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-white hover:bg-gold-hover',
  secondary: 'bg-sand text-ink hover:bg-linen border border-linen',
  ghost: 'bg-transparent text-body hover:bg-sand',
  danger: 'bg-error text-white hover:opacity-90',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  class: className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      class={`inline-flex items-center justify-center font-medium rounded-sm transition-colors focus-visible:outline-none ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

type LinkButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children?: ComponentChildren
  class?: string
} & Omit<JSX.IntrinsicElements['a'], 'size' | 'class'>

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  class: className = '',
  children,
  ...props
}: LinkButtonProps) {
  return (
    <a
      class={`inline-flex items-center justify-center font-medium rounded-sm transition-colors focus-visible:outline-none no-underline ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </a>
  )
}
