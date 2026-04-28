export function Skeleton({
  class: className = '',
  width,
  height,
}: {
  class?: string
  width?: string
  height?: string
}) {
  return (
    <div
      class={`animate-pulse bg-sand rounded-sm ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({
  lines = 3,
  class: className = '',
}: {
  lines?: number
  class?: string
}) {
  return (
    <div class={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          class="animate-pulse bg-sand rounded-sm h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ class: className = '' }: { class?: string }) {
  return (
    <div
      class={`bg-surface-white border border-linen rounded-md p-6 ${className}`}
      aria-hidden="true"
    >
      <Skeleton class="h-5 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div class="bg-surface-white border border-linen rounded-md overflow-hidden" aria-hidden="true">
      <div class="border-b border-linen p-4 flex gap-4">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} class="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} class="border-b border-linen/50 p-4 flex gap-4">
          {Array.from({ length: cols }, (_, col) => (
            <Skeleton key={col} class="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
