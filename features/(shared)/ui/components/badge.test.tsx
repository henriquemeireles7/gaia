import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Badge } from './badge'

describe('Badge', () => {
  test('renders default variant', () => {
    const html = renderToString(<Badge>Free</Badge>)
    expect(html).toContain('Free')
    expect(html).toContain('bg-sand')
    expect(html).toContain('text-body')
    expect(html).toContain('rounded-full')
  })

  test('renders success variant', () => {
    const html = renderToString(<Badge variant="success">Active</Badge>)
    expect(html).toContain('Active')
    expect(html).toContain('text-success')
  })

  test('renders error variant', () => {
    const html = renderToString(<Badge variant="error">Expired</Badge>)
    expect(html).toContain('text-error')
  })

  test('renders warning variant', () => {
    const html = renderToString(<Badge variant="warning">Pending</Badge>)
    expect(html).toContain('text-warning')
  })

  test('renders info variant', () => {
    const html = renderToString(<Badge variant="info">Admin</Badge>)
    expect(html).toContain('text-info')
  })

  test('applies custom class', () => {
    const html = renderToString(<Badge class="ml-2">Custom</Badge>)
    expect(html).toContain('ml-2')
  })
})
