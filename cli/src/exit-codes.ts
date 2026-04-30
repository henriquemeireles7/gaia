// cli/src/exit-codes.ts — POSIX exit-code taxonomy.
//
// This file is a deliberate duplicate of `.gaia/protocols/cli.ts:ExitCode`.
// The CLI is standalone-publishable (cli/CLAUDE.md) so it cannot import from
// `.gaia/protocols/`; both must stay in sync — covered manually until
// `scripts/check-typebox-derivation.ts` is extended to assert byte-equality.

export const ExitCode = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  EX_USAGE: 64,
  EX_DATAERR: 65,
  EX_UNAVAILABLE: 69,
  EX_SOFTWARE: 70,
  EX_TEMPFAIL: 75,
  EX_NOPERM: 77,
  EX_CONFIG: 78,
} as const

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode]
