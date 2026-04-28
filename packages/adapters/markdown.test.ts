import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BlogPostFrontmatter,
  calculateReadTime,
  getContentFile,
  listContentFiles,
  parseFrontmatter,
  renderMarkdown,
} from './markdown'

describe('parseFrontmatter', () => {
  it('parses valid frontmatter', () => {
    const raw = `---
title: Test Post
slug: test-post
---

Hello world`

    const result = parseFrontmatter(raw)
    expect(result.frontmatter.title).toBe('Test Post')
    expect(result.frontmatter.slug).toBe('test-post')
    expect(result.body.trim()).toBe('Hello world')
  })

  it('throws on missing frontmatter', () => {
    expect(() => parseFrontmatter('Just some text')).toThrow('Missing frontmatter')
  })

  it('throws on empty frontmatter', () => {
    expect(() => parseFrontmatter('---\n---\nContent')).toThrow('Missing frontmatter')
  })
})

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('**bold** and *italic*')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('adds IDs to headings', () => {
    const html = renderMarkdown('## My Section')
    expect(html).toContain('id="my-section"')
  })

  it('adds target blank to external links', () => {
    const html = renderMarkdown('[Google](https://google.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('does not add target blank to internal links', () => {
    const html = renderMarkdown('[Home](/)')
    expect(html).not.toContain('target="_blank"')
  })

  it('strips javascript: URLs from links', () => {
    const html = renderMarkdown('[XSS](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('adds lazy loading to images', () => {
    const html = renderMarkdown('![alt](image.png)')
    expect(html).toContain('loading="lazy"')
  })

  it('sanitizes dangerous HTML', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })
})

describe('calculateReadTime', () => {
  it('returns 1 for short text', () => {
    expect(calculateReadTime('Hello world')).toBe(1)
  })

  it('returns correct time for longer text', () => {
    const words = Array(400).fill('word').join(' ')
    expect(calculateReadTime(words)).toBe(2)
  })

  it('returns 1 for empty text', () => {
    expect(calculateReadTime('')).toBe(1)
  })
})

describe('BlogPostFrontmatter', () => {
  it('validates correct frontmatter', () => {
    const result = BlogPostFrontmatter.safeParse({
      title: 'Test',
      slug: 'test',
      description: 'A test post',
      author: 'Author',
      date: '2024-01-01',
      status: 'published',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = BlogPostFrontmatter.safeParse({
      title: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = BlogPostFrontmatter.safeParse({
      title: 'Test',
      slug: 'test',
      description: 'A test post',
      author: 'Author',
      date: '2024-01-01',
      status: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = BlogPostFrontmatter.safeParse({
      title: 'Test',
      slug: 'test',
      description: 'A test post',
      author: 'Author',
      date: '2024-01-01',
      status: 'draft',
      tags: ['typescript', 'bun'],
      keywords: ['seo', 'keyword'],
      updated: '2024-02-01',
    })
    expect(result.success).toBe(true)
  })
})

describe('listContentFiles and getContentFile', () => {
  const testDir = join(import.meta.dir, '.test-content')

  // Setup test content directory
  const setupTestContent = () => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(
      join(testDir, 'post-a.md'),
      `---
title: Post A
slug: post-a
description: First post
author: Test
date: "2024-02-01"
status: published
---

This is post A content with enough words to test.`,
    )
    writeFileSync(
      join(testDir, 'post-b.md'),
      `---
title: Post B
slug: post-b
description: Second post
author: Test
date: "2024-01-01"
status: published
---

This is post B.`,
    )
    writeFileSync(
      join(testDir, 'draft.md'),
      `---
title: Draft
slug: draft
description: A draft
author: Test
date: "2024-03-01"
status: draft
---

This is a draft.`,
    )
  }

  const cleanupTestContent = () => {
    try {
      rmSync(testDir, { recursive: true })
    } catch {}
  }

  it('lists published content sorted by date (newest first)', async () => {
    setupTestContent()
    try {
      const items = await listContentFiles(testDir)
      expect(items.length).toBe(2)
      expect(items[0]!.slug).toBe('post-a')
      expect(items[1]!.slug).toBe('post-b')
    } finally {
      cleanupTestContent()
    }
  })

  it('excludes drafts', async () => {
    setupTestContent()
    try {
      const items = await listContentFiles(testDir)
      const slugs = items.map((i) => i.slug)
      expect(slugs).not.toContain('draft')
    } finally {
      cleanupTestContent()
    }
  })

  it('returns empty array for non-existent directory', async () => {
    const items = await listContentFiles('/tmp/nonexistent-dir-test')
    expect(items).toEqual([])
  })

  it('gets a single content file with rendered HTML', async () => {
    setupTestContent()
    try {
      const result = await getContentFile(testDir, 'post-a')
      expect(result).not.toBeNull()
      expect(result!.frontmatter.title).toBe('Post A')
      expect(result!.html).toContain('post A content')
      expect(result!.readTime).toBeGreaterThanOrEqual(1)
    } finally {
      cleanupTestContent()
    }
  })

  it('returns null for non-existent slug', async () => {
    setupTestContent()
    try {
      const result = await getContentFile(testDir, 'nonexistent')
      expect(result).toBeNull()
    } finally {
      cleanupTestContent()
    }
  })

  it('returns null for draft content', async () => {
    setupTestContent()
    try {
      const result = await getContentFile(testDir, 'draft')
      expect(result).toBeNull()
    } finally {
      cleanupTestContent()
    }
  })

  it('rejects path traversal attempts', async () => {
    const result = await getContentFile(testDir, '../etc/passwd')
    expect(result).toBeNull()
  })

  it('rejects nested paths by default', async () => {
    const result = await getContentFile(testDir, 'sub/nested')
    expect(result).toBeNull()
  })
})
