import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { LandingPage } from './landing'

describe('LandingPage', () => {
  test('renders hero section', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('Ship your SaaS')
    expect(html).toContain('in days, not months')
    expect(html).toContain('Get started free')
  })

  test('renders features section', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('id="features"')
    expect(html).toContain('Authentication')
    expect(html).toContain('Payments')
    expect(html).toContain('Multi-Tenancy')
    expect(html).toContain('Admin Panel')
    expect(html).toContain('Email System')
    expect(html).toContain('Security Hardened')
  })

  test('renders pricing section with two tiers', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('id="pricing"')
    expect(html).toContain('Starter')
    expect(html).toContain('Pro')
    expect(html).toContain('$19')
    expect(html).toContain('$49')
    expect(html).toContain('Recommended')
  })

  test('renders billing toggle', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('Monthly')
    expect(html).toContain('Yearly')
    expect(html).toContain('Save ~17%')
  })

  test('renders CTA section', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('Ready to ship?')
  })

  test('renders navigation', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('Douala')
    expect(html).toContain('Features')
    expect(html).toContain('Pricing')
    expect(html).toContain('Blog')
    expect(html).toContain('Log in')
  })

  test('renders footer', () => {
    const html = renderToString(<LandingPage appUrl="http://localhost:3000" />)
    expect(html).toContain('Documentation')
    expect(html).toContain('Privacy')
    expect(html).toContain('Terms')
  })

  test('uses appUrl for checkout links', () => {
    const html = renderToString(<LandingPage appUrl="https://app.example.com" />)
    expect(html).toContain('https://app.example.com/api/checkout/redirect')
  })
})
