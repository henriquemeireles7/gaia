// cli/src/providers/types.ts — adapter `.verify()` contract (AD-AP-7).
//
// The CLI is standalone-publishable, so it cannot import from packages/adapters/*.
// Instead, the CLI defines its own minimal verifiers and exports the same shape
// (VerifyResult) that packages/adapters/* will adopt independently. The shape
// is the contract; both surfaces conform.

export type VerifyResult = {
  ok: boolean
  /** Provider name — matches the keys in StateV1.verified. */
  provider: 'polar' | 'resend' | 'neon' | 'railway'
  /** Account / project / database identifier as the provider returns it (best-effort). */
  account_id?: string
  /** Scopes / capabilities the token has. */
  scopes: readonly string[]
  /** Soft warnings — strings the user should know but that don't fail the verify. */
  warnings: readonly string[]
  /**
   * Per F-10: when true, the verb fails fast. When false, the warning is recorded
   * but TTFD continues (e.g. Polar pending merchant verify, Resend domain pending).
   */
  ttfd_blocking: boolean
  /** Free-form error context if ok=false. */
  error?: { code: string; message: string }
}

/**
 * Structural fetch type — narrower than `typeof fetch` so test mocks don't need
 * to implement `preconnect`. Accepts string | URL | Request and an optional init.
 */
export type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/**
 * Function shape every provider verifier exports. Tests inject `fetcher` to
 * avoid real HTTP. The CLI uses the global `fetch`.
 */
export type Verifier = (input: { token: string; fetcher?: Fetcher }) => Promise<VerifyResult>

/**
 * Setup-time metadata each provider exports for the interactive `bun gaia setup`
 * verb. Co-located with the verifier so adding a provider is a single-file change
 * (#22). signupUrl is shown to first-time users; tokenPath tells returning users
 * where the existing key lives.
 */
export type ProviderSetupInfo = {
  signupUrl: string
  tokenPath: string
  description: string
}
