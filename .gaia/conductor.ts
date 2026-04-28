// .gaia/conductor.ts — thin Bun TypeScript loop (vision §H1)
//
// The conductor reads files, calls tools, writes logs, runs hooks. It does
// not reason. Intelligence lives in skills and the model; the conductor's
// only job is to make the four substrate modules — memory, skills,
// protocols, audit — work together.
//
// Target: ~200 LOC. If this file grows past 500, intelligence has leaked
// into the wrong layer and must be pushed back into skills.
//
// v1 status: skeleton. Real conductor implementation lands in a later phase
// once the protocols/tool-schemas and rules.ts are wired up.

import { type Rule, rules } from './rules.ts'

export type LoopInput = {
  /** Path to the working memory snapshot for this task. */
  working: string
  /** Path to the episodic memory log. */
  episodic: string
  /** Path to per-developer personal memory. */
  personal: string
}

export type LoopOutput = {
  /** Rules that fired during this loop tick. */
  enforced: readonly Rule['id'][]
  /** Append-only audit entries written this tick. */
  auditEntries: number
}

/**
 * One tick of the harness loop. Reads context, evaluates rules, writes audit,
 * returns a structured result. Does not call the model directly.
 *
 * v1: stub. The full implementation is gated on the typed tool-schemas
 * landing under `.gaia/protocols/tool-schemas/`.
 */
export function tick(_input: LoopInput): LoopOutput {
  return {
    enforced: rules.map((r) => r.id),
    auditEntries: 0,
  }
}
