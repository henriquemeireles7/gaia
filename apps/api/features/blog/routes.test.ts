import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { blogRoutes } from './routes'

describe('blog routes', () => {
  const app = new Hono()
  app.route('/api/blog', blogRoutes)

  describe('GET /api/blog', () => {
    it('returns a list of published posts', async () => {
      const res = await app.request('/api/blog')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)

      // Should include the hello-world sample post
      const hello = body.data.find((p: { slug: string }) => p.slug === 'hello-world')
      expect(hello).toBeDefined()
      expect(hello.title).toBe('Welcome to Douala')
      expect(hello.author).toBe('Douala Team')
    })

    it('returns expected fields for each post', async () => {
      const res = await app.request('/api/blog')
      const body = await res.json()
      const post = body.data[0]

      expect(post).toHaveProperty('slug')
      expect(post).toHaveProperty('title')
      expect(post).toHaveProperty('description')
      expect(post).toHaveProperty('author')
      expect(post).toHaveProperty('date')
    })
  })

  describe('GET /api/blog/:slug', () => {
    it('returns a single post by slug', async () => {
      const res = await app.request('/api/blog/hello-world')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.data.slug).toBe('hello-world')
      expect(body.data.title).toBe('Welcome to Douala')
      expect(body.data.html).toContain('<h2')
      expect(body.data.readTime).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(body.data.headings)).toBe(true)
    })

    it('returns 404 for non-existent slug', async () => {
      const res = await app.request('/api/blog/does-not-exist')
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.code).toBe('NOT_FOUND')
    })

    it('returns 404 for path traversal attempts', async () => {
      const res = await app.request('/api/blog/..%2F..%2Fpackage')
      expect(res.status).toBe(404)
    })
  })
})
