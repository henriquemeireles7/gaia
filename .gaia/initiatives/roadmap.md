# Roadmap

> Period: 2026-Q2. Last updated: 2026-04-27.

NCT-hybrid (vision §W7). Locked taxonomy.

## Narrative

Gaia is in the bootstrap phase. The repo split from kaz-setup ("Douala") and rebuilt onto the v6 vision stack across Phases 1–8 (PRs #8 → #18). The structural substrate is now in place. **Initiative 001 (gaia-bootstrap) is reframed:** no longer "the migration" (already done) but the substantive completion of the template — UI, backend, providers, admin, and a guided first-cycle `/d-onboard` skill — so a developer goes from `git clone` to a deployed public URL in 30 minutes. **Initiative 002 (gaia-v1-launch-hardening)** then takes the v1.0 template and makes its public OSS launch credible (security review, claim hygiene, marketing, distribution). A future initiative (TBD, see Open Question #1 in 001) covers the open-source self-hostable deployment platform reframed by the founder on 2026-04-28.

## Commitments

The outcomes we are committing to this period:

1. **A working Gaia v6 template that clones, installs, and deploys to a public URL in 30 minutes.** Single skill (`/d-onboard`) walks the developer from `git clone` through GitHub setup, API-key collection, first commit, and Railway deploy. Ships MIT.
2. **A discoverable, enforceable harness.** Every reference principle has a mechanism (lint, hook, script, or CI gate).
3. **A credible public OSS launch on the Lovable-graduate ICP.** First 5 minutes don't break; security + claim hygiene + onboarding pass cross-model review.

## Committed initiatives

| #   | ID                                  | Title                                            | Hypothesis                                                                                                                                                                                                                                                            | Status                                                              |
| --- | ----------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 001 | 2026-04-27-gaia-bootstrap           | Gaia v1 template — clone-to-deploy in 30 minutes | A complete, MIT, opinionated TypeScript SaaS template + a single guided skill (`/d-onboard`) that takes a Lovable-graduate from `git clone` to a deployed public URL in ≤30 wall-clock minutes is the wedge that gets the no-code-to-real-code segment to adopt Gaia. | draft (v1, awaiting hardening pass)                                 |
| 002 | 2026-04-27-gaia-v1-launch-hardening | Gaia v1 OSS launch + Boil-20% runtime hardening  | The no-code-to-real-code segment will adopt a real-code, agent-native, opinionated SaaS template if it ships in working state on day 1 with first 5 min that don't break.                                                                                             | approved (depends on 001 v1.0 tagged); needs framing reconciliation |

## Parked

_(none yet)_

## Rejected

_(none yet)_
