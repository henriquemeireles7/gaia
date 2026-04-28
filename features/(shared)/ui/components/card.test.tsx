import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Card, CardDescription, CardTitle } from './card'

describe('Card', () => {
  test('renders with default padding', () => {
    const html = renderToString(<Card>Content</Card>)
    expect(html).toContain('Content')
    expect(html).toContain('p-6')
    expect(html).toContain('bg-surface-white')
    expect(html).toContain('border-linen')
    expect(html).toContain('rounded-md')
  })

  test('renders with no padding', () => {
    const html = renderToString(<Card padding="none">Content</Card>)
    expect(html).not.toContain('p-6')
    expect(html).not.toContain('p-4')
  })

  test('renders with small padding', () => {
    const html = renderToString(<Card padding="sm">Content</Card>)
    expect(html).toContain('p-4')
  })

  test('renders with large padding', () => {
    const html = renderToString(<Card padding="lg">Content</Card>)
    expect(html).toContain('p-8')
  })

  test('applies custom class', () => {
    const html = renderToString(<Card class="border-gold">Content</Card>)
    expect(html).toContain('border-gold')
  })
})

describe('CardTitle', () => {
  test('renders as h3 with display font', () => {
    const html = renderToString(<CardTitle>Title</CardTitle>)
    expect(html).toContain('<h3')
    expect(html).toContain('Title')
    expect(html).toContain('font-display')
  })
})

describe('CardDescription', () => {
  test('renders as p with body text', () => {
    const html = renderToString(<CardDescription>Description</CardDescription>)
    expect(html).toContain('<p')
    expect(html).toContain('Description')
    expect(html).toContain('text-body')
  })
})
