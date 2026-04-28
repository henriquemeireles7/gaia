import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Input, Textarea } from './input'

describe('Input', () => {
  test('renders with label', () => {
    const html = renderToString(<Input label="Email" />)
    expect(html).toContain('<label')
    expect(html).toContain('Email')
    expect(html).toContain('<input')
    expect(html).toContain('for="email"')
    expect(html).toContain('id="email"')
  })

  test('generates id from label', () => {
    const html = renderToString(<Input label="First Name" />)
    expect(html).toContain('for="first-name"')
    expect(html).toContain('id="first-name"')
  })

  test('uses custom id', () => {
    const html = renderToString(<Input label="Email" id="my-email" />)
    expect(html).toContain('id="my-email"')
    expect(html).toContain('for="my-email"')
  })

  test('renders error state', () => {
    const html = renderToString(<Input label="Email" error="Invalid email" />)
    expect(html).toContain('Invalid email')
    expect(html).toContain('text-error')
    expect(html).toContain('border-error')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('role="alert"')
  })

  test('renders hint text', () => {
    const html = renderToString(<Input label="Password" hint="Min 8 characters" />)
    expect(html).toContain('Min 8 characters')
    expect(html).toContain('text-muted')
  })

  test('error takes precedence over hint', () => {
    const html = renderToString(<Input label="Email" error="Required" hint="Enter email" />)
    expect(html).toContain('Required')
    expect(html).not.toContain('Enter email')
  })

  test('renders with placeholder', () => {
    const html = renderToString(<Input label="Email" placeholder="you@example.com" />)
    expect(html).toContain('placeholder="you@example.com"')
  })
})

describe('Textarea', () => {
  test('renders with label', () => {
    const html = renderToString(<Textarea label="Message" />)
    expect(html).toContain('<label')
    expect(html).toContain('Message')
    expect(html).toContain('<textarea')
  })

  test('renders error state', () => {
    const html = renderToString(<Textarea label="Bio" error="Too long" />)
    expect(html).toContain('Too long')
    expect(html).toContain('border-error')
    expect(html).toContain('aria-invalid="true"')
  })
})
