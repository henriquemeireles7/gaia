import { afterEach, describe, expect, it, mock } from 'bun:test'

// Mock the Anthropic SDK before importing the module under test
const mockCreate = mock(() =>
  Promise.resolve({
    content: [{ type: 'text', text: '  Hello from AI  ' }],
  }),
)

mock.module('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

// Must import AFTER mock.module
const { complete } = await import('./ai')

afterEach(() => {
  mockCreate.mockClear()
})

describe('complete', () => {
  it('returns trimmed text from AI response', async () => {
    const result = await complete('Say hello')
    expect(result).toBe('Hello from AI')
  })

  it('calls Anthropic with correct defaults', async () => {
    await complete('Test prompt')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const call = (mockCreate.mock.calls[0] as unknown[])[0] as {
      model: string
      max_tokens: number
      messages: Array<{ role: string; content: string }>
    }
    expect(call.model).toBe('claude-haiku-4-5-20251001')
    expect(call.max_tokens).toBe(300)
    expect(call.messages).toEqual([{ role: 'user', content: 'Test prompt' }])
  })

  it('respects custom model and maxTokens options', async () => {
    await complete('Test', { model: 'claude-sonnet-4-20250514', maxTokens: 1000 })
    const call = (mockCreate.mock.calls[0] as unknown[])[0] as { model: string; max_tokens: number }
    expect(call.model).toBe('claude-sonnet-4-20250514')
    expect(call.max_tokens).toBe(1000)
  })

  it('returns empty string when response has no text block', async () => {
    mockCreate.mockImplementationOnce(() =>
      Promise.resolve({
        content: [{ type: 'image', source: {} } as unknown as { type: string; text: string }],
      }),
    )
    const result = await complete('Generate image')
    expect(result).toBe('')
  })

  it('returns empty string when response content is empty', async () => {
    mockCreate.mockImplementationOnce(() => Promise.resolve({ content: [] }))
    const result = await complete('Empty response')
    expect(result).toBe('')
  })

  it('times out after the specified duration', async () => {
    mockCreate.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 5000)))
    await expect(complete('Slow prompt', { timeoutMs: 50 })).rejects.toThrow(
      'AI completion timeout',
    )
  })

  it('uses default timeout of 10s', async () => {
    // Verify a fast response still works (does not hit the 10s default)
    mockCreate.mockImplementationOnce(() =>
      Promise.resolve({ content: [{ type: 'text', text: 'fast' }] }),
    )
    const result = await complete('Fast prompt')
    expect(result).toBe('fast')
  })

  it('propagates SDK errors', async () => {
    mockCreate.mockImplementationOnce(() => Promise.reject(new Error('API rate limit')))
    await expect(complete('Rate limited')).rejects.toThrow('API rate limit')
  })
})
