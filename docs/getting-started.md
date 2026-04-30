# Getting started

A 15-minute walkthrough from `git clone` to a live URL. The CLI narrates every step — your AI agent watches the same stream you do.

## 1. The four-line install

```bash
bun create gaia-app@latest weekend-saas
cd weekend-saas
claude
# Then in Claude: "set me up"
```

Within 500ms a green banner prints: `▶ GAIA — 30-min clock started · v1.0.0 · project: weekend-saas`. That's TTHW-1 — the moment you know the next 28 minutes will work.

The agent will run `bun gaia verify-keys` first. If you'd rather drive manually, skip the `claude` step and run the verbs yourself.

## 2. What just happened

`bun create gaia-app@latest <slug>` ran a deterministic scaffolder with three invariants:

1. **`.gitignore` first.** Before any state file is written, `.gitignore` lands so a botched run followed by `git add .` cannot leak secrets.
2. **`.env.local` template.** Empty values for the four keys you'll fill in next: `POLAR_ACCESS_TOKEN`, `RESEND_API_KEY`, `DATABASE_URL`, `RAILWAY_TOKEN`.
3. **`.gaia/state.json`.** A schema-versioned (TypeBox v1) state file that holds env-var **names** only — never values. Every later verb reads and updates it.

Open `.gaia/state.json` to confirm. You'll see `version: 1`, your project slug, the start timestamp, and a `required_env: [...]` array.

## 3. Verifying your keys

```bash
bun gaia verify-keys
```

The verb walks the four providers sequentially with live narration:

```
[+0.1s] → verify polar
[+0.4s] ✓ verify polar
[+0.4s]   ! POLAR_ACCESS_TOKEN: Polar token is test/sandbox mode — ok for v1.0 (F-10).
[+0.4s] → verify resend
[+1.1s] ✓ verify resend
[+1.1s] → verify neon
[+1.2s] ✓ verify neon
[+1.2s] → verify railway
[+1.6s] ✓ verify railway
[+1.7s] cli.complete · next: bun gaia deploy
```

Each provider's adapter calls a real HTTP `whoami` endpoint (Polar / Resend / Railway) or parses the URL shape (Neon). Soft warnings (Polar pending merchant verification, Resend domain DNS pending) are recorded but do **not** block TTFD per F-10. Hard failures exit with code 65 and a `bun gaia explain E2###` link.

## 4. Deploying with self-heal

```bash
bun gaia deploy
```

The verb runs `bun run check` first (typecheck + lint + tests), then ships to Railway. If the build fails, `d-fail` reads the Railway logs, classifies the error into one of seven known classes (typecheck, env-var, migration, lockfile-drift, drizzle-race, polar-webhook-sig, resend-domain-pending), and patches the source with exponential backoff — 1s, then 4s, then 16s. Three attempts, then the verb exits 75 with an actionable error.

A typical run on a fresh machine:

```
[+12m04s] ✗ deploy — error TS2304: cannot find name "Foo"
[+12m08s] ↻ d-fail/typecheck (1/3): patching apps/api/src/auth.ts:47
[+13m41s] ✓ deploy — live at https://weekend-saas.up.railway.app
```

To also sync the env vars to GitHub Actions secrets so your next `git push` produces a green CI run, add `--with-ci`.

## 5. Smoke testing

```bash
bun gaia smoke --url=https://weekend-saas.up.railway.app
```

Four assertions run sequentially:

1. **Health check** — `GET /health` and `/health/ready` both return 200.
2. **Auth round-trip** — `POST /auth/sign-up/email` returns a `Set-Cookie` with `HttpOnly`, `Secure`, and `SameSite=Lax`.
3. **Polar webhook** — a signed test webhook is rejected (401/403 confirms verification is enforced) or accepted (2xx confirms the route is reachable).
4. **Dashboard load** — `GET /` returns 2xx HTML.

On success, the celebration banner prints with TTFD elapsed and a `next: visit /sign-up and create your first user` hint.

## 6. Your first feature in 5 minutes

The pattern: schema → service → route → component.

1. **Schema.** Add a table in `packages/db/schema.ts` (Drizzle) — types flow everywhere via `drizzle-typebox`.
2. **Service.** Pure function in `apps/api/src/features/<feature>/service.ts` — typed inputs, typed outputs, throws via `throwError('CODE', context)`.
3. **Route.** `apps/api/server/<feature>.ts` mounted via `protectedRoute()` (auth-gated) or `publicRoute()` (rate-limited but unauth) — TypeBox schemas on body/query/params.
4. **Component.** `apps/web/src/routes/<feature>.tsx` calls the service via `createAsync` + Eden Treaty — pages do `call`, `pass`, `render`.

Run `bun run dev` (in one tab) and `bun run dev:web` (in another). Hot reload is on by default. Read [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) for the per-domain conventions — both auto-load when your AI agent edits files in those folders.

## 7. When things break

Every error in Gaia has a code in the form `E####_DESCRIPTIVE`. To get a four-line breakdown:

```bash
bun gaia explain E3001
```

```
▶ E3001_DEPLOY_TYPECHECK

  cause: TypeScript typecheck failed during deploy build.
  fix:   Run `bun run check:types` locally, fix the reported errors, recommit.
  docs:  https://github.com/henriquemeireles7/gaia#what-if-the-deploy-breaks
  next:  bun run check:types && bun gaia deploy
```

Run `bun gaia explain` (no arg) to list every code grouped by phase namespace (E0xxx dispatcher, E1xxx preflight, E2xxx verify-keys, E3xxx deploy, E4xxx smoke).

If the code isn't in the catalog yet, the CLI prints a "want to file an issue?" link with a pre-populated GitHub issue URL.

---

Next: read [`docs/architecture.md`](./architecture.md) for the system shape, or jump to [`docs/contributing.md`](./contributing.md) to ship your first PR.
