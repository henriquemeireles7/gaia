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

## Application *(current; will reshape during Phase 3 monorepo split)*

| Folder | Why a CLAUDE.md |
|---|---|
| `platform/` | Shared infrastructure layer. Imports forbidden from features/. |
| `providers/` | Vendor adapters. One file per capability, named by what not who. |
| `features/(shared)/` | Business logic by domain. Sibling imports forbidden. |
| `features/(shared)/*/` | Each domain's local rules (account, admin, blog, email, organizations, pages, seo, subscription, ui). |

## Out of scope for the manifest

- `decisions/` — being phased out; surviving files (health, maturity, deploy) are leaf docs, not folders that need a CLAUDE.md.
- `content/`, `styles/` — leaf folders, no local rules beyond root.
- `node_modules/`, `dist/`, `.git/` — generated or external.
