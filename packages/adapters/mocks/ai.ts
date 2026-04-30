// packages/adapters/mocks/ai.ts — VENDOR_MODE=mock AI completion.
//
// Returns rotating placeholder strings so the user can wire the AI surface
// (chat UI, prompt templates, response rendering) without an Anthropic key
// or any actual model spend.
//
// The strings hint at WHY the response is short + how to switch on the
// real model — discoverable, not silent.

const PLACEHOLDER_RESPONSES = [
  'This is a mock response. Set VENDOR_MODE=live and ANTHROPIC_API_KEY in .env.local to talk to the real model.',
  "I'd answer that thoughtfully if my real key were wired. Run `bun gaia live` and I'll get smarter.",
  'Mock-mode reply. The shape works; the words are placeholders. Replace me by going live.',
  'Pretend this is brilliant. The real Claude is two env vars away.',
  'Hello from the in-process AI mock. Your prompt was received; my answer is canned.',
] as const

let cursor = 0

/**
 * Rotates through the placeholder pool deterministically (no Math.random),
 * so test snapshots are stable. Doesn't track tokens, latency, or cost —
 * those concepts only apply when real Anthropic is wired.
 */
export async function completeMock(_prompt: string, _options?: unknown): Promise<string> {
  const reply = PLACEHOLDER_RESPONSES[cursor % PLACEHOLDER_RESPONSES.length] as string
  cursor++
  return reply
}
