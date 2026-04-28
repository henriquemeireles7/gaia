# MANIFEST

Index of folders that have a `CLAUDE.md` and why. Vision §H6: every CLAUDE.md earns its place. Folders not in this list inherit from the root resolver.

## Root

| Folder | Why a CLAUDE.md                                                       |
| ------ | --------------------------------------------------------------------- |
| `/`    | Resolver. Skills routing, docs routing, four engineering disciplines. |

## Methodology

| Folder             | Why a CLAUDE.md                                                             |
| ------------------ | --------------------------------------------------------------------------- |
| `.gaia/`           | Methodology-internal resolver. Routes domain questions to `reference/*.md`. |
| `.gaia/memory/`    | Three retention surfaces with different rules.                              |
| `.gaia/protocols/` | Trust layer — permissions, schemas. _(Phase 2 will populate.)_              |

## Application

| Folder                | Why a CLAUDE.md                                                                     |
| --------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/`           | Elysia HTTP API. Single entry, TypeBox routes, Eden Treaty types.                   |
| `apps/web/`           | SolidStart frontend (file-based routing, Bun runtime).                              |
| `packages/adapters/`  | Vendor wrappers. One file per capability (payments, email, ai, storage, analytics). |
| `packages/auth/`      | Better Auth wired to Drizzle. Mounted into Elysia.                                  |
| `packages/workflows/` | Inngest client.                                                                     |

## Out of scope for the manifest

- `packages/{config,errors,db,core,security}/` — leaf packages; rules in root + `code.md`.
- `decisions/` — phased out; surviving files (health, maturity, deploy) are leaf docs.
- `content/`, `node_modules/`, `dist/`, `.git/` — generated, external, or content-only.
