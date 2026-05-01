// scripts/smoke-dev-boot.ts — verify `bun dev` actually serves HTTP 200.
//
// Why this exists: 0.3.0 → 0.3.2 all shipped with the SSR module-graph
// broken (every route returned 503 from `bun dev`) because no check in
// the pre-merge chain ever booted the server and curled it. The
// scaffolder's QA passes covered file laydown but never the runtime
// layer below. This script closes that gap.
//
// Run: bun scripts/smoke-dev-boot.ts (or `bun run smoke:dev`)
// Wired into: `bun run check` as the last stage (after types + tests).
// Default port 3210 to avoid colliding with a running dev server on 3000;
// override with SMOKE_DEV_PORT.
//
// Behavior:
//   1. Spawn `bun run dev` with a per-run port (via PORT env) to avoid
//      collisions with a running dev server.
//   2. Poll `/` until it returns a non-503 status or BOOT_TIMEOUT_MS
//      elapses. 200 / 3xx / 4xx all count as "the server actually
//      booted" — only 503 (the SSR-error fallback vinxi serves) and
//      connect-refused fail the smoke.
//   3. Kill the dev process and exit 0/1.
//
// Exit codes: 0 success, 1 boot fail or timeout, 2 unexpected error.

import { spawn } from 'node:child_process'

const BOOT_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 500
const PORT = Number(process.env.SMOKE_DEV_PORT ?? '3210')
const URL = `http://localhost:${PORT}/`

function log(line: string): void {
  process.stderr.write(`[smoke-dev-boot] ${line}\n`)
}

async function probe(url: string): Promise<{ status: number } | { error: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    })
    return { status: res.status }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function main(): Promise<number> {
  log(`spawning bun run dev on PORT=${PORT}`)
  const child = spawn('bun', ['run', 'dev'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })

  const cleanup = (): void => {
    if (!child.killed) {
      try {
        child.kill('SIGTERM')
      } catch {
        /* already dead */
      }
    }
  }
  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })

  const deadline = Date.now() + BOOT_TIMEOUT_MS
  let lastErr = ''
  while (Date.now() < deadline) {
    const result = await probe(URL)
    if ('status' in result) {
      if (result.status === 503) {
        lastErr = `HTTP 503 — vinxi served the SSR error fallback (likely a module-graph or SSR config bug)`
      } else {
        log(`✓ boot OK — ${URL} returned HTTP ${result.status} in ${BOOT_TIMEOUT_MS - (deadline - Date.now())}ms`)
        cleanup()
        return 0
      }
    } else {
      lastErr = result.error
    }
    await Bun.sleep(POLL_INTERVAL_MS)
  }

  cleanup()
  log(`✗ boot FAILED after ${BOOT_TIMEOUT_MS}ms — ${lastErr}`)
  if (stderr.length > 0) {
    log(`--- last stderr (truncated) ---\n${stderr.slice(-1500)}`)
  }
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    log(`unexpected error: ${(err as Error).message}`)
    process.exit(2)
  })
