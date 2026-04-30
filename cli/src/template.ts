// cli/src/template.ts — produce a working copy of the Gaia template (PR 2 finish).
//
// Two modes:
//   1. **In-source** — running from inside a Gaia repo checkout (e.g.
//      `bun /path/to/gaia/cli/src/create.ts myapp`). Copy the repo's
//      template tree directly. Used for local dev + CI.
//   2. **Published** — `bun create gaia-app@latest myapp` from npm. Either the
//      tarball ships a `template/` dir we copy from, OR we `git clone`
//      the upstream repo at v1.0 tag. v1 ships the git-clone path; the
//      bundled-tarball path is a future optimization.
//
// After either mode lays down the tree, the scaffolder overlays
// (.gitignore-first, empty .env.local, state.json) are applied on top by
// cli/src/create.ts.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GIT_CLONE_TIMEOUT_MS = 60_000

const UPSTREAM = 'https://github.com/henriquemeireles7/gaia.git'

/** Files / folders excluded when copying the in-source template. */
const EXCLUDE_PATHS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.vinxi',
  '.output',
  '.context',
  // Initiative + autoplan transcripts shouldn't ship to consumer apps.
  '.gaia/initiatives',
  '.gaia/memory',
  // Per-machine artifacts that may contain user-specific data.
  '.gaia/state.json',
  '.gaia/last-verify.json',
  '.gaia/last-deploy-failure.log',
  '.gaia/last-smoke.json',
  // Test fixtures + per-machine state.
  'cli/test',
  // Conductor + Claude per-machine working state.
  '.claude/projects',
  // SECRET LEAKAGE PREVENTION (S-1): if the developer is running from inside a
  // populated Gaia checkout, never copy their .env files into the new project.
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
])

// Glob-based exclusions catch anything matching node_modules/.git/dist/.vinxi/
// .output/.context AT ANY DEPTH, plus any .env.* file regardless of suffix.
const EXCLUDE_GLOB =
  /(^|\/)(node_modules|\.git|dist|\.vinxi|\.output|\.context)(\/|$)|(^|\/)\.env(\.|$)/

export type TemplateMode = 'in-source' | 'git-clone' | 'unavailable'

/** @public */
export type TemplateInput = {
  targetDir: string
  /** Override for tests: where to copy from in in-source mode. */
  sourceRoot?: string
  /** Override for tests: skip the actual git clone (returns mode=git-clone, no I/O). */
  skipGitClone?: boolean
}

/** @public */
export type TemplateResult = {
  mode: TemplateMode
  filesCopied: number
  warning?: string
}

/**
 * Detect whether we're running from inside a Gaia repo checkout. Returns the
 * repo root if yes, null if no. Two-step gate (#37 / RT-24):
 *   1. The script path itself must be INSIDE the candidate root (not just
 *      walking down from any parent — that produced false detections when
 *      a developer ran `bun create` from a path that happened to be inside
 *      another Gaia checkout).
 *   2. The candidate root must contain the cli/+apps/+packages/+.gaia triad.
 */
export function detectInSourceRoot(scriptPath: string): string | null {
  const startDir = dirname(scriptPath)
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    const hasGaiaTriad =
      existsSync(join(dir, 'cli')) &&
      existsSync(join(dir, 'apps')) &&
      existsSync(join(dir, 'packages')) &&
      existsSync(join(dir, '.gaia'))
    // Tightened (#37): only accept this dir as a Gaia root if our script path is
    // actually under it. Without this guard, a script in
    // /Users/x/.bun/install/global/...gaia/cli/src/template.ts could still
    // detect the project at /Users/x/code/some-other-gaia/ because the walk-up
    // would pass through it.
    const scriptIsInside = startDir.startsWith(dir + '/') || startDir === dir
    if (hasGaiaTriad && scriptIsInside) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * Recursively copy every file under `from` into `to`, skipping anything
 * matching EXCLUDE_PATHS or EXCLUDE_GLOB. Pure async — uses fs.promises.
 */
async function copyTree(from: string, to: string, root: string): Promise<number> {
  let count = 0
  await mkdir(to, { recursive: true })
  const entries = await readdir(from, { withFileTypes: true })
  for (const entry of entries) {
    const src = join(from, entry.name)
    const dst = join(to, entry.name)
    const rel = relative(root, src)
    if (EXCLUDE_PATHS.has(rel) || EXCLUDE_PATHS.has(entry.name)) continue
    if (EXCLUDE_GLOB.test(rel)) continue
    if (entry.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop -- recursive copy is sequential by nature
      count += await copyTree(src, dst, root)
    } else if (entry.isFile()) {
      // eslint-disable-next-line no-await-in-loop
      await copyFile(src, dst)
      count++
    }
    // Skip symlinks + sockets + other types intentionally.
  }
  return count
}

/**
 * Lay down a working template tree at `targetDir`. The scaffolder overlays
 * (.gitignore, .env.local, state.json) are applied AFTER this returns.
 */
export async function layDownTemplate(input: TemplateInput): Promise<TemplateResult> {
  const scriptPath = fileURLToPath(import.meta.url)
  const inSourceRoot = input.sourceRoot ?? detectInSourceRoot(scriptPath)

  if (inSourceRoot) {
    if (!existsSync(input.targetDir)) {
      mkdirSync(input.targetDir, { recursive: true })
    }
    const filesCopied = await copyTree(inSourceRoot, input.targetDir, inSourceRoot)
    return { mode: 'in-source', filesCopied }
  }

  // Published mode — try `git clone --depth 1`. Fails gracefully if the repo
  // is not yet public or git is not installed. Async with a 60s timeout
  // (RT-14) — the previous execFileSync could hang the event loop indefinitely.
  if (input.skipGitClone) {
    return { mode: 'git-clone', filesCopied: 0 }
  }
  try {
    await runGitClone(UPSTREAM, resolve(input.targetDir))
    // Count files that landed (best-effort — walk top level).
    let count = 0
    if (existsSync(input.targetDir)) {
      const walkCount = (dir: string): number => {
        let local = 0
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (EXCLUDE_PATHS.has(entry.name)) continue
          if (entry.isDirectory()) {
            local += walkCount(join(dir, entry.name))
          } else if (entry.isFile()) {
            local++
          }
        }
        return local
      }
      count = walkCount(input.targetDir)
    }
    return { mode: 'git-clone', filesCopied: count }
  } catch (err) {
    return {
      mode: 'unavailable',
      filesCopied: 0,
      warning: `Could not lay down a working template (in-source detection failed AND git clone of ${UPSTREAM} failed: ${(err as Error).message.slice(0, 200)}). Only the scaffolder overlays will be written. Manually clone the upstream repo and copy the overlays in.`,
    }
  }
}

/**
 * Async wrapper around `git clone --depth 1` with a 60s timeout (RT-14).
 * Resolves on success, rejects on non-zero exit, missing git binary, or timeout.
 */
function runGitClone(upstream: string, target: string): Promise<void> {
  return new Promise((resolveCb, rejectCb) => {
    const child = spawn('git', ['clone', '--depth', '1', upstream, target], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      rejectCb(new Error(`git clone timed out after ${GIT_CLONE_TIMEOUT_MS}ms`))
    }, GIT_CLONE_TIMEOUT_MS)
    child.on('error', (err) => {
      clearTimeout(timer)
      rejectCb(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolveCb()
      else rejectCb(new Error(`git clone exited ${code}: ${stderr.slice(0, 300)}`))
    })
  })
}
