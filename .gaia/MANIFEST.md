# MANIFEST

Index of folders that have a `CLAUDE.md` and why. Vision §H6: every CLAUDE.md earns its place. Folders not in this list inherit from the root resolver.

## Root

| Folder | Why a CLAUDE.md |
|---|---|
| `/` | Resolver. Skills routing, docs routing, four engineering disciplines. |

## Methodology

| Folder | Why a CLAUDE.md |
|---|---|
| `.gaia/` | Methodology-internal resolver. Routes domain questions to `reference/*.md`. |
| `.gaia/memory/` | Three retention surfaces with different rules. |
| `.gaia/protocols/` | Trust layer — permissions, schemas. *(Phase 2 will populate.)* |

## Application

| Folder | Why a CLAUDE.md |
|---|---|
| `apps/api/` | Hono API app *(Elysia swap in Phase 4)*. |
| `apps/api/features/<domain>/` | Each domain's local rules (account, admin, blog, email, organizations, pages, seo, subscription). |
| `packages/adapters/` | Vendor adapters. One file per capability, named by what not who. |
| `packages/auth/`, `packages/db/` | Auth and DB packages. |
| `packages/security/` | CSRF, rate-limit, harden-check. |
| `packages/ui/` | Preact components, layouts, styles *(SolidStart in Phase 5)*. |
| `packages/config/`, `packages/errors/`, `packages/core/` | Foundation packages. |

## Out of scope for the manifest

- `decisions/` — being phased out; surviving files (health, maturity, deploy) are leaf docs, not folders that need a CLAUDE.md.
- `content/`, `styles/` — leaf folders, no local rules beyond root.
- `node_modules/`, `dist/`, `.git/` — generated or external.
