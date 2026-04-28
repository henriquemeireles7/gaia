import AnthropicSDK from '@anthropic-ai/sdk'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { env } from '@gaia/config'

export const ai = new AnthropicSDK({ apiKey: env.ANTHROPIC_API_KEY })

const DEFAULT_TIMEOUT_MS = 10_000
const tracer = trace.getTracer('@gaia/adapters/ai')

// Per-million-token pricing in USD. Update when models change.
const PRICING: Record<string, { in: number; out: number; cacheRead: number }> = {
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0, cacheRead: 0.1 },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0, cacheRead: 0.3 },
  'claude-opus-4-7': { in: 15.0, out: 75.0, cacheRead: 1.5 },
}

function estimateCost(
  model: string,
  inTokens: number,
  outTokens: number,
  cacheTokens: number,
): number {
  const p = PRICING[model] ?? { in: 1.0, out: 5.0, cacheRead: 0.1 }
  return (inTokens * p.in + outTokens * p.out + cacheTokens * p.cacheRead) / 1_000_000
}

/**
 * Generic AI completion with timeout, OpenTelemetry spans, and cost
 * tracking. Every call emits a span with the tags required by
 * observability/ai-trace-tags: model, tokens, latency, cost,
 * tool_use_count, error_class.
 */
export async function complete(
  prompt: string,
  options?: { model?: string; maxTokens?: number; timeoutMs?: number },
): Promise<string> {
  const model = options?.model ?? 'claude-haiku-4-5-20251001'
  const maxTokens = options?.maxTokens ?? 300
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const span = tracer.startSpan('ai.complete', { attributes: { model } })
  const start = Date.now()

  try {
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

    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }
    const inputTokens = usage.input_tokens ?? 0
    const outputTokens = usage.output_tokens ?? 0
    const cacheTokens = (usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0
    const tool_use_count = response.content.filter((b) => b.type === 'tool_use').length

    span.setAttribute('tokens.in', inputTokens)
    span.setAttribute('tokens.out', outputTokens)
    span.setAttribute('tokens.cache', cacheTokens)
    span.setAttribute('latency_ms', Date.now() - start)
    span.setAttribute('cost_usd', estimateCost(model, inputTokens, outputTokens, cacheTokens))
    span.setAttribute('tool_use_count', tool_use_count)

    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  } catch (err) {
    const error_class = err instanceof Error ? err.constructor.name : 'Unknown'
    span.setAttribute('error_class', error_class)
    span.setAttribute('latency_ms', Date.now() - start)
    span.recordException(err as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw err
  } finally {
    span.end()
  }
}
