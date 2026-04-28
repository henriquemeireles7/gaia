# Douala Roadmap

## Current State (v0.1)

Douala is a maximal SaaS template built with Hono + Bun. Everything a SaaS needs is included:

- Authentication (email/password + OAuth)
- Payments (Stripe subscriptions + webhooks)
- Database (PostgreSQL + Drizzle ORM)
- Email (Resend transactional templates)
- AI (Anthropic Claude integration)
- Analytics (PostHog, optional)
- Storage (S3/R2, optional)
- Security (CSRF, rate limiting, secure headers, input validation)
- Structured logging + error tracking
- API key authentication (agent-first)
- Blog/content system (markdown with frontmatter)
- CI/CD (GitHub Actions + Railway deployment)
- Comprehensive documentation

## Near-Term

### Multi-User / Organizations
- Organizations table with memberships (owner/admin/member)
- Org-scoped data access with middleware enforcement
- Invitation system (email-based invite, accept/decline)
- CORS support for org subdomains

### Admin Panel
- `/admin` dashboard with user/subscription stats
- User management (list, search, filter, edit roles)
- Protected by admin role middleware

### Frontend Shell (Preact SSR)
- Landing page with pricing
- Auth pages (login, signup, password reset)
- Dashboard with sidebar navigation
- Settings (account, billing)
- Responsive design with skeleton loading states

## Future Vision

### Developer Experience
- OpenAPI documentation with Swagger UI
- CLI scaffolding tool (`create-douala-app`)
- Plugin/extension system

### Scale
- Redis-backed rate limiting for multi-replica deployments
- Background job processing
- WebSocket support for real-time features

### Ecosystem
- Example apps built on Douala
- Community-contributed feature packs
- Marketplace for premium features

## Philosophy

Douala follows the **maximal template** approach: ship everything opinionated, let AI subtract what doesn't fit. The developer's job is describing their product — AI handles the pruning.

See [docs/ai-workflow.md](docs/ai-workflow.md) for how this works in practice.
