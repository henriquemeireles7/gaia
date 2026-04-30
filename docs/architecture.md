# Architecture

> This doc has two readers: a human contributor scanning, and Claude (or another AI agent) reading on-demand. Headings are agent-tagged with a one-line abstract so progressive-disclosure tools can resolve sections by name.

## TL;DR

Gaia is a Bun + Elysia + SolidStart monorepo with a strict three-layer dependency graph. Apps depend on packages; packages never depend on apps. The CLI is published standalone on npm as `create-gaia-app` (one package, two bins: `create-gaia-app` and `gaia`) and shares a TYPE-ONLY protocol (`.gaia/protocols/cli.ts`) with the agent harness. Everything observable emits to one event log (Axiom) — no file-based audit folder.

## Layers

> **Abstract:** apps consume packages; packages compose primitives; primitives wrap vendors.

```
apps/                     # Consumers — one app per product surface
├── api/                  # Elysia backend (TypeBox routes, Eden Treaty types)
└── web/                  # SolidStart frontend (call → pass → render)

packages/                 # Primitives — concretely-named, single-purpose
├── core/                 # Pure types + utilities (importable from anywhere)
├── config/               # Env validation (one schema, one source)
├── errors/               # AppError + typed code catalog
├── db/                   # Drizzle schema + migrations + client
├── adapters/             # Vendor wrappers (one file per capability)
├── auth/                 # Better Auth wired to Drizzle
├── security/             # Route wrappers, audit log, harden checks
├── ui/                   # Design tokens + components + styles
└── workflows/            # Inngest job definitions

cli/                      # Standalone-publishable create-gaia-app
└── src/                  # Bun + npm bin entry; no @gaia/* imports
```

Cross-package imports use the public entry (`@gaia/<name>`); never reach across via relative paths. Lint enforces the shape.

## Stores

> **Abstract:** five stores, each chosen by data lifecycle.

| Store                            | Lifecycle                            | Examples                                 |
| -------------------------------- | ------------------------------------ | ---------------------------------------- |
| Filesystem (git-tracked)         | Human-reviewed, version-controlled   | Skills, references, rules, content       |
| Postgres (Neon)                  | Transactional, queryable, long-lived | User data, billing state, workflow state |
| KV / Cache (Dragonfly)           | Ephemeral, fast, lossy-OK            | Sessions, rate-limit counters            |
| Object storage (Railway Buckets) | Binary, immutable-after-write        | Uploads, exports, generated files        |
| Event log (Axiom)                | Append-only, time-indexed, queryable | Logs, traces, metrics, audit trail       |

Test: "If this data vanished, what would it take to recreate?" determines the store.

## Schema flow

> **Abstract:** types are defined once and every consumer derives.

Drizzle table definitions in `packages/db/src/schema.ts` are the source for DB types. TypeBox schemas in Elysia routes are the source for API contracts. `drizzle-typebox` generates TypeBox from Drizzle where DB and API share shape. Eden Treaty flows API types to SolidStart — no manual types on the client. Forms in Solid derive validation schemas from the same TypeBox sources.

Zero manual `type Foo = { ... }` for shapes that have a schema source. If you find yourself writing a type by hand, the schema is missing.

## CLI ↔ harness contract

> **Abstract:** `.gaia/protocols/cli.ts` is type-only; CLI runtime lives in `cli/src/`; hooks may import the protocol.

The CLI is published standalone on npm as `create-gaia-app`. It cannot import from `@gaia/*` workspace packages — by design, so the npm tarball works on any developer's machine without monorepo context.

To share the CLI surface contract (verbs, exit codes, NDJSON event names, state.json schema) with the agent harness, both sides import `.gaia/protocols/cli.ts` — a TYPE-ONLY file (types, constants, TypeBox schemas; no runtime). The CLI runtime (NDJSON emitter, state.json IO, telemetry, narration) lives in `cli/src/` and is not importable from elsewhere.

```
.gaia/protocols/cli.ts       (types + constants — readable by both sides)
       │
       ├──> .claude/hooks/*.ts      (validates CLI invocations from agent)
       └──> cli/src/*.ts            (the CLI itself)
```

The reverse direction is forbidden: no hook imports from `cli/`, no `cli/` imports from `.claude/hooks/` or `packages/`.

## Resume primitive

> **Abstract:** state.json (TypeBox v1) is the resume primitive — every CLI verb reads + updates it under a file lock.

`./.gaia/state.json` (project-scoped, gitignored) lives at the root of every scaffolded project. The schema is locked at `version: 1` (`StateSchemaV1` in `.gaia/protocols/cli.ts`). Atomic writes via tmp+rename. Concurrent invocations serialize on a `state.json.lock` file with a 5-second timeout.

Hard rule: state.json holds env-var **names** only — never values. Validated by `scripts/check-state-json-no-secrets.ts` (CI gate).

## Observability boundaries

> **Abstract:** every boundary that data crosses emits exactly one signal.

| Boundary                        | Signal                   | Tool                      |
| ------------------------------- | ------------------------ | ------------------------- |
| HTTP request enters API         | Trace span               | OpenTelemetry → Axiom     |
| Error thrown                    | Error event with context | Sentry                    |
| User action completed           | Product event            | PostHog                   |
| Adapter call (external service) | Structured log           | Axiom                     |
| Inngest workflow step           | Step event               | Inngest built-in + Axiom  |
| Auth state change               | Audit log                | `packages/security/audit` |

`console.log` is forbidden in shipped code — Oxlint enforces.

## Failure handling

> **Abstract:** named errors, no swallowing, every code maps to one HTTP status.

Every error has a typed code from `packages/errors/src/codes.ts`. Services throw via `throwError('CODE', context)`. Routes let errors propagate — Elysia's onError handler maps codes to HTTP status and structured JSON. The CLI maintains its own catalog (`cli/src/errors/catalog.ts`) — disjoint namespaces (`E0xxx`-`E4xxx` for CLI, string-named for API).

## Deploy

> **Abstract:** `bun gaia deploy` invokes Railway, classifies failures into 7 known classes, retries with exponential backoff, calls `d-fail` to self-heal.

Failure classes: typecheck, env-var, migration, lockfile-drift, drizzle-race, polar-webhook-sig, resend-domain-pending (soft per F-10). Anything else falls back to a "surfaced-cleanly" path that prints the last 20 log lines + a Railway dashboard link + `bun gaia explain E3099`. Three attempts, exponential backoff (1s/4s/16s), then exit 75.

## Further reading

- [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — backend conventions.
- [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) — frontend conventions.
- [`packages/db/CLAUDE.md`](../packages/db/CLAUDE.md) — Drizzle schema rules.
- [`packages/security/CLAUDE.md`](../packages/security/CLAUDE.md) — runtime security primitives.
- [`.gaia/vision.md`](../.gaia/vision.md) — the full Gaia v7 spec.
