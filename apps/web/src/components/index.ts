// apps/web/src/components — universal Solid wrappers around the design
// system in packages/ui/components.css.
//
// Architecture: CSS classes live in @gaia/ui/components.css (shared,
// framework-agnostic). These wrappers are the typed Solid bindings that
// map props → classes, enforce the all-8-states rule from design.md,
// and own the JSX semantics (native <dialog>, ARIA, focus management).

export { Alert, type AlertProps, type AlertType } from './alert'
export { Button, type ButtonProps, type ButtonState, type ButtonVariant } from './button'
export { Card, type CardProps } from './card'
export { EmptyState, type EmptyStateProps } from './empty-state'
export { Input, type InputProps, type InputState } from './input'
export { Modal, type ModalProps } from './modal'
export { Skeleton, type SkeletonProps } from './skeleton'
export { ToastProvider, type ToastType, useToast } from './toast'
