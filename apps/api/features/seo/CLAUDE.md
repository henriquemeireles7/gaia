# seo

## Purpose
SEO utilities: meta tags, JSON-LD structured data, sitemap, robots.txt.

## Critical Rules
- ALWAYS escape user content in meta tags (XSS prevention)
- ALWAYS use env.PUBLIC_APP_URL for absolute URLs — never hardcode
- ALWAYS include JSON-LD structured data on every public page

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| seo.ts | renderMetaTags, renderJsonLd, buildArticleSchema, buildFaqSchema, buildOrganizationSchema, buildWebSiteSchema, buildBreadcrumbSchema |
| sitemap.ts | sitemapRoutes |

## Internal Dependencies
- platform/env

<!-- Generated: 2026-04-19T04:04:55.797Z -->
