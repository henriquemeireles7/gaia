# Launch checklist — v1.0 founder gate

The 0002 hypothesis is single-founder, clean-machine, ≤30 min TTFD on first attempt. This page is the checklist the founder runs before tagging v1.0 (Q6=A, AD-AP-6).

## Pre-launch — clean machine setup

The founder cannot run from the dev workstation. P4 of the falsifier was specifically tightened to require:

- [ ] **Fresh macOS guest user account** (System Settings → Users → +). No `~/.bashrc`, no `~/.zshrc`, no SSH keys, no GitHub auth.
- [ ] **No Brew, no Volta, no nvm.** If they're already installed, the test is invalid — that's a contaminated environment.
- [ ] **Bun installed via curl**, not via Brew: `curl -fsSL https://bun.sh/install | bash`.
- [ ] **Fresh Polar / Resend / Neon / Railway accounts.** Use sub-addressed email (`founder+gaia-launch@…`) so accounts are net-new.
- [ ] **Claude Code subscription active** on the test account.
- [ ] **Screen recording tool** ready (QuickTime, OBS, or `vhs`). The launch needs visual evidence.

## The run

Open a terminal in the fresh user's home directory.

```bash
# 1. Start the recording.
# 2. Note start time:
date

# 3. Run the scaffolder.
bun create gaia-app@latest weekend-saas
cd weekend-saas
claude
# Then in Claude: "set me up"

# 4. The agent should run, in order:
#    - bun gaia verify-keys
#    - bun gaia deploy   (with d-fail self-heal if it falls)
#    - bun gaia smoke

# 5. Note end time:
date

# 6. Stop the recording.
```

## Acceptance criteria (founder-only gate)

- [ ] **TTHW-1 < 1000ms** — the green "▶ GAIA — 30-min clock started" banner appeared on screen within 1 second of `bun create` invocation.
- [ ] **TTFD ≤ 30 min** — the celebration banner with the live Railway URL printed within 30 wall-clock minutes of `bun create` invocation.
- [ ] **Auth flow live** — `https://weekend-saas.up.railway.app/sign-up` accepts an email + password and creates a session. (Pending Polar merchant verification is acceptable per F-10.)
- [ ] **state.json validates** — open `.gaia/state.json` and confirm `version: 1`, `last_step: smoke.complete`, `next_step: launch`.
- [ ] **No documentation lookups** — the founder did not have to leave the terminal narration to recover from any failure (per the falsifier).

If any criterion fails: **do not tag v1.0**. Instead:

1. File a GitHub issue with the failing assertion + the `bun gaia explain E####` output.
2. Fix in a follow-up PR.
3. Re-run the full clean-machine flow.

If all pass: continue to "Post-launch tasks" below.

## Post-launch tasks (after green run)

- [ ] **README book-end rewrite.** Replace the speculative timing in [`README.md`](../README.md) with the actual founder-run timing (TTHW-1 ms, TTFD min:sec).
- [ ] **`docs/assets/demo.gif`.** Render via `vhs docs/assets/demo.tape` and replace `docs/assets/hero.svg` reference in README.
- [ ] **GitHub topics.** Set `gaia`, `saas-template`, `agent-native`, `claude-code`, `bun`, `typescript` via the repo settings page or `gh repo edit --add-topic`.
- [ ] **Open Graph card.** Render the README's first viewport to `docs/assets/og.png` (1200×630). Confirm GitHub social-preview shows it.
- [ ] **Tag v1.0.** `git tag v1.0.0 && git push --tags`. Update `package.json` to `1.0.0`.
- [ ] **npm publish at v1.0.** Bump `cli/package.json` to `1.0.0` and `cd cli && npm publish`. The `bun create gaia` invocation already resolves to `create-gaia-app` on npm — v1.0 is just the stability mark.
- [ ] **Public-flip the repo.** From private to public. Confirm CI still works (the secret-scoped jobs may need adjustments).
- [ ] **PostHog dashboard.** Bookmark a dashboard tracking `cli.first_run` distribution over the next 14 days. This is the post-launch signal that catches what the single-founder run misses.

## Smoke test cleanup (manual for v0.2)

`bun gaia smoke` creates a real user on the deployed app to verify the auth
round-trip. Email and password are randomized per run (`smoke+<runid>@gaia.test`

- random hex password) so collisions don't happen and credentials cannot be
  reused — but the user persists.

Until we ship a server-side `/smoke/cleanup` endpoint (gated by
`GAIA_SMOKE_ENABLED=true`) in initiative 0003, the founder must manually
delete `@gaia.test` users after the launch run:

```sql
-- in psql or Drizzle Studio
DELETE FROM users WHERE email LIKE '%@gaia.test';
```

Track deletion in your launch checklist below.

## What's NOT in launch (deferred to 0003)

Per the locked cap table:

- ❌ Show HN thread, X thread queue, marketing post.
- ❌ External alpha session recruitment.
- ❌ Admin v0.1, content v0.1, AI demo feature.
- ❌ Multi-tenancy, MFA/SSO, full security audit.
- ❌ Native Windows support.

These all live in 0003 (Gaia Launch Hardening). Don't slip them into 0002.

## Restoring from the autoplan restore point

If something gets broken between now and the v1.0 tag and the reasoning history matters, the autoplan restore point captured before scope hardening lives at:

```
~/.gstack/projects/henriquemeireles7-gaia/0002-bootstrap-autoplan-restore-20260429-005215.md
```

Read it before reverting — it documents the pre-hardening state that was deliberately replaced by the 28-row decision audit trail in [`.gaia/initiatives/0002-gaia-bootstrap/initiative.md`](../.gaia/initiatives/0002-gaia-bootstrap/initiative.md).
