---
name: qa
description: "Systematically QA test a web application. Three tiers: Quick (critical/high), Standard (+ medium), Exhaustive (+ cosmetic). Triggers: 'qa', 'test the site', 'find bugs'."
---

# qa — web app QA testing

> **Status:** vendored placeholder. The full skill body is tracked in the `gstack-vendor` initiative.

## What this does

Drives a headless browser through the app's golden paths and edge cases, capturing screenshots, console errors, and behavioral diffs. Three tiers depending on time budget:

- **Quick** — critical and high-severity bugs only.
- **Standard** — adds medium-severity.
- **Exhaustive** — adds cosmetic issues.

Produces a before/after health score, fix evidence, and a ship-readiness summary.

## Pipeline

`/ship → qa (post-deploy canary) → land-and-deploy verification`

## Verify

QA report includes: tested URLs, found issues by severity, screenshots, repro steps. Issues without repro steps are not actionable.
