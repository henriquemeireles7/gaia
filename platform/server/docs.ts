import { Hono } from 'hono'
import { env } from '../env'
import type { AppEnv } from '../types'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Douala API',
    version: '0.1.0',
    description: 'Douala SaaS template API documentation',
  },
  servers: [{ url: env.PUBLIC_APP_URL, description: 'Current environment' }],
  tags: [
    { name: 'Health', description: 'Server health and status' },
    { name: 'Auth', description: 'Authentication (managed by Better Auth)' },
    { name: 'Account', description: 'User account management' },
    { name: 'Checkout', description: 'Stripe checkout and subscription' },
    { name: 'Subscription', description: 'Subscription portal' },
    { name: 'Webhook', description: 'Stripe webhook handler' },
    { name: 'Blog', description: 'Blog content' },
    { name: 'Organizations', description: 'Multi-tenant organization management' },
    { name: 'Admin', description: 'Admin-only endpoints' },
    { name: 'SEO', description: 'Sitemap and robots.txt' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server health, DB status, version, and uptime',
        responses: {
          '200': {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded'] },
                    version: { type: 'string' },
                    uptime: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string' },
                    db: { type: 'string', enum: ['connected', 'error'] },
                  },
                },
              },
            },
          },
          '503': { description: 'Degraded — database unreachable' },
        },
      },
    },
    '/api/auth/{path}': {
      get: {
        tags: ['Auth'],
        summary: 'Better Auth endpoints',
        description:
          'All auth routes are handled by Better Auth. See Better Auth docs for details on sign-up, sign-in, session, password reset, OAuth, etc.',
        parameters: [{ name: 'path', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Varies by auth endpoint' } },
      },
      post: {
        tags: ['Auth'],
        summary: 'Better Auth endpoints',
        description: 'State-changing auth operations (sign-up, sign-in, sign-out, etc.)',
        parameters: [{ name: 'path', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Varies by auth endpoint' } },
      },
    },
    '/api/account/export': {
      get: {
        tags: ['Account'],
        summary: 'Export user data',
        description: 'GDPR data export — returns all user data as JSON',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'User data export' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/account': {
      delete: {
        tags: ['Account'],
        summary: 'Delete account',
        description: 'GDPR right-to-erasure — permanently deletes user and all associated data',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Account deleted' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/checkout': {
      post: {
        tags: ['Checkout'],
        summary: 'Create checkout session',
        description: 'Creates a Stripe checkout session for subscription purchase',
        security: [{ session: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  interval: { type: 'string', enum: ['monthly', 'yearly'] },
                },
                required: ['interval'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Checkout session created' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/checkout/redirect': {
      get: {
        tags: ['Checkout'],
        summary: 'Checkout redirect',
        description: 'Redirects user to Stripe checkout page',
        security: [{ session: [] }, { apiKey: [] }],
        responses: { '302': { description: 'Redirect to Stripe' } },
      },
    },
    '/api/checkout/session-info': {
      get: {
        tags: ['Checkout'],
        summary: 'Get checkout session info',
        description: 'Returns details about a completed checkout session',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [
          { name: 'session_id', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Session info' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/checkout/complete': {
      post: {
        tags: ['Checkout'],
        summary: 'Complete checkout',
        description: 'Finalizes the checkout after Stripe payment succeeds',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Checkout completed' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/subscription/portal': {
      post: {
        tags: ['Subscription'],
        summary: 'Customer portal',
        description: 'Creates a Stripe customer portal session for managing subscriptions',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Portal session URL' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/webhook': {
      post: {
        tags: ['Webhook'],
        summary: 'Stripe webhook',
        description:
          'Receives Stripe webhook events. Verified via webhook signature, not session auth.',
        responses: {
          '200': { description: 'Webhook processed' },
          '400': { description: 'Invalid signature' },
        },
      },
    },
    '/api/blog': {
      get: {
        tags: ['Blog'],
        summary: 'List blog posts',
        description: 'Returns all published blog posts',
        responses: { '200': { description: 'List of blog posts' } },
      },
    },
    '/api/blog/{slug}': {
      get: {
        tags: ['Blog'],
        summary: 'Get blog post',
        description: 'Returns a single blog post by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Blog post' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/orgs': {
      get: {
        tags: ['Organizations'],
        summary: 'List user organizations',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'List of organizations' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Organizations'],
        summary: 'Create organization',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '201': { description: 'Organization created' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/orgs/current': {
      get: {
        tags: ['Organizations'],
        summary: 'Get current organization',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Current organization details' },
          '401': { description: 'Unauthorized' },
        },
      },
      patch: {
        tags: ['Organizations'],
        summary: 'Update current organization',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Organization updated' },
          '401': { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Organizations'],
        summary: 'Delete current organization',
        description: 'Owner-only',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Organization deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not owner' },
        },
      },
    },
    '/api/orgs/members': {
      get: {
        tags: ['Organizations'],
        summary: 'List organization members',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'List of members' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/orgs/members/{userId}': {
      patch: {
        tags: ['Organizations'],
        summary: 'Update member role',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Member role updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      delete: {
        tags: ['Organizations'],
        summary: 'Remove member',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Member removed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/orgs/invitations': {
      get: {
        tags: ['Organizations'],
        summary: 'List invitations',
        description: 'Admin-only',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'List of invitations' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Organizations'],
        summary: 'Create invitation',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '201': { description: 'Invitation created' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/orgs/invitations/{id}': {
      delete: {
        tags: ['Organizations'],
        summary: 'Cancel invitation',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Invitation cancelled' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/orgs/invitations/{token}/accept': {
      post: {
        tags: ['Organizations'],
        summary: 'Accept invitation',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Invitation accepted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Dashboard stats',
        description: 'Admin-only aggregate statistics',
        security: [{ session: [] }, { apiKey: [] }],
        responses: {
          '200': { description: 'Admin stats' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not admin' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        description: 'Paginated user list (admin-only)',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated user list' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/users/{userId}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user details',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User details' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update user role',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete user',
        security: [{ session: [] }, { apiKey: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/sitemap.xml': {
      get: {
        tags: ['SEO'],
        summary: 'XML Sitemap',
        responses: { '200': { description: 'Sitemap XML' } },
      },
    },
    '/robots.txt': {
      get: {
        tags: ['SEO'],
        summary: 'Robots.txt',
        responses: { '200': { description: 'Robots.txt content' } },
      },
    },
  },
  components: {
    securitySchemes: {
      session: {
        type: 'apiKey' as const,
        in: 'cookie' as const,
        name: 'better-auth.session_token',
        description: 'Session cookie (set by Better Auth sign-in)',
      },
      apiKey: {
        type: 'http' as const,
        scheme: 'bearer',
        description: 'API key — Bearer sk_...',
      },
    },
  },
}

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Douala API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`

export const docsRoutes = new Hono<AppEnv>()

docsRoutes.get('/openapi.json', (c) => {
  return c.json(spec)
})

docsRoutes.get('/', (c) => {
  return c.html(swaggerHtml)
})

/**
 * Returns true if API docs should be enabled (development/test only).
 */
export function isDocsEnabled(): boolean {
  return env.NODE_ENV !== 'production'
}
