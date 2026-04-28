# ui

## Purpose
Preact SSR component library and layouts. All visual building blocks for the frontend.
Components use Tailwind classes with design tokens from `styles/global.css`.

## Critical Rules
- NEVER use client-side state (useState, useEffect) — these are SSR-only components
- NEVER import from features/ — UI components are shared infrastructure
- ALWAYS use design tokens (bg-cream, text-ink, border-linen, etc.) not raw colors
- ALWAYS ensure accessibility: labels, aria attributes, focus-visible styles
- ALWAYS use `class` not `className` (Preact convention)

## Imports (use from other modules)
```ts
import { Button, LinkButton } from '@/packages/ui/components'
import { Card, CardTitle, CardDescription } from '@/packages/ui/components'
import { Input, Textarea } from '@/packages/ui/components'
import { Badge } from '@/packages/ui/components'
import { Skeleton, SkeletonCard, SkeletonTable } from '@/packages/ui/components'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/packages/ui/components'
import { PublicLayout } from '@/packages/ui/layouts/public-layout'
import { DashboardLayout } from '@/packages/ui/layouts/dashboard-layout'
```

## Recipe: New Component
```tsx
import type { ComponentChildren } from 'preact'

export function MyComponent({ children, class: className = '' }: {
  children: ComponentChildren
  class?: string
}) {
  return <div class={`bg-surface-white ${className}`}>{children}</div>
}
```

## Verify
```sh
bunx tsc --noEmit
```

---
## Files
| File | Exports |
|------|---------|
| components/button.tsx | Button, LinkButton |
| components/input.tsx | Input, Textarea |
| components/card.tsx | Card, CardHeader, CardTitle, CardDescription |
| components/badge.tsx | Badge |
| components/skeleton.tsx | Skeleton, SkeletonText, SkeletonCard, SkeletonTable |
| components/dropdown.tsx | Dropdown, DropdownItem, DropdownSeparator |
| components/index.ts | barrel export |
| layouts/public-layout.tsx | PublicLayout |
| layouts/dashboard-layout.tsx | DashboardLayout |
