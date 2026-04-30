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
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GIT_CLONE_TIMEOUT_MS = 60_000

const UPSTREAM = 'https://github.com/henriquemeireles7/gaia.git'

/**
 * Files / folders excluded when laying down the template. Three categories:
 *
 * 1. Generated / runtime — node_modules, dist, .git, etc. Standard.
 * 2. Per-machine state — .env*, .gaia/state.json, .claude/projects. Would
 *    leak the developer's own secrets into the new project.
 * 3. Template tooling — cli/, docs/, CHANGELOG.md, conductor.json. These
 *    exist in the Gaia repo because that's where create-gaia-app is
 *    developed; they are NOT part of what a user gets when scaffolding.
 *
 * Categories (3) is the easy-to-miss one. New maintainers adding a tooling
 * file to the repo root MUST add it here too — every entry below is "yes
 * this is in our repo, no it should not be in user projects."
 */
const EXCLUDE_PATHS = new Set([
  // (1) Generated / runtime
  '.git',
  'node_modules',
  'dist',
  '.vinxi',
  '.output',
  '.context',

  // (2) Per-machine state
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
  '.gaia/state.json',
  '.gaia/last-verify.json',
  '.gaia/last-deploy-failure.log',
  '.gaia/last-smoke.json',
  '.gaia/initiatives',
  '.gaia/memory',
  '.gaia/pglite-data', // mock-mode local DB store (per-project, gitignored)
  '.gaia/sent-emails.jsonl', // mock-mode email audit log (per-project, gitignored)
  '.claude/projects',

  // (3) Template tooling — repo-only, not for user projects
  'cli', // create-gaia-app source — lives in this monorepo, ships to npm separately
  'docs', // template's documentation site, not the user's
  'CHANGELOG.md', // template's release log
  'conductor.json', // local Conductor app workspace metadata
  '.gstack', // /cso security reports + gstack analytics
  '.gaia/audits', // template's own audit history
  'scripts/e2e-fresh-clone.ts', // tests the scaffolder; not for users
])

// Glob-based exclusions catch anything matching node_modules/.git/dist/.vinxi/
// .output/.context/.gstack AT ANY DEPTH, plus any .env.* file regardless of suffix.
const EXCLUDE_GLOB =
  /(^|\/)(node_modules|\.git|dist|\.vinxi|\.output|\.context|\.gstack)(\/|$)|(^|\/)\.env(\.|$)/

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
    // Guard: targetDir must NOT be inside the source root, otherwise copyTree
    // walks into the target it just created → infinite recursion → ENAMETOOLONG.
    // End users running `bun create gaia-app@latest myapp` from /tmp don't hit
    // this (in-source detection fails outside any Gaia checkout, falls through
    // to git-clone). The trap is dev/CI scenarios where someone runs the
    // scaffolder from inside this very repo.
    const targetAbs = resolve(input.targetDir)
    const sourceAbs = resolve(inSourceRoot)
    if (targetAbs === sourceAbs || targetAbs.startsWith(`${sourceAbs}/`)) {
      return {
        mode: 'unavailable',
        filesCopied: 0,
        warning: `targetDir (${input.targetDir}) is inside the Gaia source repo (${inSourceRoot}). In-source scaffolding requires a target OUTSIDE the source tree — run from /tmp or another parent directory. (This guard prevents the copyTree infinite-recursion bug from v0.3.0.)`,
      }
    }
    if (!existsSync(input.targetDir)) {
      mkdirSync(input.targetDir, { recursive: true })
    }
    const filesCopied = await copyTree(inSourceRoot, input.targetDir, inSourceRoot)
    return { mode: 'in-source', filesCopied }
  }

  // Published mode — `git clone --depth 1` into a temp dir, then copyTree
  // into the target so EXCLUDE_PATHS is applied identically to in-source mode.
  // Cloning directly into target would skip exclusions entirely, leaking cli/,
  // docs/, CHANGELOG.md, conductor.json into every scaffolded project (the
  // bug we hit in v0.2.0 — see initiative 0002 retrospective).
  if (input.skipGitClone) {
    return { mode: 'git-clone', filesCopied: 0 }
  }
  const tempBase = mkdtempSync(join(tmpdir(), 'gaia-clone-'))
  const tempClone = join(tempBase, 'gaia')
  try {
    await runGitClone(UPSTREAM, tempClone)
    if (!existsSync(input.targetDir)) {
      mkdirSync(input.targetDir, { recursive: true })
    }
    const filesCopied = await copyTree(tempClone, input.targetDir, tempClone)
    return { mode: 'git-clone', filesCopied }
  } catch (err) {
    return {
      mode: 'unavailable',
      filesCopied: 0,
      warning: `Could not lay down a working template (in-source detection failed AND git clone of ${UPSTREAM} failed: ${(err as Error).message.slice(0, 200)}). Only the scaffolder overlays will be written. Manually clone the upstream repo and copy the overlays in.`,
    }
  } finally {
    // Always clean up the temp clone — succeeds whether the clone+copy worked
    // or failed.
    rmSync(tempBase, { recursive: true, force: true })
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
