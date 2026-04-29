# packages/

Cross-cutting principles that apply to every package. Per-package conventions live in `packages/<name>/CLAUDE.md`.

## Critical rules (apply to every package)

- A package exports a single intent. If you're documenting "this package does X and also Y," it should be two packages.
- Packages name files by capability, not by vendor (`email.ts` not `resend.ts`). Vendor-specific code is an internal detail.
- Cross-package imports go through the package's public entry (`@gaia/<name>`); never reach across via relative paths.
- Apps depend on packages; packages must not depend on apps.
- Every package ships its own tests next to source (`foo.ts` → `foo.test.ts`).

## Inventory

| Package         | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `adapters/`     | Vendor-wrapping providers (one file per capability)          |
| `auth/`         | Better Auth wired to Drizzle                                  |
| `config/`       | Env loading and validation                                    |
| `core/`         | Shared types and utilities                                    |
| `db/`           | Drizzle schema, migrations, client                            |
| `errors/`       | AppError + typed error codes                                  |
| `security/`     | Runtime security primitives (route wrappers, audit log, harden checks) |
| `ui/`           | Design system: tokens, components, styles                    |
| `workflows/`    | Inngest job definitions                                       |

## Verify

```sh
bun run check
```
