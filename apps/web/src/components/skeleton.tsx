import type { JSX } from 'solid-js'
import { mergeProps } from 'solid-js'

// Skeleton — pulse placeholder for loading states. design.md §a11y:
// the prefers-reduced-motion guard in styles.css disables the animation
// for users who request it.

export type SkeletonProps = {
  variant?: 'rect' | 'text' | 'circle'
  width?: string
  height?: string
}

export function Skeleton(rawProps: SkeletonProps): JSX.Element {
  const props = mergeProps({ variant: 'rect' as const }, rawProps)
  const cls = () => {
    const parts = ['skeleton']
    if (props.variant === 'text') parts.push('skeleton-text')
    if (props.variant === 'circle') parts.push('skeleton-circle')
    return parts.join(' ')
  }
  return (
    <span
      class={cls()}
      style={{ width: props.width, height: props.height }}
      aria-busy="true"
      aria-live="polite"
    />
  )
}
