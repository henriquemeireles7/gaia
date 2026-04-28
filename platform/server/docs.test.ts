import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { docsRoutes, isDocsEnabled } from './docs'

describe('docs routes', () => {
  const app = new Hono()
  app.route('/api/docs', docsRoutes)

  test('GET /api/docs/openapi.json returns valid OpenAPI spec', async () => {
    const res = await app.request('/api/docs/openapi.json')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.openapi).toBe('3.1.0')
    expect(body.info.title).toBe('Douala API')
    expect(body.paths).toBeDefined()
    expect(Object.keys(body.paths).length).toBeGreaterThan(0)
  })

  test('GET /api/docs returns HTML with swagger-ui', async () => {
    const res = await app.request('/api/docs')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('swagger-ui')
    expect(html).toContain('/api/docs/openapi.json')
  })

  test('spec contains security schemes', async () => {
    const res = await app.request('/api/docs/openapi.json')
    const body = await res.json()
    expect(body.components.securitySchemes.session).toBeDefined()
    expect(body.components.securitySchemes.apiKey).toBeDefined()
  })

  test('spec includes all major route groups', async () => {
    const res = await app.request('/api/docs/openapi.json')
    const body = await res.json()
    const paths = Object.keys(body.paths)
    expect(paths).toContain('/health')
    expect(paths).toContain('/api/blog')
    expect(paths).toContain('/api/orgs')
    expect(paths).toContain('/api/admin/stats')
    expect(paths).toContain('/api/webhook')
    expect(paths).toContain('/api/account')
    expect(paths).toContain('/api/checkout')
    expect(paths).toContain('/api/subscription/portal')
  })
})

describe('isDocsEnabled', () => {
  test('returns a boolean', () => {
    expect(typeof isDocsEnabled()).toBe('boolean')
  })
})
