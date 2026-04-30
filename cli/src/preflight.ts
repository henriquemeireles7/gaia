// cli/src/preflight.ts — runs before any scaffolding.
//
// Per initiative 0002 AD-AP-24: every failure mode here is a known cliff that
// would otherwise crash the scaffolder mid-flight. Each one exits with a typed
// E1xxx code so `bun gaia explain E####` can give the user a recovery path
// (PR 7 ships the catalog; PR 2 emits the codes).

import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type PreflightInput = {
  /** Bun runtime version, e.g. process.versions.bun. */
  bunVersion: string | undefined
  /** Node platform string, e.g. process.platform. */
  platform: NodeJS.Platform | string
  /** Target directory the scaffolder is about to populate. */
  targetDir: string
  /** True if the user passed --force; allows overwriting an existing dir. */
  force: boolean
}

export type PreflightFailure = {
  code: 'E1001' | 'E1002' | 'E1003' | 'E1004'
  exit: 78 // EX_CONFIG
  message: string
  fix: string
  docsUrl: string
}

const DOCS_BASE = 'https://github.com/henriquemeireles7/gaia#faq'

const MIN_BUN = '1.2.0'

/**
 * Compare two semver-like strings. Returns -1 / 0 / 1.
 * Pragmatic — handles "1.2.3" through "1.2.3-beta" by ignoring the suffix.
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('-')[0]?.split('.').map(Number) ?? []
  const partsB = b.split('-')[0]?.split('.').map(Number) ?? []
  const len = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < len; i++) {
    const x = partsA[i] ?? 0
    const y = partsB[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

export function checkBunVersion(bunVersion: string | undefined): PreflightFailure | null {
  if (!bunVersion) {
    return {
      code: 'E1001',
      exit: 78,
      message: 'Bun runtime not detected. Gaia requires Bun ≥ 1.2.',
      fix: 'Install Bun: curl -fsSL https://bun.sh/install | bash',
      docsUrl: DOCS_BASE,
    }
  }
  if (compareVersions(bunVersion, MIN_BUN) < 0) {
    return {
      code: 'E1001',
      exit: 78,
      message: `Bun ${bunVersion} is too old. Gaia requires Bun ≥ ${MIN_BUN}.`,
      fix: 'Upgrade: curl -fsSL https://bun.sh/install | bash',
      docsUrl: DOCS_BASE,
    }
  }
  return null
}

export function checkPlatform(platform: string): PreflightFailure | null {
  if (platform === 'win32') {
    return {
      code: 'E1002',
      exit: 78,
      message: 'Gaia v1 supports macOS and Linux only. Windows is not supported.',
      fix: 'Use WSL2 (Windows Subsystem for Linux). Native Windows support is tracked for v1.1.',
      docsUrl: DOCS_BASE,
    }
  }
  return null
}

export function checkTargetDir(targetDir: string, force: boolean): PreflightFailure | null {
  if (existsSync(targetDir) && !force) {
    return {
      code: 'E1003',
      exit: 78,
      message: `Directory ${targetDir} already exists.`,
      fix: 'Pick a different name, or pass --force to overwrite (refuses if --force without --yes).',
      docsUrl: DOCS_BASE,
    }
  }
  return null
}

export function checkWritePermission(targetDir: string): PreflightFailure | null {
  // Walk up to the first existing parent directory.
  let probe = targetDir
  while (!existsSync(probe)) {
    const parent = join(probe, '..')
    if (parent === probe) break
    probe = parent
  }
  if (!existsSync(probe)) {
    return {
      code: 'E1004',
      exit: 78,
      message: `No writable parent directory found for ${targetDir}.`,
      fix: 'Run from a directory you own (e.g. ~/code/), not /tmp or a system path.',
      docsUrl: DOCS_BASE,
    }
  }
  // Actually attempt a write to detect read-only mounts (Docker volumes,
  // macOS Locked folders, EROFS) — #33 / RT-20. Sentinel file is removed
  // immediately on success.
  const sentinel = join(probe, `.gaia-preflight-${process.pid}-${Date.now()}`)
  try {
    writeFileSync(sentinel, '')
    unlinkSync(sentinel)
    return null
  } catch (cause) {
    const errno = (cause as NodeJS.ErrnoException).code ?? 'EUNKNOWN'
    return {
      code: 'E1004',
      exit: 78,
      message: `${probe} is not writable (${errno}).`,
      fix:
        errno === 'EROFS'
          ? 'Read-only filesystem detected — run from a writable mount (e.g. ~/code/).'
          : 'Run from a directory you own and have write permission to.',
      docsUrl: DOCS_BASE,
    }
  }
}

/**
 * Run all preflight checks. Returns the first failure (fail-fast) or null on success.
 * Order matters: bun → platform → dir-exists → write-permission. Each is cheap.
 */
export function preflight(input: PreflightInput): PreflightFailure | null {
  return (
    checkBunVersion(input.bunVersion) ??
    checkPlatform(input.platform) ??
    checkTargetDir(input.targetDir, input.force) ??
    checkWritePermission(input.targetDir)
  )
}

export function formatFailure(f: PreflightFailure): string {
  return [`[${f.code}] ${f.message}`, `  fix:  ${f.fix}`, `  docs: ${f.docsUrl}`, ''].join('\n')
}
