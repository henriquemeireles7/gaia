import { join } from 'node:path'
import { Hono } from 'hono'
import { success } from '@/apps/api/server/responses'
import { getContentFile, listContentFiles } from '@/packages/adapters/markdown'
import type { AppEnv } from '@/packages/config/types'
import { throwError } from '@/packages/errors'

const CONTENT_DIR = join(import.meta.dir, '../../../../content/posts')

export const blogRoutes = new Hono<AppEnv>()

// GET /blog — list all published blog posts
blogRoutes.get('/', async (c) => {
  const posts = await listContentFiles(CONTENT_DIR)
  return success(
    c,
    posts.map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      description: p.frontmatter.description,
      author: p.frontmatter.author,
      date: p.frontmatter.date,
      tags: p.frontmatter.tags,
    })),
  )
})

// GET /blog/:slug — get a single blog post
blogRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const post = await getContentFile(CONTENT_DIR, slug)

  if (!post) {
    return throwError(c, 'NOT_FOUND', `Blog post "${slug}" not found`)
  }

  return success(c, {
    slug,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    author: post.frontmatter.author,
    date: post.frontmatter.date,
    tags: post.frontmatter.tags,
    html: post.html,
    readTime: post.readTime,
    headings: post.headings,
  })
})
