// cli/src/state.ts — state.json IO with atomic write + file lock.
//
// AD-AP-2 + AD-AP-18:
//   - Schema is TypeBox v1; deviations rejected by `validate()`.
//   - Atomic write via tmp+rename (POSIX guarantees rename atomicity on same fs).
//   - File lock prevents two `bun gaia ...` processes from corrupting state.
//   - state.json holds env-var NAMES only. Validated by
//     scripts/check-state-json-no-secrets.ts.
//
// state.json default location: <project>/.gaia/state.json. Override via
// --state-file=<path> (developer escape hatch).

import { Value } from '@sinclair/typebox/value'
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { dirname, join } from 'node:path'

import { StateSchemaV1, type StateV1 } from './state.schema.ts'

const LOCK_TIMEOUT_MS = 5000
const LOCK_POLL_MS = 50

/** @public */
export type LoadResult =
  | { ok: true; state: StateV1 }
  | { ok: false; error: string; reason: 'not-found' | 'corrupted' | 'schema-mismatch' }

export function defaultStatePath(projectDir: string): string {
  return join(projectDir, '.gaia', 'state.json')
}

export function load(path: string): LoadResult {
  if (!existsSync(path)) {
    return { ok: false, error: `state.json not found at ${path}`, reason: 'not-found' }
  }
  let raw: string
  try {
    raw = readFileSync(path, 'utf-8')
  } catch (e) {
    return {
      ok: false,
      error: `cannot read ${path}: ${(e as Error).message}`,
      reason: 'corrupted',
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return {
      ok: false,
      error: `${path} is not valid JSON: ${(e as Error).message}`,
      reason: 'corrupted',
    }
  }
  if (!Value.Check(StateSchemaV1, parsed)) {
    const errors = [...Value.Errors(StateSchemaV1, parsed)].slice(0, 3)
    const first = errors.map((err) => `${err.path} ${err.message}`).join('; ')
    return {
      ok: false,
      error: `state.json schema mismatch: ${first}. Run \`bun create gaia-app@latest <slug> --force\` to recreate, or hand-edit \`.gaia/state.json\` to match version 1.`,
      reason: 'schema-mismatch',
    }
  }
  return { ok: true, state: parsed }
}

/**
 * Atomically write state.json. Uses tmp file + rename for crash safety.
 * The lockfile prevents concurrent CLI processes from clobbering.
 */
export async function save(path: string, state: StateV1): Promise<void> {
  // Validate before writing — fail fast on schema drift.
  if (!Value.Check(StateSchemaV1, state)) {
    const errors = [...Value.Errors(StateSchemaV1, state)].slice(0, 3)
    const first = errors.map((err) => `${err.path} ${err.message}`).join('; ')
    throw new Error(`refusing to save invalid state: ${first}`)
  }

  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  // Sweep stale tmp files from prior crashes (#26 / RT-6).
  sweepStaleTmpFiles(dir, path)

  const lockPath = `${path}.lock`
  await acquireLock(lockPath)

  try {
    const tmp = `${path}.tmp.${process.pid}`
    // Write + fsync (#30 / RT-17) so a power loss between write and rename
    // cannot leave a zero-length state.json.
    const fd = openSync(tmp, 'w')
    try {
      const buf = Buffer.from(`${JSON.stringify(state, null, 2)}\n`)
      writeSync(fd, buf, 0, buf.length, 0)
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tmp, path)
  } finally {
    releaseLock(lockPath)
  }
}

/** Sweep orphan `state.json.tmp.*` files left behind by crashed processes (#26). */
function sweepStaleTmpFiles(dir: string, statePath: string): void {
  const baseName = statePath.split('/').pop() ?? 'state.json'
  try {
    for (const entry of readdirSync(dir)) {
      if (!entry.startsWith(`${baseName}.tmp.`)) continue
      const pidPart = entry.slice(`${baseName}.tmp.`.length)
      const pid = Number.parseInt(pidPart, 10)
      if (!Number.isFinite(pid) || pid <= 0) continue
      // Only delete if the process is gone — never clobber a running peer's tmp.
      try {
        process.kill(pid, 0)
        // Process is alive; skip.
      } catch {
        try {
          unlinkSync(join(dir, entry))
        } catch {
          /* race: someone else cleaned it up */
        }
      }
    }
  } catch {
    /* dir may not exist yet on first save */
  }
}

/**
 * Acquire the state.json.lock — writes our PID, detects stale locks (PID dead),
 * cleans them up, and retries. RT-5: a kill -9 used to leave a permanent lockfile;
 * now subsequent invocations recover automatically.
 */
async function acquireLock(lockPath: string): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      const fd = openSync(lockPath, 'wx')
      // Write our PID so future processes can detect staleness.
      const buf = Buffer.from(`${process.pid}\n`)
      writeSync(fd, buf, 0, buf.length, 0)
      closeSync(fd)
      // Register a SIGINT/SIGTERM handler that releases the lock on exit so we
      // don't leak it when the user Ctrl-Cs mid-flow.
      installLockCleanup(lockPath)
      return
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      // Lock exists. Read the PID and check if the holder is alive.
      try {
        const pidStr = readFileSync(lockPath, 'utf-8').trim()
        const pid = Number.parseInt(pidStr, 10)
        if (Number.isFinite(pid) && pid > 0) {
          try {
            // signal 0 doesn't kill — just probes for existence.
            process.kill(pid, 0)
          } catch {
            // Process is gone — stale lock, clean it up and retry immediately.
            try {
              unlinkSync(lockPath)
            } catch {
              /* race: another process may have done this */
            }
            continue
          }
        }
      } catch {
        /* lockfile may have been deleted between our open() and read() — retry */
      }
      // eslint-disable-next-line no-await-in-loop -- backoff is sequential by design
      await sleep(LOCK_POLL_MS)
    }
  }
  throw new Error(
    `could not acquire ${lockPath} within ${LOCK_TIMEOUT_MS}ms — if no other gaia process is running, \`rm ${lockPath}\` and retry`,
  )
}

const installedLockCleanup = new Set<string>()
function installLockCleanup(lockPath: string): void {
  if (installedLockCleanup.has(lockPath)) return
  installedLockCleanup.add(lockPath)
  const cleanup = () => releaseLock(lockPath)
  process.once('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.once('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })
  process.once('exit', cleanup)
}

function releaseLock(lockPath: string): void {
  try {
    unlinkSync(lockPath)
  } catch {
    /* lock already gone — fine */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Update state via a pure functional update. Reads, applies, validates, writes —
 * all under the lock.
 */
export async function update(
  path: string,
  updater: (current: StateV1) => StateV1,
): Promise<StateV1> {
  const loaded = load(path)
  if (!loaded.ok) throw new Error(`state mutation refused — ${loaded.error}`)
  const next = updater(loaded.state)
  await save(path, next)
  return next
}
