import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import matter from 'gray-matter'
import DOMPurify from 'isomorphic-dompurify'
import { Marked } from 'marked'
import { z } from 'zod'

// ─── Zod Schemas ────────────────────────────────────────────────────────────
// CUSTOMIZE: Define frontmatter schemas for your content types

export const BlogPostFrontmatter = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  author: z.string(),
  date: z.string(),
  updated: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']),
})

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase()
  return (
    !lower.startsWith('javascript:') && !lower.startsWith('data:') && !lower.startsWith('vbscript:')
  )
}

const marked = new Marked({
  renderer: {
    heading({ text, depth }) {
      const id = slugify(text)
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    link({ href, text }) {
      if (!isSafeUrl(href)) return text
      const isExternal = href.startsWith('http://') || href.startsWith('https://')
      if (isExternal) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
      }
      return `<a href="${href}">${text}</a>`
    },
    image({ href, title, text }) {
      if (!isSafeUrl(href)) return ''
      const alt = text ? ` alt="${text}"` : ' alt=""'
      const titleAttr = title ? ` title="${title}"` : ''
      return `<img src="${href}"${alt}${titleAttr} loading="lazy" />`
    },
  },
})

// ─── Public API ─────────────────────────────────────────────────────────────

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const parsed = matter(raw)
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new Error('Missing frontmatter')
  }
  return { frontmatter: parsed.data, body: parsed.content }
}

export function renderMarkdown(body: string): string {
  const html = marked.parse(body, { async: false }) as string
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
}

export function calculateReadTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export type ContentHeading = {
  id: string
  text: string
  depth: number
}

function extractHeadings(body: string): ContentHeading[] {
  const headings: ContentHeading[] = []
  const regex = /^(#{2,3})\s+(.+)$/gm
  let match: RegExpExecArray | null = regex.exec(body)
  while (match !== null) {
    headings.push({
      id: slugify(match[2]!),
      text: match[2]!,
      depth: match[1]!.length,
    })
    match = regex.exec(body)
  }
  return headings
}

export type ParsedContentItem = {
  frontmatter: Record<string, unknown>
  slug: string
}

type ParsedContentFull = {
  frontmatter: Record<string, unknown>
  html: string
  body: string
  readTime: number
  headings: ContentHeading[]
}

// ─── Content Cache (TTL-based) ──────────────────────────────────────────────

let _cacheTtl: number | null = null
function getCacheTtl(): number {
  if (_cacheTtl === null) {
    try {
      const { env } = require('@/platform/env')
      _cacheTtl = env.NODE_ENV === 'production' ? 300_000 : 60_000
    } catch {
      _cacheTtl = 60_000
    }
  }
  return _cacheTtl
}

type CacheEntry<T> = { data: T; timestamp: number }
const listCache = new Map<string, CacheEntry<ParsedContentItem[]>>()
const fileCache = new Map<string, CacheEntry<ParsedContentFull | null>>()

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > getCacheTtl()) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

function collectMdFiles(dir: string, recursive: boolean, prefix = ''): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    try {
      const stat = statSync(fullPath)
      if (stat.isFile() && entry.endsWith('.md')) {
        files.push(prefix ? `${prefix}/${entry}` : entry)
      } else if (recursive && stat.isDirectory() && !entry.startsWith('.')) {
        files.push(...collectMdFiles(fullPath, true, prefix ? `${prefix}/${entry}` : entry))
      }
    } catch {}
  }
  return files
}

export async function listContentFiles(
  dir: string,
  options?: { recursive?: boolean },
): Promise<ParsedContentItem[]> {
  const recursive = options?.recursive ?? false
  const cacheKey = `${dir}:${recursive}`
  const cached = getCached(listCache, cacheKey)
  if (cached) return cached

  const files = collectMdFiles(dir, recursive)
  const items: ParsedContentItem[] = []

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf-8')
    try {
      const { frontmatter } = parseFrontmatter(raw)
      if (frontmatter.status === 'draft') continue
      const slug = (frontmatter.slug as string) || file.replace('.md', '').replace(/\\/g, '/')
      items.push({ frontmatter: { ...frontmatter, slug }, slug })
    } catch {
      console.warn(`Skipping ${file}: invalid frontmatter`)
    }
  }

  items.sort((a, b) => {
    const dateA = (a.frontmatter.date as string) || ''
    const dateB = (b.frontmatter.date as string) || ''
    return dateB.localeCompare(dateA)
  })

  setCache(listCache, cacheKey, items)
  return items
}

export async function getContentFile(
  dir: string,
  slug: string,
  options?: { allowNested?: boolean },
): Promise<ParsedContentFull | null> {
  if (slug.includes('..') || slug.includes('\\')) return null
  if (slug.includes('/') && !options?.allowNested) return null

  const cacheKey = `${dir}:${slug}`
  const cached = getCached(fileCache, cacheKey)
  if (cached !== undefined) return cached

  const resolvedDir = resolve(dir)
  const filePath = resolve(dir, `${slug}.md`)
  if (!filePath.startsWith(resolvedDir)) return null

  let raw: string
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch {
    setCache(fileCache, cacheKey, null)
    return null
  }

  try {
    const { frontmatter, body } = parseFrontmatter(raw)
    if (frontmatter.status === 'draft') return null

    const html = renderMarkdown(body)
    const readTime = calculateReadTime(body)
    const headings = extractHeadings(body)

    const result = { frontmatter: { ...frontmatter, slug }, html, body, readTime, headings }
    setCache(fileCache, cacheKey, result)
    return result
  } catch {
    console.warn(`Failed to parse ${slug}: invalid frontmatter`)
    setCache(fileCache, cacheKey, null)
    return null
  }
}
