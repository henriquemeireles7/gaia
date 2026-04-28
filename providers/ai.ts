import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/platform/env'

export const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Generic AI completion with timeout and fallback.
 * CUSTOMIZE: Add your own AI helper functions.
 */
export async function complete(
  prompt: string,
  options?: { model?: string; maxTokens?: number; timeoutMs?: number },
): Promise<string> {
  const model = options?.model ?? 'claude-haiku-4-5-20251001'
  const maxTokens = options?.maxTokens ?? 300
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const response = await Promise.race([
    ai.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI completion timeout')), timeoutMs),
    ),
  ])

  return response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
}
