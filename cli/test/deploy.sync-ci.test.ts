import { describe, expect, it } from 'bun:test'

import { syncToGitHub } from '../src/deploy/sync-ci.ts'

describe('syncToGitHub', () => {
  it('runs `gh secret set NAME` for each non-empty value', async () => {
    const calls: { cmd: string; args: readonly string[]; stdin: string }[] = []
    const result = await syncToGitHub({
      envVarNames: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY'],
      envValues: { POLAR_ACCESS_TOKEN: 'polar_test_xxx', RESEND_API_KEY: 're_test_xxx' },
      runCommand: (cmd, args, stdin) => {
        calls.push({ cmd, args, stdin })
        return Promise.resolve({ exitCode: 0, stderr: '' })
      },
    })
    expect(result.ok).toBe(true)
    expect(result.synced).toEqual(['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY'])
    expect(calls).toHaveLength(2)
    expect(calls[0]?.cmd).toBe('gh')
    // `--body -` is required so gh reads the secret from stdin (RT-11).
    expect(calls[0]?.args).toEqual(['secret', 'set', 'POLAR_ACCESS_TOKEN', '--body', '-'])
    expect(calls[0]?.stdin).toBe('polar_test_xxx')
  })

  it('skips empty values (does not write empty secrets)', async () => {
    const calls: unknown[] = []
    const result = await syncToGitHub({
      envVarNames: ['POLAR_ACCESS_TOKEN'],
      envValues: { POLAR_ACCESS_TOKEN: '' },
      runCommand: (cmd, args, stdin) => {
        calls.push({ cmd, args, stdin })
        return Promise.resolve({ exitCode: 0, stderr: '' })
      },
    })
    expect(calls).toHaveLength(0)
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.name).toBe('POLAR_ACCESS_TOKEN')
    expect(result.errors[0]?.message).toContain('empty')
  })

  it('reports gh failures per-name', async () => {
    const result = await syncToGitHub({
      envVarNames: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY'],
      envValues: { POLAR_ACCESS_TOKEN: 'ok', RESEND_API_KEY: 'fail' },
      runCommand: (_cmd, args) => {
        // The secret name is at args[2]; --body - follows after.
        const secretName = args[2]
        return Promise.resolve({
          exitCode: secretName === 'RESEND_API_KEY' ? 1 : 0,
          stderr: secretName === 'RESEND_API_KEY' ? 'no permission to set secret' : '',
        })
      },
    })
    expect(result.synced).toEqual(['POLAR_ACCESS_TOKEN'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.name).toBe('RESEND_API_KEY')
  })
})
