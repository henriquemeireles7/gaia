import { describe, expect, it } from 'bun:test'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  renderJsonLd,
  renderMetaTags,
} from './seo'

describe('renderMetaTags', () => {
  it('renders required meta tags', () => {
    const html = renderMetaTags({
      title: 'Test Page',
      description: 'A test page',
      canonical: 'https://example.com/test',
    })
    expect(html).toContain('<title>Test Page</title>')
    expect(html).toContain('name="description" content="A test page"')
    expect(html).toContain('rel="canonical" href="https://example.com/test"')
    expect(html).toContain('og:title')
    expect(html).toContain('og:description')
    expect(html).toContain('twitter:card')
  })

  it('includes og:image when provided', () => {
    const html = renderMetaTags({
      title: 'Test',
      description: 'Test',
      canonical: 'https://example.com',
      ogImage: 'https://example.com/img.png',
    })
    expect(html).toContain('og:image')
    expect(html).toContain('twitter:image')
  })

  it('includes keywords when provided', () => {
    const html = renderMetaTags({
      title: 'Test',
      description: 'Test',
      canonical: 'https://example.com',
      keywords: ['saas', 'template'],
    })
    expect(html).toContain('name="keywords" content="saas, template"')
  })

  it('escapes HTML special characters', () => {
    const html = renderMetaTags({
      title: 'Test & <script>',
      description: 'Desc "with" quotes',
      canonical: 'https://example.com',
    })
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;')
    expect(html).toContain('&quot;')
    expect(html).not.toContain('<script>')
  })

  it('defaults type to website', () => {
    const html = renderMetaTags({
      title: 'Test',
      description: 'Test',
      canonical: 'https://example.com',
    })
    expect(html).toContain('content="website"')
  })

  it('uses article type when specified', () => {
    const html = renderMetaTags({
      title: 'Test',
      description: 'Test',
      canonical: 'https://example.com',
      type: 'article',
    })
    expect(html).toContain('content="article"')
  })
})

describe('renderJsonLd', () => {
  it('wraps schema in script tag', () => {
    const html = renderJsonLd({ '@type': 'WebSite', name: 'Test' })
    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('</script>')
  })

  it('adds @context automatically', () => {
    const html = renderJsonLd({ '@type': 'WebSite' })
    expect(html).toContain('"@context":"https://schema.org"')
  })

  it('escapes < to prevent XSS', () => {
    const html = renderJsonLd({ name: '</script><script>alert(1)' })
    expect(html).not.toContain('</script><script>')
    expect(html).toContain('\\u003c')
  })
})

describe('schema builders', () => {
  it('buildArticleSchema returns correct shape', () => {
    const schema = buildArticleSchema({
      title: 'Article',
      description: 'Desc',
      author: 'Author',
      datePublished: '2024-01-01',
      url: 'https://example.com/article',
      baseUrl: 'https://example.com',
    })
    expect(schema['@type']).toBe('Article')
    expect(schema.headline).toBe('Article')
    expect(schema.author['@type']).toBe('Person')
    expect(schema.dateModified).toBe('2024-01-01')
  })

  it('buildArticleSchema uses dateModified when provided', () => {
    const schema = buildArticleSchema({
      title: 'Article',
      description: 'Desc',
      author: 'Author',
      datePublished: '2024-01-01',
      dateModified: '2024-02-01',
      url: 'https://example.com/article',
      baseUrl: 'https://example.com',
    })
    expect(schema.dateModified).toBe('2024-02-01')
  })

  it('buildFaqSchema returns correct shape', () => {
    const schema = buildFaqSchema([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ])
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(2)
    expect(schema.mainEntity[0]!['@type']).toBe('Question')
  })

  it('buildOrganizationSchema returns correct shape', () => {
    const schema = buildOrganizationSchema('https://example.com')
    expect(schema['@type']).toBe('Organization')
    expect(schema.url).toBe('https://example.com')
    expect(schema.logo).toBe('https://example.com/logo.png')
  })

  it('buildWebSiteSchema returns correct shape', () => {
    const schema = buildWebSiteSchema('https://example.com')
    expect(schema['@type']).toBe('WebSite')
    expect(schema.url).toBe('https://example.com')
  })

  it('buildBreadcrumbSchema returns positions starting at 1', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
    ])
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement[0]!.position).toBe(1)
    expect(schema.itemListElement[1]!.position).toBe(2)
  })
})
