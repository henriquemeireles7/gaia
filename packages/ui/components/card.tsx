import type { ComponentChildren } from 'preact'

type CardProps = {
  children: ComponentChildren
  class?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, class: className = '', padding = 'md' }: CardProps) {
  return (
    <div
      class={`bg-surface-white border border-linen rounded-md ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  class: className = '',
}: {
  children: ComponentChildren
  class?: string
}) {
  return <div class={`mb-4 ${className}`}>{children}</div>
}

export function CardTitle({
  children,
  class: className = '',
}: {
  children: ComponentChildren
  class?: string
}) {
  return <h3 class={`text-lg font-semibold text-ink font-display ${className}`}>{children}</h3>
}

export function CardDescription({
  children,
  class: className = '',
}: {
  children: ComponentChildren
  class?: string
}) {
  return <p class={`text-sm text-body mt-1 ${className}`}>{children}</p>
}
