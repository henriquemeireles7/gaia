import type { ComponentChildren } from 'preact'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-sand text-body',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
}

export function Badge({
  variant = 'default',
  children,
  class: className = '',
}: {
  variant?: BadgeVariant
  children: ComponentChildren
  class?: string
}) {
  return (
    <span
      class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
