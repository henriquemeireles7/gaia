import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Button, LinkButton } from './button'

describe('Button', () => {
  test('renders with default props', () => {
    const html = renderToString(<Button>Click me</Button>)
    expect(html).toContain('Click me')
    expect(html).toContain('bg-gold')
    expect(html).toContain('px-4 py-2')
  })

  test('renders secondary variant', () => {
    const html = renderToString(<Button variant="secondary">Secondary</Button>)
    expect(html).toContain('bg-sand')
    expect(html).toContain('border-linen')
  })

  test('renders danger variant', () => {
    const html = renderToString(<Button variant="danger">Delete</Button>)
    expect(html).toContain('bg-error')
  })

  test('renders small size', () => {
    const html = renderToString(<Button size="sm">Small</Button>)
    expect(html).toContain('px-3 py-1.5')
  })

  test('renders large size', () => {
    const html = renderToString(<Button size="lg">Large</Button>)
    expect(html).toContain('px-6 py-3')
  })

  test('renders full width', () => {
    const html = renderToString(<Button fullWidth>Wide</Button>)
    expect(html).toContain('w-full')
  })

  test('renders disabled state', () => {
    const html = renderToString(<Button disabled>Disabled</Button>)
    expect(html).toContain('disabled')
    expect(html).toContain('opacity-60')
    expect(html).toContain('cursor-not-allowed')
  })

  test('renders loading state with spinner', () => {
    const html = renderToString(<Button loading>Loading</Button>)
    expect(html).toContain('animate-spin')
    expect(html).toContain('disabled')
  })

  test('renders submit type', () => {
    const html = renderToString(<Button type="submit">Submit</Button>)
    expect(html).toContain('type="submit"')
  })

  test('applies custom class', () => {
    const html = renderToString(<Button class="my-custom">Custom</Button>)
    expect(html).toContain('my-custom')
  })
})

describe('LinkButton', () => {
  test('renders as anchor tag', () => {
    const html = renderToString(<LinkButton href="/signup">Sign up</LinkButton>)
    expect(html).toContain('<a')
    expect(html).toContain('href="/signup"')
    expect(html).toContain('Sign up')
    expect(html).toContain('no-underline')
  })

  test('renders with variant and size', () => {
    const html = renderToString(
      <LinkButton href="/go" variant="secondary" size="lg">
        Go
      </LinkButton>,
    )
    expect(html).toContain('bg-sand')
    expect(html).toContain('px-6 py-3')
  })

  test('renders full width', () => {
    const html = renderToString(
      <LinkButton href="/go" fullWidth>
        Go
      </LinkButton>,
    )
    expect(html).toContain('w-full')
  })
})
