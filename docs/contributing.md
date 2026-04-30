# Contributing

Gaia is agent-native first, human-friendly second. Most contributors will work alongside an AI agent — the methodology is built around that. This doc covers both the agent path and the manual path.

## Working with skills

Every recurring multi-phase procedure in Gaia is a skill at `.claude/skills/<skill>/`. Each ships with `SKILL.md` (the procedure) and `reference.md` (the principles).

| Trigger                                  | Skill                                                           | What it produces                                           |
| ---------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Start a strategic bet                    | `d-initiative`                                                  | A 5-section initiative.md with PR breakdown + audit trail. |
| Implement a project (TDD)                | `d-code`                                                        | Code that makes acceptance criteria pass.                  |
| Write content (blog, handbook, social)   | `d-content`                                                     | Branded prose against the voice reference.                 |
| Pre-commit principles review             | `d-review`                                                      | A pass/fail report + auto-fixes.                           |
| Deploy after gstack /ship                | `d-deploy`                                                      | A green Railway deploy + d-fail recovery.                  |
| Audit security / AI / DX / UX / obs / ax | `d-security`, `d-ai`, `d-dx`, `d-ux`, `d-observability`, `d-ax` | A scored report.                                           |
| Author a new SKILL.md or reference.md    | `d-skill`, `d-reference`                                        | The file itself, validated.                                |

Run a skill from Claude Code with `/<skill-name>`. Most skills are interactive; a few (`d-review`, `d-health`) are report-only.

## Pulling upstream changes

Gaia is a template — you fork it and own your copy. To pull improvements from `upstream`:

```bash
git remote add upstream https://github.com/henriquemeireles7/gaia.git
git fetch upstream
git merge upstream/master --no-ff
```

Resolve conflicts as you would on any branch. The `--no-ff` keeps the merge auditable. We commit to **semver from v1.0+**; major bumps come with a migration note in [`CHANGELOG.md`](../CHANGELOG.md).

Pre-launch (today), there is **no backwards compatibility** — the schema, methodology, and CLI surface change freely. After v1.0, breaking changes require a deprecation cycle.

## Reporting bugs

Use [`.github/ISSUE_TEMPLATE/bug_report.md`](../.github/ISSUE_TEMPLATE/bug_report.md). Include the CLI error code (`E####_DESCRIPTIVE`) and the output of `bun gaia explain <code>` if the CLI emitted one. Paste a redacted excerpt of `state.json` (it should already only hold env-var names — confirm by reading the file).

## Submitting a pull request

```bash
# 1. Create a branch
git checkout -b feat/your-feature

# 2. Make changes
# (your AI agent will likely handle this via /d-code)

# 3. Run the local check before commit
bun run check       # lint + format + ast + types + harden + scripts + test

# 4. Commit + push
git commit -m "feat: ..."
git push origin feat/your-feature

# 5. Open the PR
gh pr create
```

The PR template ([`.github/pull_request_template.md`](../.github/pull_request_template.md)) asks for:

- The initiative + PR row (e.g. `0002-gaia-bootstrap PR 5`).
- A test plan checking `bun run check` passes + a manual smoke step.
- Screenshots for UI changes; an asciinema or vhs recording for CLI changes.

CI runs the full `bun run check` plus security scans (gitleaks, osv-scanner, semgrep) on every PR.

## Running the e2e fresh-clone matrix locally

```bash
bun scripts/e2e-fresh-clone.ts
```

This is what the GitHub Actions matrix runs on `ubuntu-latest` and `macos-latest`. Six assertions confirm the scaffolder + dispatcher produce a valid project tree.

## Architecture rules

A handful of structural rules are enforced by lint / harden, not by review comments. The full list is in [`docs/architecture.md`](./architecture.md). Highlights:

- **Apps depend on packages.** Packages NEVER depend on apps. Lint enforces.
- **`@gaia/<name>` only.** Cross-package imports use the public entry, never relative paths.
- **CLI is standalone.** `cli/` MUST NOT import from `@gaia/*`. The npm tarball works without monorepo context.
- **state.json holds env-var names only.** Never values. Pre-commit hook validates.
- **`.gaia/protocols/cli.ts` is type-only.** Runtime stays in `cli/src/`.

## Voice + content

If you're writing prose (blog, handbook, social), invoke `/d-content` — it reads the brand voice reference at `.claude/skills/d-content/reference.md` and applies it. Don't write content without running it through that skill at least once.

## Where to ask

- Issues: [`https://github.com/henriquemeireles7/gaia/issues`](https://github.com/henriquemeireles7/gaia/issues)
- Discussions (general design questions): same repo, Discussions tab.
- Security: do not file public issues. Email the maintainer (see [`.github/FUNDING.yml`](../.github/FUNDING.yml) for sponsors page; security@ contact lives in the repo description).

## License

All contributions are MIT-licensed. See [`LICENSE`](../LICENSE).
