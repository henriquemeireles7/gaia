# Roadmap

> Period: 2026-Q2. Last updated: 2026-04-27.

NCT-hybrid (vision §W7). Locked taxonomy.

## Narrative

Gaia is in the bootstrap phase. The repo just split from kaz-setup ("Douala") and is being rebuilt onto the v6 vision stack. Initiative 001 (gaia-bootstrap) lays the structural foundation; initiative 002 (gaia-v1-launch-hardening) takes that foundation into a public OSS launch with security, best-practices, and DX hardening pre-applied. The work is no longer purely structural — it's now structural + launch-readiness.

## Commitments

The outcomes we are committing to this period:

1. **A working Gaia v6 template that clones, installs, and runs.** Single command from clone to dev server.
2. **A discoverable, enforceable harness.** Every reference principle has a mechanism (lint, hook, script, or CI gate).
3. **A credible public OSS launch on the Lovable-graduate ICP.** First 5 minutes don't break; security + claim hygiene + onboarding pass cross-model review.

## Committed initiatives

| #   | ID                                  | Title                                           | Hypothesis                                                                                                                                                                | Status                                           |
| --- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 001 | 2026-04-27-gaia-bootstrap           | kaz-setup → Gaia v6 migration                   | Migrating in 6 phased PRs lets us ship value at every step instead of one big-bang rewrite.                                                                               | active                                           |
| 002 | 2026-04-27-gaia-v1-launch-hardening | Gaia v1 OSS launch + Boil-20% runtime hardening | The no-code-to-real-code segment will adopt a real-code, agent-native, opinionated SaaS template if it ships in working state on day 1 with first 5 min that don't break. | approved (depends on 001 substantially complete) |

## Parked

_(none yet)_

## Rejected

_(none yet)_
