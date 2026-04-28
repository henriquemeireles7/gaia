import { describe, expect, it } from 'bun:test'
import { ctaButton, emailLayout, escapeHtml, stripHtml } from './layout'

describe('escapeHtml', () => {
  it('escapes &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes <>', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes quotes', () => {
    expect(escapeHtml('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#39;world&#39;')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('ctaButton', () => {
  it('renders a table-based button with label and URL', () => {
    const html = ctaButton('Click Me', 'https://example.com')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('Click Me')
    expect(html).toContain('role="presentation"')
  })
})

describe('stripHtml', () => {
  it('converts HTML to plain text', () => {
    const text = stripHtml('<p>Hello <strong>world</strong></p>')
    expect(text).toContain('Hello world')
  })

  it('converts links to markdown format', () => {
    const text = stripHtml('<a href="https://example.com">Click here</a>')
    expect(text).toContain('[Click here](https://example.com)')
  })

  it('converts <br> to newlines', () => {
    const text = stripHtml('Line 1<br>Line 2')
    expect(text).toContain('Line 1\nLine 2')
  })

  it('unescapes HTML entities', () => {
    const text = stripHtml('&amp; &lt; &gt; &quot; &#39;')
    expect(text).toBe('& < > " \'')
  })
})

describe('emailLayout', () => {
  it('returns both html and text', () => {
    const result = emailLayout('<p>Hello</p>')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('wraps content in HTML email structure', () => {
    const result = emailLayout('<p>Test content</p>')
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.html).toContain('Test content')
    expect(result.html).toContain('role="presentation"')
  })

  it('includes preheader when provided', () => {
    const result = emailLayout('<p>Content</p>', { preheader: 'Preview text' })
    expect(result.html).toContain('Preview text')
    expect(result.html).toContain('display:none')
  })

  it('generates plain text from HTML content', () => {
    const result = emailLayout('<p>Hello <strong>world</strong></p>')
    expect(result.text).toContain('Hello world')
  })
})
