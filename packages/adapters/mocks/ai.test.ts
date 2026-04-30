import { describe, expect, it } from 'bun:test'
import { completeMock } from './ai'

describe('completeMock', () => {
  it('returns a non-empty placeholder string', async () => {
    const reply = await completeMock('any prompt')
    expect(typeof reply).toBe('string')
    expect(reply.length).toBeGreaterThan(0)
  })

  it('rotates through the placeholder pool deterministically across calls', async () => {
    const a = await completeMock('first')
    const b = await completeMock('second')
    // Different cursor positions yield different replies in a 5-string pool.
    // Two consecutive calls cannot both land on the same string.
    expect(a).not.toBe(b)
  })

  it('hints at the live-mode fix in at least one response', async () => {
    // Sweep more than one pool length so we definitely hit the
    // "VENDOR_MODE=live" hint without depending on cursor state.
    const replies = await Promise.all(Array.from({ length: 6 }, () => completeMock('p')))
    expect(replies.some((r) => r.includes('VENDOR_MODE') || r.includes('bun gaia live'))).toBe(true)
  })
})
