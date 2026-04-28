import type { ComponentChildren } from 'preact'

type DropdownProps = {
  trigger: ComponentChildren
  children: ComponentChildren
  id: string
  align?: 'left' | 'right'
}

/**
 * SSR-friendly dropdown using native <details>/<summary>.
 * No client-side JS required.
 */
export function Dropdown({ trigger, children, id, align = 'left' }: DropdownProps) {
  return (
    <details id={id} class="relative">
      <summary class="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        {trigger}
      </summary>
      <div
        class={`absolute z-50 mt-2 min-w-48 bg-surface-white border border-linen rounded-md shadow-lg py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
      >
        {children}
      </div>
    </details>
  )
}

export function DropdownItem({
  children,
  href,
  class: className = '',
  danger = false,
}: {
  children: ComponentChildren
  href?: string
  class?: string
  danger?: boolean
}) {
  const classes = `block w-full text-left px-4 py-2 text-sm transition-colors ${danger ? 'text-error hover:bg-error/5' : 'text-ink hover:bg-sand'} ${className}`

  if (href) {
    return (
      <a href={href} class={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" class={classes}>
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <hr class="my-1 border-linen" />
}
