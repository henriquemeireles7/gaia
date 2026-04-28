import { Hono } from 'hono'
import { env } from '@/platform/env'

export const sitemapRoutes = new Hono()

// CUSTOMIZE: Add your static pages and content sections
sitemapRoutes.get('/sitemap.xml', async (c) => {
  const staticPages = [
    { loc: '/', priority: '1.0' },
    { loc: '/about', priority: '0.8' },
    { loc: '/privacy', priority: '0.3' },
    { loc: '/terms', priority: '0.3' },
  ]

  const urls = staticPages.map(
    (p) => `  <url>
    <loc>${env.PUBLIC_APP_URL}${p.loc}</loc>
    <priority>${p.priority}</priority>
  </url>`,
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  c.header('Content-Type', 'application/xml')
  return c.body(xml)
})

sitemapRoutes.get('/robots.txt', (c) => {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${env.PUBLIC_APP_URL}/sitemap.xml`

  c.header('Content-Type', 'text/plain')
  return c.body(robots)
})
