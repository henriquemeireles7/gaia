import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonText } from './skeleton'

describe('Skeleton', () => {
  test('renders with animation', () => {
    const html = renderToString(<Skeleton />)
    expect(html).toContain('animate-pulse')
    expect(html).toContain('bg-sand')
    expect(html).toContain('aria-hidden="true"')
  })

  test('applies custom dimensions', () => {
    const html = renderToString(<Skeleton width="100px" height="20px" />)
    expect(html).toContain('width:100px')
    expect(html).toContain('height:20px')
  })
})

describe('SkeletonText', () => {
  test('renders default 3 lines', () => {
    const html = renderToString(<SkeletonText />)
    const matches = html.match(/animate-pulse/g)
    expect(matches?.length).toBe(3)
  })

  test('renders custom line count', () => {
    const html = renderToString(<SkeletonText lines={5} />)
    const matches = html.match(/animate-pulse/g)
    expect(matches?.length).toBe(5)
  })

  test('last line is shorter', () => {
    const html = renderToString(<SkeletonText lines={2} />)
    expect(html).toContain('width:60%')
  })
})

describe('SkeletonCard', () => {
  test('renders card structure', () => {
    const html = renderToString(<SkeletonCard />)
    expect(html).toContain('bg-surface-white')
    expect(html).toContain('border-linen')
    expect(html).toContain('animate-pulse')
  })
})

describe('SkeletonTable', () => {
  test('renders default rows and cols', () => {
    const html = renderToString(<SkeletonTable />)
    expect(html).toContain('bg-surface-white')
    // Default 5 rows + 1 header = 6 row divs
    const rowMatches = html.match(/border-b/g)
    expect(rowMatches!.length).toBeGreaterThanOrEqual(6)
  })
})
