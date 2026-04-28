# permissions.md

Hard boundaries for what the agent may do (vision §H8). Three buckets. Force-push to `master` is **never-allowed** — no skill can override. Changing this file is a product decision and requires explicit human edit.

## Always-allowed

The agent can do these without asking:

- Read any file in the repository (other than secrets).
- Run any `bun run check`, `bun run check:lint`, `bun run check:types`, `bun run check:test`, `bun test`, `bun run lint`.
- Run any `bun run db:generate` (migration generation; does not apply).
- Create local branches.
- Write to `.gaia/memory/working/`, `.gaia/memory/episodic/*.jsonl`, `.gaia/audit/`.
- Write to `.claude/skills/d-*/` (the agent's own procedures — vision §H2).
- Open a PR with `gh pr create` for branches the agent created.

## Requires-approval

The agent must ask before:

- Merging a PR (`gh pr merge`).
- Pushing to `master` (no merges happen via direct push; PRs only).
- Running database migrations (`bun run db:migrate`).
- Running database seed (`bun run db:seed`).
- Deploying (Railway, Cloudflare, or otherwise).
- Installing or removing dependencies (`bun add`, `bun remove`, `bun install` with lockfile changes).
- Modifying CI configurations under `.github/workflows/`.
- Modifying environment configuration (`.env.example`, env validation in `packages/config/`).
- Modifying `.claude/settings.json` (hook wiring).
- Modifying `.gaia/rules.ts` (the policy source).
- Modifying `.gaia/protocols/` (this trust layer).
- Calling external services that are not idempotent reads.

## Never-allowed

These are absolute. No skill, no hook, no prompt may bypass them:

- Force-push to `master`, `main`, `production`, or `staging`.
- Direct read of secret values from `.env` (the agent reads `.env.example` for shape; production secrets live only in the deploy platform).
- Disabling hooks (`--no-verify` on commit, removing entries from `.claude/settings.json` without approval).
- Modifying this file (`permissions.md`) from a skill or hook.
- Modifying `.gaia/protocols/delegation.md` from a skill or hook.
- Deleting `.gaia/audit/*.jsonl` files (audit is append-only).
- Editing existing entries in `.gaia/memory/episodic/*.jsonl` (episodic is append-only).
- Bypassing the principles review (`d-review`) before correctness review (vision §W9).
