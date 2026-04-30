---
name: Bug report
about: Report a bug in Gaia (template, CLI, or harness)
title: ''
labels: bug
assignees: ''
---

## Describe the bug

A clear description of what the bug is. If the CLI emitted an error code (E####), include it and the output of `bun gaia explain E####`.

## Steps to reproduce

1. ...
2. ...
3. ...

## Expected behavior

What you expected to happen.

## Environment

- OS: [e.g. macOS 15.2 / Ubuntu 24.04]
- Bun version: [output of `bun --version`]
- Gaia CLI version: [output of `bun gaia --version`, if installed]
- Provider(s) involved: [e.g. Polar / Resend / Neon / Railway / Better Auth — tick any that apply]

## Logs / state

Paste the relevant NDJSON event stream from `cli/state.json` or the failing verb's stderr. Redact secrets — `state.json` should already only hold env-var names, not values.
