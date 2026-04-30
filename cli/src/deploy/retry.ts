// cli/src/deploy/retry.ts — exponential backoff (AD-AP-5: 1s / 4s / 16s).
//
// 3-attempt cap (founder spec Q1=B). After cap, surface to user with
// `bun gaia explain E3099_DEPLOY_UNKNOWN`.

export const MAX_ATTEMPTS = 3
export const BACKOFF_MS = [1000, 4000, 16000] as const

export type RetryOutcome<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; lastError: Error; attempts: number }

export type RetryOptions<T> = {
  /** The operation to attempt; throws on failure. */
  attempt: () => Promise<T>
  /** Called between attempts — return false to abort retry. */
  shouldRetry?: (error: Error, attemptNumber: number) => boolean
  /** Test seam for sleep — defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Run an async operation with exponential backoff. Returns RetryOutcome —
 * does not throw on cap exhaustion; the caller decides how to surface.
 */
export async function withBackoff<T>(opts: RetryOptions<T>): Promise<RetryOutcome<T>> {
  const sleep = opts.sleep ?? defaultSleep
  let lastError: Error = new Error('no attempts made')

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- retries are sequential by design
      const value = await opts.attempt()
      return { ok: true, value, attempts: i + 1 }
    } catch (e) {
      lastError = e as Error
      if (opts.shouldRetry && !opts.shouldRetry(lastError, i + 1)) {
        return { ok: false, lastError, attempts: i + 1 }
      }
      if (i < MAX_ATTEMPTS - 1) {
        // eslint-disable-next-line no-await-in-loop -- backoff between attempts is by design
        await sleep(BACKOFF_MS[i] ?? 16000)
      }
    }
  }

  return { ok: false, lastError, attempts: MAX_ATTEMPTS }
}
