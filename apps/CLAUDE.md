# apps/

Cross-cutting principles that apply to every app. Per-app conventions live in `apps/<app>/CLAUDE.md`.

## What's here

- `api/` — the Elysia HTTP API (sibling `CLAUDE.md` carries the backend constitution).
- `web/` — the SolidStart frontend (sibling `CLAUDE.md` carries the frontend constitution).

## Critical rules (apply to every app)

- Apps depend on `packages/*` — never the other way around. A `packages/*` import from `apps/` is a layering violation.
- Cross-app imports are forbidden. `apps/api` and `apps/web` communicate via Eden Treaty (`packages/api/`).
- Each app owns its `package.json`, `moon.yml`, and entry point. No shared build config beyond what the monorepo root provides.

## Verify

```sh
bun run check
```

The fractal `CLAUDE.md` chain auto-loads on edit: editing `apps/api/server/users/route.ts` loads `/CLAUDE.md` → `apps/CLAUDE.md` → `apps/api/CLAUDE.md` (and the closest folder if it has one).
